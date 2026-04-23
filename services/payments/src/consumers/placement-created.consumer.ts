import type { EventBus, EventEnvelope } from "@techorbit/event-bus";
import { PlacementCreatedEventSchema } from "@techorbit/types";
import { prisma } from "../lib/prisma.js";
import type { InvoiceGeneratorService } from "../services/invoice-generator.service.js";

type Deps = {
  invoiceGeneratorService: InvoiceGeneratorService;
  logger: { info: (o: unknown, m?: string) => void; error: (o: unknown, m?: string) => void };
};

// Subscribes to placement.created.v1 and generates the one-time
// INTERVIEWER_FEES invoice for interviewer flat-fee payouts.  Uses a
// ProcessedEvent row for idempotency.
export async function registerPlacementCreatedConsumer(
  eventBus: EventBus,
  deps: Deps,
): Promise<void> {
  await eventBus.subscribe(
    "placement.created.v1",
    createHandler(deps),
    { queue: "payments.placement-created" },
  );
}

export function createHandler(deps: Deps) {
  return async function handle(envelope: EventEnvelope): Promise<void> {
    const { logger, invoiceGeneratorService } = deps;
    const parsed = PlacementCreatedEventSchema.safeParse({
      eventId: envelope.id,
      occurredAt: envelope.timestamp,
      version: 1,
      type: envelope.type,
      payload: envelope.payload,
    });
    if (!parsed.success) {
      logger.error(
        { type: envelope.type, issues: parsed.error.issues },
        "placement.created.v1: invalid payload",
      );
      return;
    }

    const { eventId } = parsed.data;
    const { placementId } = parsed.data.payload;

    try {
      await prisma.processedEvent.create({
        data: { eventId, eventType: parsed.data.type },
      });
    } catch {
      logger.info({ eventId, placementId }, "already processed; skipping");
      return;
    }

    const result = await invoiceGeneratorService.generateInterviewerFeesInvoice(placementId);
    logger.info(
      { placementId, created: result.created, invoiceId: result.invoiceId, totalUsd: result.totalUsd },
      "Interviewer-fees invoice generation complete",
    );
  };
}
