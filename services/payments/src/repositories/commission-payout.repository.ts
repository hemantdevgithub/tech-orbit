import type {
  CommissionPayout,
  PayoutStatus,
  Prisma,
} from "../generated/client/index.js";
import { prisma } from "../lib/prisma.js";
import type { AuthContext } from "@techorbit/auth-middleware";

export type CreatePayoutData = {
  invoiceId: string;
  placementId: string;
  commissionRuleId: string;
  beneficiaryUserId: string | null;
  beneficiaryMsmeId: string | null;
  slot: string;
  amountUsd: Prisma.Decimal | number;
};

export const commissionPayoutRepository = {
  async createMany(
    data: CreatePayoutData[],
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (data.length === 0) return;
    await tx.commissionPayout.createMany({
      data: data.map((d) => ({
        invoiceId: d.invoiceId,
        placementId: d.placementId,
        commissionRuleId: d.commissionRuleId,
        beneficiaryUserId: d.beneficiaryUserId,
        beneficiaryMsmeId: d.beneficiaryMsmeId,
        slot: d.slot,
        amountUsd: d.amountUsd as Prisma.Decimal | number,
        status: "PENDING",
      })),
    });
  },

  async findByInvoice(
    invoiceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CommissionPayout[]> {
    const db = tx ?? prisma;
    return db.commissionPayout.findMany({
      where: { invoiceId },
      orderBy: { createdAt: "asc" },
    });
  },

  async list(
    ctx: AuthContext,
    filters: {
      invoiceId?: string;
      placementId?: string;
      status?: PayoutStatus;
    },
    cursor: string | null,
    limit: number,
  ): Promise<{ data: CommissionPayout[]; nextCursor: string | null; hasMore: boolean }> {
    const where: Prisma.CommissionPayoutWhereInput = {};
    if (filters.invoiceId) where.invoiceId = filters.invoiceId;
    if (filters.placementId) where.placementId = filters.placementId;
    if (filters.status) where.status = filters.status;

    // Scope: caller sees their own payouts (as beneficiaryUserId) OR admin.
    // MSME payouts — since we don't have the MSME↔primaryUser lookup in this
    // service, we also let through any row where the caller is the msme's
    // primary user (set by the service layer when known).  For v1 the caller
    // provides their userId directly.
    if (!ctx.roles.includes("ADMIN")) {
      where.beneficiaryUserId = ctx.userId;
    }

    const rows = await prisma.commissionPayout.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    return {
      data,
      nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null,
      hasMore,
    };
  },

  async updateStatus(
    id: string,
    status: PayoutStatus,
    extra: Partial<
      Pick<
        CommissionPayout,
        "processedAt" | "stripeTransferId" | "gustoPayrollId" | "failureReason"
      >
    > = {},
    tx?: Prisma.TransactionClient,
  ): Promise<CommissionPayout> {
    const db = tx ?? prisma;
    return db.commissionPayout.update({
      where: { id },
      data: { status, ...extra },
    });
  },

  async findById(id: string): Promise<CommissionPayout | null> {
    return prisma.commissionPayout.findUnique({ where: { id } });
  },
};
