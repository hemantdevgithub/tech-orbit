import type { Prisma, RequirementCrmOwner } from "../generated/client/index.js";
import { prisma } from "../lib/prisma.js";

// Sprint 12 — multi-CRM co-ownership of a requirement.
//
// Several CRMs can accept the same job; first to accept is primary. Commission
// share defaults to 1/N equally and is recomputed on every accept / release.
// The placement-svc commission calculator reads this column at placement time.
export const crmOwnershipRepository = {
  async findByRequirement(
    requirementId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<RequirementCrmOwner[]> {
    const db = tx ?? prisma;
    return db.requirementCrmOwner.findMany({
      where: { requirementId },
      orderBy: { acceptedAt: "asc" },
    });
  },

  async findByCrm(
    crmUserId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<RequirementCrmOwner[]> {
    const db = tx ?? prisma;
    return db.requirementCrmOwner.findMany({
      where: { crmUserId },
      orderBy: { acceptedAt: "desc" },
    });
  },

  async accept(
    requirementId: string,
    crmUserId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ owner: RequirementCrmOwner; coOwnerCount: number }> {
    const db = tx ?? prisma;
    const existing = await db.requirementCrmOwner.findMany({
      where: { requirementId },
    });

    // Idempotent — if this CRM already owns it, return the existing record.
    const mine = existing.find((o) => o.crmUserId === crmUserId);
    if (mine) {
      return { owner: mine, coOwnerCount: existing.length };
    }

    const isPrimary = existing.length === 0;
    const newCount = existing.length + 1;
    const share = roundShare(1 / newCount);

    // Create new owner + recompute every co-owner's share to 1/N.
    const [created] = await Promise.all([
      db.requirementCrmOwner.create({
        data: {
          requirementId,
          crmUserId,
          isPrimary,
          commissionShare: share,
        },
      }),
      ...existing.map((o) =>
        db.requirementCrmOwner.update({
          where: { id: o.id },
          data: { commissionShare: share },
        }),
      ),
    ]);

    return { owner: created, coOwnerCount: newCount };
  },

  async release(
    requirementId: string,
    crmUserId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ remainingCount: number }> {
    const db = tx ?? prisma;
    const all = await db.requirementCrmOwner.findMany({
      where: { requirementId },
      orderBy: { acceptedAt: "asc" },
    });
    const leaving = all.find((o) => o.crmUserId === crmUserId);
    if (!leaving) return { remainingCount: all.length };

    const remaining = all.filter((o) => o.id !== leaving.id);
    const newCount = remaining.length;
    const share = newCount > 0 ? roundShare(1 / newCount) : 0;

    await db.requirementCrmOwner.delete({ where: { id: leaving.id } });

    // If primary left, promote the oldest remaining co-owner.
    if (leaving.isPrimary && remaining[0]) {
      await db.requirementCrmOwner.update({
        where: { id: remaining[0].id },
        data: { isPrimary: true, commissionShare: share },
      });
      // Update everyone else's share too.
      await Promise.all(
        remaining.slice(1).map((o) =>
          db.requirementCrmOwner.update({
            where: { id: o.id },
            data: { commissionShare: share },
          }),
        ),
      );
    } else {
      // Just recompute shares.
      await Promise.all(
        remaining.map((o) =>
          db.requirementCrmOwner.update({
            where: { id: o.id },
            data: { commissionShare: share },
          }),
        ),
      );
    }

    return { remainingCount: newCount };
  },

  async isOwner(
    requirementId: string,
    crmUserId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const db = tx ?? prisma;
    const row = await db.requirementCrmOwner.findUnique({
      where: { requirementId_crmUserId: { requirementId, crmUserId } },
    });
    return row !== null;
  },
};

// Round to 4 decimal places — matches the Decimal(5,4) column.
function roundShare(n: number): number {
  return Math.round(n * 10000) / 10000;
}
