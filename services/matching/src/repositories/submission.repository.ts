import type { Decimal } from "@prisma/client/runtime/library.js";
import type {
  Prisma,
  Submission,
  SubmissionStatus,
  SubmitterRole,
} from "../generated/client/index.js";
import { ForbiddenError, NotFoundError } from "@techorbit/errors";
import type { AuthContext } from "@techorbit/auth-middleware";
import { prisma } from "../lib/prisma.js";

// ─── Input types ─────────────────────────────────────────────────────────────

export type CreateSubmissionInput = {
  requirementId: string;
  candidateId: string;
  submittedByUserId: string;
  submitterRole: SubmitterRole;
  attributedSrmId?: string | null;
  attributedMsmeId?: string | null;
  matchScore?: number | null;
  coverNote?: string | null;
  proposedBillRate?: Decimal | number | null;
};

export type ListSubmissionsFilters = {
  requirementId?: string;
  candidateId?: string;
  status?: SubmissionStatus;
  submitterRole?: SubmitterRole;
  // Visibility scope: derive from the caller.
  // - "owner": filter to submissions whose requirement is owned by this user
  //   (customer dashboard).  Populated by the service layer.
  // - "self": filter to submissions created by this user (candidate's own
  //   submissions).
  // - "all": admin view.
  ownedRequirementIds?: string[];
  submittedByUserId?: string;
};

export type ListSubmissionsResult = {
  data: Submission[];
  nextCursor: string | null;
  hasMore: boolean;
};

// ─── Authz helpers ───────────────────────────────────────────────────────────

export const submissionAuth = {
  hasAdminRole(ctx: AuthContext): boolean {
    return ctx.roles.includes("ADMIN");
  },
  isSubmitter(ctx: AuthContext, s: Submission): boolean {
    return ctx.userId === s.submittedByUserId;
  },
  isAttributedSrm(ctx: AuthContext, s: Submission): boolean {
    return s.attributedSrmId !== null && ctx.userId === s.attributedSrmId;
  },
  isAttributedMsme(ctx: AuthContext, s: Submission): boolean {
    return s.attributedMsmeId !== null && ctx.userId === s.attributedMsmeId;
  },
};

// ─── Repository ──────────────────────────────────────────────────────────────

export const submissionRepository = {
  async create(
    input: CreateSubmissionInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Submission> {
    const db = tx ?? prisma;
    return db.submission.create({
      data: {
        requirementId: input.requirementId,
        candidateId: input.candidateId,
        submittedByUserId: input.submittedByUserId,
        submitterRole: input.submitterRole,
        attributedSrmId: input.attributedSrmId ?? null,
        attributedMsmeId: input.attributedMsmeId ?? null,
        matchScore: input.matchScore ?? null,
        coverNote: input.coverNote ?? null,
        proposedBillRate:
          input.proposedBillRate === null || input.proposedBillRate === undefined
            ? null
            : (input.proposedBillRate as Prisma.Decimal | number),
        status: "SUBMITTED",
      },
    });
  },

  async findByIdRaw(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Submission | null> {
    const db = tx ?? prisma;
    return db.submission.findUnique({ where: { id } });
  },

  async findByPair(
    requirementId: string,
    candidateId: string,
  ): Promise<Submission | null> {
    return prisma.submission.findUnique({
      where: { requirementId_candidateId: { requirementId, candidateId } },
    });
  },

  async updateStatus(
    id: string,
    status: SubmissionStatus,
    rejectionReason: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<Submission> {
    const db = tx ?? prisma;
    const current = await db.submission.findUnique({ where: { id } });
    if (!current) throw new NotFoundError("Submission not found");

    const isRejection = status === "REJECTED";
    return db.submission.update({
      where: { id },
      data: {
        status,
        rejectedAt: isRejection ? new Date() : null,
        rejectionReason: isRejection ? rejectionReason : null,
      },
    });
  },

  async withdraw(
    ctx: AuthContext,
    id: string,
    reason: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Submission> {
    const db = tx ?? prisma;
    const current = await db.submission.findUnique({ where: { id } });
    if (!current) throw new NotFoundError("Submission not found");

    if (!submissionAuth.isSubmitter(ctx, current) && !submissionAuth.hasAdminRole(ctx)) {
      throw new ForbiddenError("Only the submitter can withdraw this submission");
    }

    return db.submission.update({
      where: { id },
      data: {
        status: "WITHDRAWN",
        withdrawnAt: new Date(),
        withdrawnReason: reason,
      },
    });
  },

  async list(
    filters: ListSubmissionsFilters,
    cursor: string | null,
    limit: number,
  ): Promise<ListSubmissionsResult> {
    const where: Prisma.SubmissionWhereInput = {};
    if (filters.requirementId) where.requirementId = filters.requirementId;
    if (filters.candidateId) where.candidateId = filters.candidateId;
    if (filters.status) where.status = filters.status;
    if (filters.submitterRole) where.submitterRole = filters.submitterRole;

    // Scope enforcement: one of ownedRequirementIds or submittedByUserId.
    // The service layer picks the correct scope from the caller's roles.
    // If both are supplied, the record must match either (OR).
    if (filters.ownedRequirementIds && filters.submittedByUserId) {
      where.OR = [
        { requirementId: { in: filters.ownedRequirementIds } },
        { submittedByUserId: filters.submittedByUserId },
      ];
    } else if (filters.ownedRequirementIds) {
      where.requirementId = { in: filters.ownedRequirementIds };
    } else if (filters.submittedByUserId) {
      where.submittedByUserId = filters.submittedByUserId;
    }

    const rows = await prisma.submission.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (data[data.length - 1]?.id ?? null) : null;
    return { data, nextCursor, hasMore };
  },
};
