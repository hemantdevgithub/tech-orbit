import { prisma } from "../lib/prisma.js";
import type { AuthContext, SystemContext } from "@techorbit/auth-middleware";
import type { Session } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────────────────────────────

type SessionWithUser = Session & {
  user: {
    id: string;
    email: string;
    status: string;
  } | null;
};

type CreateSessionInput = {
  userId: string;
  refreshTokenHash: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: Date;
};

type RotateSessionInput = {
  sessionId: string;
  userId: string;
  newRefreshTokenHash: string;
  newExpiresAt: Date;
};

// ─── Repository ──────────────────────────────────────────────────────────────

export interface SessionRepository {
  create(ctx: AuthContext | SystemContext, data: CreateSessionInput): Promise<Session>;
  findByRefreshTokenHash(ctx: AuthContext | SystemContext, hash: string): Promise<SessionWithUser | null>;
  findActiveForUser(ctx: AuthContext | SystemContext, userId: string): Promise<Session[]>;
  rotate(ctx: AuthContext | SystemContext, data: RotateSessionInput): Promise<Session>;
  revokeById(ctx: AuthContext | SystemContext, sessionId: string, reason: string): Promise<Session>;
  revokeAllForUser(ctx: AuthContext | SystemContext, userId: string, reason: string): Promise<number>;
  findById(ctx: AuthContext | SystemContext, sessionId: string): Promise<Session | null>;
}

function isSystemContext(ctx: AuthContext | SystemContext): ctx is SystemContext {
  return ctx.type === "system";
}

function checkAccess(ctx: AuthContext | SystemContext, userId: string): void {
  if (isSystemContext(ctx)) return;
  if (ctx.userId !== userId) {
    // Only the session owner or system can access
    throw new Error("Access denied");
  }
}

export const sessionRepository: SessionRepository = {
  async create(ctx, data) {
    // Only system context should create sessions directly
    if (!isSystemContext(ctx)) {
      throw new Error("Only system context can create sessions");
    }
    return prisma.session.create({ data });
  },

  async findByRefreshTokenHash(ctx, hash) {
    const session = await prisma.session.findUnique({
      where: { refreshTokenHash: hash },
      include: {
        user: { select: { id: true, email: true, status: true } },
      },
    });

    // Reject expired sessions; return revoked sessions so the service layer
    // can detect ROTATED-token replay and revoke all sessions for the user.
    if (session && session.expiresAt < new Date()) return null;

    return session;
  },

  async findActiveForUser(ctx, userId) {
    if (!isSystemContext(ctx) && ctx.userId !== userId) return [];
    return prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: "desc" },
    });
  },

  async rotate(ctx, data) {
    // Atomic rotation: revoke old + create new in transaction
    const result = await prisma.$transaction(async (tx) => {
      const old = await tx.session.findUnique({ where: { id: data.sessionId } });
      if (!old || old.userId !== data.userId) {
        throw new Error("Invalid session");
      }

      await tx.session.update({
        where: { id: data.sessionId },
        data: { revokedAt: new Date(), revokedReason: "ROTATED" },
      });

      const created = await tx.session.create({
        data: {
          userId: data.userId,
          refreshTokenHash: data.newRefreshTokenHash,
          userAgent: old.userAgent,
          ipAddress: old.ipAddress,
          expiresAt: data.newExpiresAt,
        },
      });

      return created;
    });

    return result;
  },

  async revokeById(ctx, sessionId, reason) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error("Session not found");

    checkAccess(ctx, session.userId);

    return prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  },

  async revokeAllForUser(ctx, userId, reason) {
    checkAccess(ctx, userId);

    const result = await prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    return result.count;
  },

  async findById(ctx, sessionId) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (session && !isSystemContext(ctx) && ctx.userId !== session.userId) {
      return null;
    }
    return session;
  },
};
