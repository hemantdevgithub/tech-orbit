import { randomUUID } from "node:crypto";
import type { Prisma } from "../generated/client/index.js";

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
