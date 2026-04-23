import type { EventBus } from "@techorbit/event-bus";
import { prisma } from "./prisma.js";

// Transactional outbox relay — identical pattern to requirement-svc.
// See services/requirement/src/lib/outbox-worker.ts for commentary.

const POLL_INTERVAL_MS = 5_000;
const MAX_BATCH_SIZE = 100;
const MAX_ATTEMPTS = 10;

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let inFlight = false;

export function startOutboxWorker(eventBus: EventBus): void {
  if (intervalHandle !== null) return;

  const tick = async (): Promise<void> => {
    if (inFlight) return;
    inFlight = true;
    try {
      await processBatch(eventBus);
    } finally {
      inFlight = false;
    }
  };

  void tick();
  intervalHandle = setInterval(tick, POLL_INTERVAL_MS);
}

export function stopOutboxWorker(): void {
  if (intervalHandle !== null) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

async function processBatch(eventBus: EventBus): Promise<void> {
  const pending = await prisma.outgoingEvent.findMany({
    where: { status: "PENDING", attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    take: MAX_BATCH_SIZE,
  });

  for (const row of pending) {
    try {
      const envelope = row.payload as { payload?: Record<string, unknown> };
      const innerPayload = envelope.payload ?? {};
      await eventBus.publish(row.eventType, innerPayload, {
        correlationId: row.id,
      });
      await prisma.outgoingEvent.update({
        where: { id: row.id },
        data: { status: "SENT", sentAt: new Date() },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const nextAttempts = row.attempts + 1;
      await prisma.outgoingEvent.update({
        where: { id: row.id },
        data: {
          attempts: nextAttempts,
          lastError: message.slice(0, 500),
          status: nextAttempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
        },
      });
    }
  }
}
