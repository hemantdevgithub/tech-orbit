import { prisma } from "../lib/prisma.js";
import type { AuthContext, SystemContext } from "@techorbit/auth-middleware";

type PasswordResetRequestWithUser = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  user: { id: string; email: string } | null;
};

type CreateResetRequestInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export interface PasswordResetRepository {
  create(ctx: AuthContext | SystemContext, data: CreateResetRequestInput): Promise<PasswordResetRequestWithUser>;
  consumeByToken(ctx: AuthContext | SystemContext, tokenHash: string): Promise<PasswordResetRequestWithUser | null>;
  invalidateAllForUser(ctx: AuthContext | SystemContext, userId: string): Promise<number>;
}

function isSystemContext(ctx: AuthContext | SystemContext): ctx is SystemContext {
  return ctx.type === "system";
}

export const passwordResetRepository: PasswordResetRepository = {
  async create(ctx, data) {
    if (!isSystemContext(ctx)) {
      throw new Error("Only system context can create password reset requests");
    }

    // Invalidate any existing pending resets for this user
    await prisma.passwordResetRequest.updateMany({
      where: {
        userId: data.userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    return prisma.passwordResetRequest.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
      include: { user: { select: { id: true, email: true } } },
    });
  },

  async consumeByToken(ctx, tokenHash) {
    if (!isSystemContext(ctx)) {
      throw new Error("Only system context can consume password reset tokens");
    }

    const result = await prisma.passwordResetRequest.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!result) return null;
    if (result.usedAt !== null) return null;
    if (result.expiresAt < new Date()) return null;

    return prisma.passwordResetRequest.update({
      where: { id: result.id },
      data: { usedAt: new Date() },
      include: { user: { select: { id: true, email: true } } },
    });
  },

  async invalidateAllForUser(ctx, userId) {
    if (!isSystemContext(ctx)) {
      throw new Error("Only system context can invalidate resets");
    }

    const result = await prisma.passwordResetRequest.updateMany({
      where: {
        userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    return result.count;
  },
};