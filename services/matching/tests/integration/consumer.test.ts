import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import type { EventEnvelope } from "@techorbit/event-bus";
import {
  buildCandidate,
  buildRequirement,
  closeServer,
  getPrisma,
  getServer,
  resetDb,
  runIntegrationSuite,
  stubCrossServiceFetch,
} from "./helpers.js";

const REQUIREMENT = "aaaaaaaa-3333-3333-3333-333333333333";
const CANDIDATE_A = "11111111-1111-1111-1111-111111111111";
const CANDIDATE_B = "22222222-2222-2222-2222-222222222222";
const CUSTOMER = "99999999-9999-9999-9999-999999999999";

function buildEnvelope(requirementId: string, eventId?: string): EventEnvelope {
  return {
    id: eventId ?? "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    type: "requirement.published.v1",
    version: "1",
    timestamp: new Date().toISOString(),
    source: "requirement",
    payload: {
      requirementId,
      customerCompanyId: "cccccccc-9999-9999-9999-999999999999",
      attributedCrmId: null,
      techStack: ["Java", "AWS"],
      seniority: "SENIOR",
      locationType: "REMOTE",
      publishedAt: new Date().toISOString(),
    },
  };
}

runIntegrationSuite("requirement.published.v1 consumer", () => {
  beforeAll(getServer);
  afterAll(closeServer);
  beforeEach(async () => {
    await resetDb();
    vi.restoreAllMocks();
  });

  it("processing an event computes and upserts MatchingSignal rows", async () => {
    stubCrossServiceFetch({
      candidates: [
        buildCandidate({ userId: CANDIDATE_A, skills: ["Java", "AWS"] }),
        buildCandidate({ userId: CANDIDATE_B, skills: ["PHP"], preferRemote: false }),
      ],
      requirements: [
        buildRequirement({
          id: REQUIREMENT,
          createdByUserId: CUSTOMER,
          techStack: ["Java", "AWS"],
        }),
      ],
    });

    const { createHandler } = await import("../../src/consumers/requirement-published.consumer.js");
    const { createServiceTokenSigner } = await import("../../src/lib/service-token.js");
    const { createProfileApi } = await import("../../src/lib/profile-api.js");
    const { createRequirementApi } = await import("../../src/lib/requirement-api.js");

    const signer = createServiceTokenSigner(
      process.env.JWT_PRIVATE_KEY!,
      "matching-test",
    );
    const profileApi = createProfileApi(
      process.env.PROFILE_SVC_URL ?? "http://profile-svc.test",
      signer,
    );
    const requirementApi = createRequirementApi(
      process.env.REQUIREMENT_SVC_URL ?? "http://requirement-svc.test",
      signer,
    );

    const handler = createHandler({
      profileApi,
      requirementApi,
      logger: { info: () => undefined, error: () => undefined },
    });

    await handler(buildEnvelope(REQUIREMENT));

    const signals = await getPrisma().matchingSignal.findMany({
      where: { requirementId: REQUIREMENT },
      orderBy: { matchScore: "desc" },
    });
    expect(signals).toHaveLength(2);
    // Candidate A matches skills + location + workAuth + rating → high
    // Candidate B matches nothing (different skills, no remote) → low
    expect(signals[0]?.candidateId).toBe(CANDIDATE_A);
    expect(signals[0]?.matchScore).toBeGreaterThan(signals[1]?.matchScore ?? 0);
  });

  it("a redelivery of the same eventId is ignored (idempotency)", async () => {
    stubCrossServiceFetch({
      candidates: [buildCandidate({ userId: CANDIDATE_A })],
      requirements: [buildRequirement({ id: REQUIREMENT, createdByUserId: CUSTOMER })],
    });

    const { createHandler } = await import("../../src/consumers/requirement-published.consumer.js");
    const { createServiceTokenSigner } = await import("../../src/lib/service-token.js");
    const { createProfileApi } = await import("../../src/lib/profile-api.js");
    const { createRequirementApi } = await import("../../src/lib/requirement-api.js");

    const signer = createServiceTokenSigner(process.env.JWT_PRIVATE_KEY!, "matching-test");
    const profileApi = createProfileApi(process.env.PROFILE_SVC_URL!, signer);
    const requirementApi = createRequirementApi(process.env.REQUIREMENT_SVC_URL!, signer);

    const handler = createHandler({
      profileApi,
      requirementApi,
      logger: { info: () => undefined, error: () => undefined },
    });

    const eventId = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    await handler(buildEnvelope(REQUIREMENT, eventId));
    await handler(buildEnvelope(REQUIREMENT, eventId)); // redelivery

    const processed = await getPrisma().processedEvent.findMany({ where: { eventId } });
    expect(processed).toHaveLength(1);
  });
});
