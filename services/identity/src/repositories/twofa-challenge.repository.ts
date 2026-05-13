import { prisma } from "../lib/prisma.js";
import type { AuthContext, SystemContext } from "@techorbit/auth-middleware";
import type { TwoFAKind } from "../generated/client/index.js";

type TwoFAChallengeWithUser = {
  id: string;
  userId: string;
  code: string;
  kind: TwoFAKind;
  usedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  user: { id: string; email: string; has2FA: boolean } | null;
};

type CreateChallengeInput = {
  userId: string;
  codeHash: string;
  kind?: TwoFAKind;
  expiresAt: Date;
};

export interface TwoFAChallengeRepository {
  create(ctx: AuthContext | SystemContext, data: CreateChallengeInput): Promise<TwoFAChallengeWithUser>;
  consumeByCode(ctx: AuthContext | SystemContext, userId: string, codeHash: string): Promise<TwoFAChallengeWithUser | null>;
  cleanupExpired(ctx: AuthContext | SystemContext): Promise<number>;
}

function isSystemContext(ctx: AuthContext | SystemContext): ctx is SystemContext {
  return ctx.type === "system";
}

export const twoFAChallengeRepository: TwoFAChallengeRepository = {
  async create(ctx, data) {
    if (!isSystemContext(ctx)) {
      throw new Error("Only system context can create 2FA challenges");
    }

    // Invalidate any existing pending challenges for this user
    await prisma.twoFAChallenge.updateMany({
      where: {
        userId: data.userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    return prisma.twoFAChallenge.create({
      data: {
        userId: data.userId,
        code: data.codeHash,
        kind: data.kind ?? "TOTP",
        expiresAt: data.expiresAt,
      },
      include: { user: { select: { id: true, email: true, has2FA: true } } },
    });
  },

  async consumeByCode(ctx, userId, codeHash) {
    if (!isSystemContext(ctx)) {
      throw new Error("Only system context can consume 2FA challenges");
    }

    // Use atomic find + update to prevent race conditions
    const result = await prisma.twoFAChallenge.findFirst({
      where: {
        userId,
        code: codeHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: { select: { id: true, email: true, has2FA: true } } },
    });

    if (!result) return null;

    // Mark as used
    return prisma.twoFAChallenge.update({
      where: { id: result.id },
      data: { usedAt: new Date() },
      include: { user: { select: { id: true, email: true, has2FA: true } } },
    });
  },

  async cleanupExpired(ctx) {
    if (!isSystemContext(ctx)) {
      throw new Error("Only system context can cleanup challenges");
    }

    const result = await prisma.twoFAChallenge.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  },
};