import { randomUUID } from "node:crypto";
import type { Prisma } from "../generated/client/index.js";
import { prisma } from "./prisma.js";

// Event envelope matches packages/types EventEnvelopeSchema used by
// profile-svc / requirement-svc. The relay worker consumes these rows
// and publishes them to RabbitMQ (Task 6).
export type OutgoingEventEnvelope = {
  eventId: string;
  type: string;
  version: 1;
  occurredAt: string;
  payload: Record<string, unknown>;
};

export function buildEvent(
  type: string,
  payload: Record<string, unknown>,
): OutgoingEventEnvelope {
  return {
    eventId: randomUUID(),
    type,
    version: 1,
    occurredAt: new Date().toISOString(),
    payload,
  };
}

// Insert a row into outgoing_event. Caller passes a transaction client so
// the event is atomic with the state change that triggered it.
export async function enqueueEvent(
  tx: Prisma.TransactionClient,
  event: OutgoingEventEnvelope,
  aggregateId: string,
): Promise<void> {
  await tx.outgoingEvent.create({
    data: {
      id: event.eventId,
      eventType: event.type,
      aggregateId,
      payload: event as unknown as Prisma.InputJsonValue,
      status: "PENDING",
      attempts: 0,
    },
  });
}
