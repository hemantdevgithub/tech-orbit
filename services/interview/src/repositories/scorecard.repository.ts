import type {
  Prisma,
  Recommendation,
  Scorecard,
} from "../generated/client/index.js";
import { ConflictError, ForbiddenError, NotFoundError } from "@techorbit/errors";
import type { AuthContext } from "@techorbit/auth-middleware";
import { prisma } from "../lib/prisma.js";

export type CreateScorecardInput = {
  interviewId: string;
  recommendation: Recommendation;
  technicalScore?: number | null;
  communicationScore?: number | null;
  problemSolvingScore?: number | null;
  culturalFitScore?: number | null;
  freeformFeedback: string;
  redFlags?: string | null;
  wouldHireAgain?: boolean | null;
  submittedBy: string;
};

export const scorecardRepository = {
  async create(
    ctx: AuthContext,
    input: CreateScorecardInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Scorecard> {
    const db = tx ?? prisma;

    // Gate: only the interviewer or the customer who scheduled can submit.
    const iv = await db.interview.findUnique({ where: { id: input.interviewId } });
    if (!iv) throw new NotFoundError("Interview not found");

    const isAdmin = ctx.roles.includes("ADMIN");
    const isScheduler = ctx.userId === iv.scheduledByUserId;
    const isInterviewer = iv.interviewerUserId !== null && ctx.userId === iv.interviewerUserId;

    if (!isAdmin && !isScheduler && !isInterviewer) {
      throw new ForbiddenError("Only the scheduler or assigned interviewer can submit a scorecard");
    }

    const existing = await db.scorecard.findUnique({ where: { interviewId: input.interviewId } });
    if (existing) throw new ConflictError("A scorecard for this interview already exists");

    return db.scorecard.create({
      data: {
        interviewId: input.interviewId,
        recommendation: input.recommendation,
        technicalScore: input.technicalScore ?? null,
        communicationScore: input.communicationScore ?? null,
        problemSolvingScore: input.problemSolvingScore ?? null,
        culturalFitScore: input.culturalFitScore ?? null,
        freeformFeedback: input.freeformFeedback,
        redFlags: input.redFlags ?? null,
        wouldHireAgain: input.wouldHireAgain ?? null,
        submittedBy: input.submittedBy,
      },
    });
  },

  async findByInterview(ctx: AuthContext, interviewId: string): Promise<Scorecard | null> {
    const iv = await prisma.interview.findUnique({ where: { id: interviewId } });
    if (!iv) throw new NotFoundError("Interview not found");

    // Scorecards are confidential from candidates.
    const isAdmin = ctx.roles.includes("ADMIN");
    const isScheduler = ctx.userId === iv.scheduledByUserId;
    const isInterviewer = iv.interviewerUserId !== null && ctx.userId === iv.interviewerUserId;

    if (!isAdmin && !isScheduler && !isInterviewer) {
      throw new ForbiddenError("Scorecards are only visible to the scheduler and interviewer");
    }

    return prisma.scorecard.findUnique({ where: { interviewId } });
  },
};
