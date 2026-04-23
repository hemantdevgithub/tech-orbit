import type { EventBus } from "@techorbit/event-bus";
import { prisma } from "./prisma.js";

// The outbox relay: poll `outgoing_event` for PENDING rows, publish them
// to RabbitMQ, and flip the row to SENT on success or increment `attempts`
// + store `lastError` on failure.
//
// This is deliberately a simple polling loop rather than a LISTEN/NOTIFY
// trigger. At v1 scale (handful of writes per minute) a 5s poll is plenty;
// we can swap in logical replication or pg_notify later if it becomes the
// bottleneck.

const POLL_INTERVAL_MS = 5_000;
const MAX_BATCH_SIZE = 100;
const MAX_ATTEMPTS = 10; // after this, rows sit in FAILED awaiting manual intervention

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let inFlight = false;

export function startOutboxWorker(eventBus: EventBus): void {
  if (intervalHandle !== null) return;

  const tick = async (): Promise<void> => {
    if (inFlight) return; // avoid overlapping runs if a batch takes longer than the poll interval
    inFlight = true;
    try {
      await processBatch(eventBus);
    } finally {
      inFlight = false;
    }
  };

  // Kick one off immediately, then poll.
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
      // The stored payload is the full envelope we built in outbox.ts;
      // publish the inner payload so event-bus can wrap its own envelope
      // with the canonical headers.
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
          // Mark FAILED once we hit the cap so operators can spot poison rows.
          status: nextAttempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
        },
      });
    }
  }
}
