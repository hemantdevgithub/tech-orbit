import type { EventBus } from "@techorbit/event-bus";
import { prisma } from "./prisma.js";

const POLL_INTERVAL_MS = 5_000;
const MAX_BATCH_SIZE = 100;
const MAX_ATTEMPTS = 10;

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let inFlight = false;

export function startOutboxWorker(eventBus: EventBus): void {
  if (intervalHandle !== null) return;
  const tick = async () => {
    if (inFlight) return;
    inFlight = true;
    try { await processBatch(eventBus); } finally { inFlight = false; }
  };
  void tick();
  intervalHandle = setInterval(tick, POLL_INTERVAL_MS);
}

export function stopOutboxWorker(): void {
  if (intervalHandle !== null) { clearInterval(intervalHandle); intervalHandle = null; }
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
      await eventBus.publish(row.eventType, envelope.payload ?? {}, { correlationId: row.id });
      await prisma.outgoingEvent.update({ where: { id: row.id }, data: { status: "SENT", sentAt: new Date() } });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const next = row.attempts + 1;
      await prisma.outgoingEvent.update({
        where: { id: row.id },
        data: { attempts: next, lastError: message.slice(0, 500), status: next >= MAX_ATTEMPTS ? "FAILED" : "PENDING" },
      });
    }
  }
}
