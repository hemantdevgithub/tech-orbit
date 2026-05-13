import type {
  CommissionCalc,
  CommissionSlot,
  EngagementType,
  Placement,
  PlacementStatus,
  Prisma,
  ValueChain,
} from "../generated/client/index.js";
import type { Decimal } from "@prisma/client/runtime/library.js";
import { ForbiddenError, NotFoundError } from "@techorbit/errors";
import type { AuthContext } from "@techorbit/auth-middleware";
import { prisma } from "../lib/prisma.js";

export type CreatePlacementData = {
  requirementId: string;
  submissionId: string;
  candidateId: string;
  customerCompanyId: string;
  createdByUserId: string;
  engagementType: EngagementType;
  billRateUsd: Decimal | number;
  payRateUsd?: Decimal | number | null;
  startDate: Date;
  endDate: Date;
  contractDocumentId?: string | null;
  workOrderId?: string | null;
  rtrDocumentId?: string | null;
};

export type CreateValueChainData = {
  placementId: string;
  customerCompanyId: string;
  attributedCrmId: string | null;
  attributedSrmId: string | null;
  attributedMsmeId: string | null;
  candidateId: string;
  interviewerIds: string[];
};

export type CreateCommissionRuleData = {
  placementId: string;
  slot: CommissionSlot;
  beneficiaryUserId: string | null;
  beneficiaryMsmeId: string | null;
  calculation: CommissionCalc;
  percentOfBillRate?: Decimal | number | null;
  flatFeeUsd?: Decimal | number | null;
  interviewId?: string | null;
  notes?: string | null;
};

export type PlacementFilterInput = {
  customerCompanyId?: string;
  candidateId?: string;
  requirementId?: string;
  status?: PlacementStatus;
  attributedCrmId?: string;
  attributedSrmId?: string;
  attributedMsmeId?: string;
};

// Authz: the caller sees a placement if they are
//   - the creator (customer)
//   - the candidate
//   - the attributed CRM/SRM (via ValueChain lookup)
//   - a user of the attributed MSME (approximated in v1 as the primary user)
//   - an interviewer who was on the value chain
//   - admin
function assertCanReadPlacement(
  ctx: AuthContext,
  placement: Placement,
  valueChain: ValueChain | null,
): void {
  if (ctx.roles.includes("ADMIN")) return;

  if (
    ctx.userId === placement.createdByUserId ||
    ctx.userId === placement.candidateId
  ) return;

  if (valueChain) {
    const participants: (string | null)[] = [
      valueChain.attributedCrmId,
      valueChain.attributedSrmId,
      // MSME attribution uses an MSME id, not a user id.  The visibility
      // check for MSME users happens at the service layer by looking up
      // the MSME's primary userId from profile-svc.
      ...valueChain.interviewerIds,
    ];
    if (participants.includes(ctx.userId)) return;
  }

  throw new ForbiddenError("Cannot access this placement");
}

