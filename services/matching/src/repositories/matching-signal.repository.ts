import { Decimal } from "@prisma/client/runtime/library";
import type { MatchingSignal, Prisma } from "../generated/client/index.js";
import { prisma } from "../lib/prisma.js";
import type { MatchSignal } from "../services/matching-engine.js";

export const matchingSignalRepository = {
  // Called by the matching engine after computing a signal.  Upsert so
  // re-running the precompute for the same requirement/candidate pair is
  // safe (the event consumer is idempotent; this query is too).
  async upsert(
    requirementId: string,
    candidateId: string,
    signal: MatchSignal,
  ): Promise<MatchingSignal> {
    return prisma.matchingSignal.upsert({
      where: {
        requirementId_candidateId: { requirementId, candidateId },
      },
      create: {
        requirementId,
        candidateId,
        skillOverlap: signal.skillOverlap,
        seniorityMatch: signal.seniorityMatch,
        locationMatch: signal.locationMatch,
        workAuthMatch: signal.workAuthMatch,
        candidateRating: new Decimal(signal.candidateRating.toFixed(2)),
        matchScore: signal.matchScore,
      },
      update: {
        skillOverlap: signal.skillOverlap,
        seniorityMatch: signal.seniorityMatch,
        locationMatch: signal.locationMatch,
        workAuthMatch: signal.workAuthMatch,
        candidateRating: new Decimal(signal.candidateRating.toFixed(2)),
        matchScore: signal.matchScore,
        computedAt: new Date(),
      },
    });
  },

  async findForRequirement(
    requirementId: string,
    limit = 50,
  ): Promise<MatchingSignal[]> {
    return prisma.matchingSignal.findMany({
      where: { requirementId },
      orderBy: { matchScore: "desc" },
      take: limit,
    });
  },

  async findForPair(
    requirementId: string,
    candidateId: string,
  ): Promise<MatchingSignal | null> {
    return prisma.matchingSignal.findUnique({
      where: { requirementId_candidateId: { requirementId, candidateId } },
    });
  },

  async deleteForRequirement(
    requirementId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const db = tx ?? prisma;
    const result = await db.matchingSignal.deleteMany({
      where: { requirementId },
    });
    return result.count;
  },
};
