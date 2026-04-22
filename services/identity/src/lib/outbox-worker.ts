import type { SystemContext } from "@techorbit/auth-middleware";
import { createEventBus } from "@techorbit/event-bus";
import { outboxRepository } from "../repositories/index.js";

// ─── Outbox Worker ────────────────────────────────────────────────────────────
// Polls the outbox table and publishes pending events to RabbitMQ.
// Runs as a background job (could use BullMQ or a simple setInterval).

const systemCtx: SystemContext = { type: "system" };

let isRunning = false;
let pollInterval: ReturnType<typeof setInterval> | null = null;
const POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_BATCH_SIZE = 100;

export async function startOutboxWorker(rabbitMqUrl: string): Promise<void> {
  if (isRunning) return;

  isRunning = true;

  const eventBus = createEventBus(
    {
      url: rabbitMqUrl,
      exchange: "techorbit.events",
    },
    "identity-svc"
  );

  await eventBus.connect();

  pollInterval = setInterval(async () => {
    await processOutbox(eventBus);
  }, POLL_INTERVAL_MS);

  // Process immediately on start
  await processOutbox(eventBus);
}

export function stopOutboxWorker(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  isRunning = false;
}

async function processOutbox(eventBus: ReturnType<typeof createEventBus>): Promise<void> {
  const pendingEvents = await outboxRepository.fetchPending(systemCtx, MAX_BATCH_SIZE);

  for (const event of pendingEvents) {
    try {
      // Parse the payload (it's stored as JSON string)
      const payload = typeof event.payload === "string"
        ? JSON.parse(event.payload as string)
        : event.payload;

      // Publish to RabbitMQ
      await eventBus.publish(event.type, payload as Record<string, unknown>, {
        correlationId: event.correlationId ?? undefined,
      });

      // Mark as published
      await outboxRepository.markPublished(systemCtx, event.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await outboxRepository.markFailed(systemCtx, event.id, errorMessage);

      // If max retries exceeded, could move to dead-letter queue
      // For now, just leave in FAILED state for manual review
    }
  }
}