export const placementRepository = {
  // Creates Placement + ValueChain + CommissionRule rows in a single
  // transaction.  Also writes an outbox event.  Returns the full payload
  // the service layer needs to respond to the caller.
  async createWithChainAndRules(
    placement: CreatePlacementData,
    chain: Omit<CreateValueChainData, "placementId">,
    rules: Omit<CreateCommissionRuleData, "placementId">[],
    outboxEvent: {
      id: string;
      eventType: string;
      aggregateId: string;
      payload: Prisma.InputJsonValue;
    },
    tx: Prisma.TransactionClient,
  ): Promise<{
    placement: Placement;
    valueChain: ValueChain;
    rules: Awaited<ReturnType<typeof tx.commissionRule.findMany>>;
  }> {
    const createdPlacement = await tx.placement.create({
      data: {
        requirementId: placement.requirementId,
        submissionId: placement.submissionId,
        candidateId: placement.candidateId,
        customerCompanyId: placement.customerCompanyId,
        createdByUserId: placement.createdByUserId,
        engagementType: placement.engagementType,
        billRateUsd: placement.billRateUsd as Prisma.Decimal | number,
        payRateUsd:
          placement.payRateUsd === null || placement.payRateUsd === undefined
            ? null
            : (placement.payRateUsd as Prisma.Decimal | number),
        startDate: placement.startDate,
        endDate: placement.endDate,
        contractDocumentId: placement.contractDocumentId ?? null,
        workOrderId: placement.workOrderId ?? null,
        rtrDocumentId: placement.rtrDocumentId ?? null,
        status: "ACTIVE",
      },
    });

    const createdChain = await tx.valueChain.create({
      data: {
        placementId: createdPlacement.id,
        customerCompanyId: chain.customerCompanyId,
        attributedCrmId: chain.attributedCrmId,
        attributedSrmId: chain.attributedSrmId,
        attributedMsmeId: chain.attributedMsmeId,
        candidateId: chain.candidateId,
        interviewerIds: chain.interviewerIds,
      },
    });

    // createMany with placementId attached
    await tx.commissionRule.createMany({
      data: rules.map((r) => ({
        placementId: createdPlacement.id,
        slot: r.slot,
        beneficiaryUserId: r.beneficiaryUserId,
        beneficiaryMsmeId: r.beneficiaryMsmeId,
        calculation: r.calculation,
        percentOfBillRate:
          r.percentOfBillRate === null || r.percentOfBillRate === undefined
            ? null
            : (r.percentOfBillRate as Prisma.Decimal | number),
        flatFeeUsd:
          r.flatFeeUsd === null || r.flatFeeUsd === undefined
            ? null
            : (r.flatFeeUsd as Prisma.Decimal | number),
        interviewId: r.interviewId ?? null,
        notes: r.notes ?? null,
      })),
    });

    const createdRules = await tx.commissionRule.findMany({
      where: { placementId: createdPlacement.id },
      orderBy: { createdAt: "asc" },
    });

    await tx.outgoingEvent.create({
      data: {
        id: outboxEvent.id,
        eventType: outboxEvent.eventType,
        aggregateId: outboxEvent.aggregateId,
        payload: outboxEvent.payload,
        status: "PENDING",
        attempts: 0,
      },
    });

    return { placement: createdPlacement, valueChain: createdChain, rules: createdRules };
  },

  async findById(
    ctx: AuthContext,
    id: string,
  ): Promise<{ placement: Placement; valueChain: ValueChain | null }> {
    const placement = await prisma.placement.findUnique({ where: { id } });
    if (!placement) throw new NotFoundError("Placement not found");
    const valueChain = await prisma.valueChain.findUnique({ where: { placementId: id } });
    assertCanReadPlacement(ctx, placement, valueChain);
    return { placement, valueChain };
  },

  async findByIdRaw(id: string): Promise<Placement | null> {
    return prisma.placement.findUnique({ where: { id } });
  },

  async list(
    ctx: AuthContext,
    filters: PlacementFilterInput,
    cursor: string | null,
    limit: number,
  ): Promise<{ data: Placement[]; nextCursor: string | null; hasMore: boolean }> {
    const where: Prisma.PlacementWhereInput = {};
    if (filters.customerCompanyId) where.customerCompanyId = filters.customerCompanyId;
    if (filters.candidateId) where.candidateId = filters.candidateId;
    if (filters.requirementId) where.requirementId = filters.requirementId;
    if (filters.status) where.status = filters.status;

    const isAdmin = ctx.roles.includes("ADMIN");
    if (!isAdmin) {
      // Scope to placements where the caller is a participant.  We don't
      // have the ValueChain join here, so we query placements where the
      // caller either created it, is the candidate, or appears in a
      // ValueChain row.
      where.OR = [
        { createdByUserId: ctx.userId },
        { candidateId: ctx.userId },
        {
          valueChain: {
            OR: [
              { attributedCrmId: ctx.userId },
              { attributedSrmId: ctx.userId },
              { interviewerIds: { has: ctx.userId } },
            ],
          },
        },
      ];
    }

    const rows = await prisma.placement.findMany({
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

  async endPlacement(
    ctx: AuthContext,
    id: string,
    status: "ENDED_COMPLETED" | "ENDED_EARLY",
    actualEndDate: Date,
    reason: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Placement> {
    const db = tx ?? prisma;
    const placement = await db.placement.findUnique({ where: { id } });
    if (!placement) throw new NotFoundError("Placement not found");

    const isAdmin = ctx.roles.includes("ADMIN");
    const isCreator = ctx.userId === placement.createdByUserId;
    if (!isAdmin && !isCreator) {
      throw new ForbiddenError("Only the customer who created this placement can end it");
    }

    if (placement.status !== "ACTIVE") {
      throw new ForbiddenError(`Placement is already in status ${placement.status}`);
    }

    return db.placement.update({
      where: { id },
      data: {
        status,
        actualEndDate,
        endReason: reason,
      },
    });
  },
};
