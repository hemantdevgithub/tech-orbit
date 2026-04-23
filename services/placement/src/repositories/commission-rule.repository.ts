import type { CommissionRule } from "../generated/client/index.js";
import { prisma } from "../lib/prisma.js";

// Rules are immutable once created.  Repository is read-only (creation
// happens inside the placement transaction in placement.repository.ts).

export const commissionRuleRepository = {
  async findByPlacement(placementId: string): Promise<CommissionRule[]> {
    return prisma.commissionRule.findMany({
      where: { placementId },
      orderBy: { createdAt: "asc" },
    });
  },

  async findByBeneficiary(
    userId: string,
    limit = 50,
  ): Promise<CommissionRule[]> {
    return prisma.commissionRule.findMany({
      where: { beneficiaryUserId: userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
};
