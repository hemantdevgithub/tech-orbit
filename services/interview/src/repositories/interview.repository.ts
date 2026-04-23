import type { Decimal } from "@prisma/client/runtime/library.js";
import type {
  Interview,
  InterviewStatus,
  InterviewerRole,
  Prisma,
} from "../generated/client/index.js";
import { ForbiddenError, NotFoundError } from "@techorbit/errors";
import type { AuthContext } from "@techorbit/auth-middleware";
import { prisma } from "../lib/prisma.js";

export type CreateInterviewInput = {
  requirementId: string;
  submissionId: string;
  candidateId: string;
  scheduledByUserId: string;
  interviewerUserId?: string | null;
  conductedByRole: InterviewerRole;
  scheduledStart: Date;
  scheduledEnd: Date;
  videoProviderId?: string | null;
  videoRoomUrl?: string | null;
  interviewerFeeUsd?: Decimal | number | null;
};

export type InterviewListFilters = {
  requirementId?: string;
  submissionId?: string;
  candidateId?: string;
  interviewerUserId?: string;
  status?: InterviewStatus;
};

const CANCELLABLE_STATUSES: InterviewStatus[] = ["SCHEDULED"];

// Who can see an interview:
// - The customer who scheduled it (scheduledByUserId)
// - The candidate
// - The assigned interviewer
// - ADMIN
function assertCanRead(ctx: AuthContext, iv: Interview): void {
  if (ctx.roles.includes("ADMIN")) return;
  if (
    ctx.userId === iv.scheduledByUserId ||
    ctx.userId === iv.candidateId ||
    (iv.interviewerUserId !== null && ctx.userId === iv.interviewerUserId)
  ) return;
  throw new ForbiddenError("Cannot access this interview");
}

export const interviewRepository = {
  async create(
    input: CreateInterviewInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Interview> {
    const db = tx ?? prisma;
    return db.interview.create({
      data: {
        requirementId: input.requirementId,
        submissionId: input.submissionId,
        candidateId: input.candidateId,
        scheduledByUserId: input.scheduledByUserId,
        interviewerUserId: input.interviewerUserId ?? null,
        conductedByRole: input.conductedByRole,
        scheduledStart: input.scheduledStart,
        scheduledEnd: input.scheduledEnd,
        videoProviderId: input.videoProviderId ?? null,
        videoRoomUrl: input.videoRoomUrl ?? null,
        interviewerFeeUsd:
          input.interviewerFeeUsd === null || input.interviewerFeeUsd === undefined
            ? null
            : (input.interviewerFeeUsd as Prisma.Decimal | number),
        status: "SCHEDULED",
      },
    });
  },

  async findById(ctx: AuthContext, id: string): Promise<Interview> {
    const iv = await prisma.interview.findUnique({ where: { id } });
    if (!iv) throw new NotFoundError("Interview not found");
    assertCanRead(ctx, iv);
    return iv;
  },

  async findByIdRaw(id: string): Promise<Interview | null> {
    return prisma.interview.findUnique({ where: { id } });
  },

  async list(
    ctx: AuthContext,
    filters: InterviewListFilters,
    cursor: string | null,
    limit: number,
  ): Promise<{ data: Interview[]; nextCursor: string | null; hasMore: boolean }> {
    const isAdmin = ctx.roles.includes("ADMIN");
    const where: Prisma.InterviewWhereInput = {};
    if (filters.requirementId) where.requirementId = filters.requirementId;
    if (filters.submissionId) where.submissionId = filters.submissionId;
    if (filters.candidateId) where.candidateId = filters.candidateId;
    if (filters.interviewerUserId) where.interviewerUserId = filters.interviewerUserId;
    if (filters.status) where.status = filters.status;

    if (!isAdmin) {
      where.OR = [
        { scheduledByUserId: ctx.userId },
        { candidateId: ctx.userId },
        { interviewerUserId: ctx.userId },
      ];
    }

    const rows = await prisma.interview.findMany({
      where,
      orderBy: [{ scheduledStart: "asc" }, { id: "asc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    return { data, nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null, hasMore };
  },

  async updateStatus(
    id: string,
    status: InterviewStatus,
    extra?: { startedAt?: Date; endedAt?: Date; videoRecordingUrl?: string },
    tx?: Prisma.TransactionClient,
  ): Promise<Interview> {
    const db = tx ?? prisma;
    const iv = await db.interview.findUnique({ where: { id } });
    if (!iv) throw new NotFoundError("Interview not found");
    return db.interview.update({
      where: { id },
      data: { status, ...extra },
    });
  },

  async cancel(
    ctx: AuthContext,
    id: string,
    reason: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Interview> {
    const db = tx ?? prisma;
    const iv = await db.interview.findUnique({ where: { id } });
    if (!iv) throw new NotFoundError("Interview not found");

    if (!CANCELLABLE_STATUSES.includes(iv.status)) {
      throw new ForbiddenError(`Interview in status ${iv.status} cannot be cancelled`);
    }

    const isAdmin = ctx.roles.includes("ADMIN");
    const isScheduler = ctx.userId === iv.scheduledByUserId;
    const isInterviewer = iv.interviewerUserId !== null && ctx.userId === iv.interviewerUserId;

    if (!isAdmin && !isScheduler && !isInterviewer) {
      throw new ForbiddenError("Only the scheduler, assigned interviewer, or admin can cancel");
    }

    return db.interview.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: ctx.userId,
        cancelReason: reason,
      },
    });
  },

  async setRecordingUrl(id: string, url: string): Promise<Interview> {
    return prisma.interview.update({
      where: { id },
      data: { videoRecordingUrl: url },
    });
  },
};
