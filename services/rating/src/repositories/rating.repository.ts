import type { Prisma, Rating } from "../generated/client/index.js";
import { prisma } from "../lib/prisma.js";

export async function createRating(
  tx: Prisma.TransactionClient,
  input: Omit<Prisma.RatingCreateInput, "id">,
): Promise<Rating> {
  return tx.rating.create({ data: input });
}

export async function findByPlacementAndRater(
  placementId: string,
  raterUserId: string,
): Promise<Rating | null> {
  return prisma.rating.findUnique({
    where: { placementId_raterUserId: { placementId, raterUserId } },
  });
}

export async function listByUser(
  ratedUserId: string,
  limit: number,
): Promise<Rating[]> {
  return prisma.rating.findMany({
    where: { ratedUserId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function listByPlacement(
  placementId: string,
  limit: number,
): Promise<Rating[]> {
  return prisma.rating.findMany({
    where: { placementId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countByUser(ratedUserId: string): Promise<number> {
  return prisma.rating.count({ where: { ratedUserId } });
}

export async function aggregatesForUser(
  ratedUserId: string,
): Promise<{
  averageOverall: number | null;
  averageTechnical: number | null;
  averageCommunication: number | null;
  averageProfessionalism: number | null;
  totalCount: number;
}> {
  const result = await prisma.rating.aggregate({
    where: { ratedUserId },
    _avg: {
      overallScore: true,
      technicalScore: true,
      communicationScore: true,
      professionalismScore: true,
    },
    _count: { _all: true },
  });
  return {
    averageOverall: result._avg.overallScore,
    averageTechnical: result._avg.technicalScore,
    averageCommunication: result._avg.communicationScore,
    averageProfessionalism: result._avg.professionalismScore,
    totalCount: result._count._all,
  };
}
