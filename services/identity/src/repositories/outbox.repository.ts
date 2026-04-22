import { prisma } from "../lib/prisma.js";
import type { AuthContext, SystemContext } from "@techorbit/auth-middleware";
import type { OutgoingEventStatus } from "@prisma/client";

type CreateEventInput = {
  type: string;
  payload: Record<string, unknown>;
  correlationId?: string;
};

export interface OutboxRepository {
  enqueue(ctx: AuthContext | SystemContext, data: CreateEventInput): Promise<void>;
  markPublished(ctx: AuthContext | SystemContext, eventId: string): Promise<void>;
  markFailed(ctx: AuthContext | SystemContext, eventId: string, error: string): Promise<void>;
  fetchPending(ctx: AuthContext | SystemContext, limit?: number): Promise<Array<{
    id: string;
    type: string;
    payload: unknown;
    correlationId: string | null;
    retryCount: number;
  }>>;
}

function isSystemContext(ctx: AuthContext | SystemContext): ctx is SystemContext {
  return ctx.type === "system";
}

export const outboxRepository: OutboxRepository = {
  async enqueue(ctx, data) {
    if (!isSystemContext(ctx)) {
      throw new Error("Only system context can enqueue events");
    }

    await prisma.outgoingEvent.create({
      data: {
        type: data.type,
        payload: data.payload as object,
        correlationId: data.correlationId ?? null,
      },
    });
  },

  async markPublished(_ctx, eventId) {
    await prisma.outgoingEvent.update({
      where: { id: eventId },
      data: {
        status: "SENT" as OutgoingEventStatus,
        publishedAt: new Date(),
      },
    });
  },

  async markFailed(_ctx, eventId, error) {
    await prisma.outgoingEvent.update({
      where: { id: eventId },
      data: {
        retryCount: { increment: 1 },
        lastError: error.slice(0, 500), // Truncate error message
      },
    });
  },

  async fetchPending(_ctx, limit = 100) {
    return prisma.outgoingEvent.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: {
        id: true,
        type: true,
        payload: true,
        correlationId: true,
        retryCount: true,
      },
    });
  },
};