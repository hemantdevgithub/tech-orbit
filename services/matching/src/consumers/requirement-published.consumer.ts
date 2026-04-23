import type { EventBus, EventEnvelope } from "@techorbit/event-bus";
import { RequirementPublishedEventSchema } from "@techorbit/types";
import { prisma } from "../lib/prisma.js";
import type { ProfileApi } from "../lib/profile-api.js";
import type { RequirementApi } from "../lib/requirement-api.js";
import {
  computeMatchSignal,
  type MatchCandidateInput,
  type MatchRequirementInput,
} from "../services/matching-engine.js";
import { matchingSignalRepository } from "../repositories/matching-signal.repository.js";

type ConsumerDeps = {
  profileApi: ProfileApi;
  requirementApi: RequirementApi;
  logger: { info: (o: unknown, m?: string) => void; error: (o: unknown, m?: string) => void };
};

// Registers the requirement.published.v1 consumer.  On receipt:
// 1. Idempotency guard (processed_event)
// 2. Fetch the full requirement from requirement-svc (internal endpoint)
// 3. Page through complete candidate profiles from profile-svc
// 4. Compute a MatchingSignal for each and upsert
//
// The consumer itself is best-effort: if a downstream call fails the handler
// throws and the event-bus nacks — RabbitMQ will redeliver.  The
// ProcessedEvent row is written BEFORE the expensive work so retries skip
// candidates already scored if a redelivery happens after a partial run;
// this is acceptable because upsert() is idempotent.
export async function registerRequirementPublishedConsumer(
  eventBus: EventBus,
  deps: ConsumerDeps,
): Promise<void> {
  await eventBus.subscribe(
    "requirement.published.v1",
    createHandler(deps),
    { queue: "matching.requirement-published" },
  );
}

export function createHandler(deps: ConsumerDeps) {
  return async function handle(envelope: EventEnvelope): Promise<void> {
    const { profileApi, requirementApi, logger } = deps;

    // The event-bus envelope wraps our payload.  Adapt to the app-level
    // RequirementPublishedEvent schema: our publisher sends
    // { payload: <inner> } and event-bus adds its own headers.
    const parsed = RequirementPublishedEventSchema.safeParse({
      eventId: envelope.id,
      occurredAt: envelope.timestamp,
      version: 1,
      type: envelope.type,
      payload: envelope.payload,
    });

    if (!parsed.success) {
      logger.error(
        { type: envelope.type, issues: parsed.error.issues },
        "requirement.published.v1: invalid payload",
      );
      return;
    }

    const { eventId } = parsed.data;
    const { requirementId } = parsed.data.payload;

    // Idempotency guard — if we've seen this eventId, skip.
    try {
      await prisma.processedEvent.create({
        data: { eventId, eventType: parsed.data.type },
      });
    } catch {
      logger.info(
        { eventId, requirementId },
        "requirement.published.v1: already processed, skipping",
      );
      return;
    }

    const requirement = await requirementApi.getRequirement(requirementId);
    if (!requirement) {
      logger.error(
        { requirementId },
        "requirement.published.v1: requirement not found",
      );
      return;
    }

    const reqInput: MatchRequirementInput = {
      techStack: requirement.techStack,
      seniority: requirement.seniority,
      locationType: requirement.locationType,
      locationCity: requirement.locationCity,
      workAuthPrefs: requirement.workAuthPrefs as MatchRequirementInput["workAuthPrefs"],
    };

    let cursor: string | undefined;
    let processed = 0;
    while (true) {
      const page = await profileApi.listCompleteCandidates({ cursor, limit: 100 });
      for (const cand of page.data) {
        const candInput: MatchCandidateInput = {
          skills: cand.skills,
          seniority: cand.seniority as MatchCandidateInput["seniority"],
          location: cand.location,
          preferRemote: cand.preferRemote,
          preferHybrid: cand.preferHybrid,
          preferOnsite: cand.preferOnsite,
          workAuthStatus: cand.workAuthStatus,
          averageRating: cand.averageRating,
        };
        const signal = computeMatchSignal(reqInput, candInput);
        await matchingSignalRepository.upsert(requirementId, cand.userId, signal);
        processed += 1;
      }
      if (!page.hasMore || !page.nextCursor) break;
      cursor = page.nextCursor;
    }

    logger.info(
      { requirementId, processed },
      "requirement.published.v1: match precompute complete",
    );
  };
}
