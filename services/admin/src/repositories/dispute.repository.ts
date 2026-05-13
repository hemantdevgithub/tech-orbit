import type {
  CreateDisputeRequest,
  DisputeFilter,
} from "@techorbit/types";
import type { Dispute, DisputeNote, Prisma } from "../generated/client/index.js";
import { prisma } from "../lib/prisma.js";

export async function createDispute(
  raisedBy: string,
  input: CreateDisputeRequest,
  tx: Prisma.TransactionClient = prisma,
): Promise<Dispute> {
  return tx.dispute.create({
    data: {
      type: input.type,
      contextType: input.contextType,
      contextId: input.contextId,
      raisedBy,
      respondent: input.respondent ?? null,
      description: input.description,
    },
  });
}

export async function findDisputeById(id: string): Promise<Dispute | null> {
  return prisma.dispute.findUnique({ where: { id } });
}

export async function findDisputeWithNotes(
  id: string,
): Promise<(Dispute & { notes: DisputeNote[] }) | null> {
  return prisma.dispute.findUnique({
    where: { id },
    include: { notes: { orderBy: { createdAt: "asc" } } },
  });
}

export async function listDisputes(
  filter: DisputeFilter,
  scope: { userId?: string } = {},
): Promise<Dispute[]> {
  const where: Prisma.DisputeWhereInput = {};
  if (filter.status) where.status = filter.status;
  if (filter.type) where.type = filter.type;
  if (filter.raisedBy) where.raisedBy = filter.raisedBy;
  if (scope.userId) {
    where.OR = [{ raisedBy: scope.userId }, { respondent: scope.userId }];
  }

  return prisma.dispute.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filter.limit + 1,
    ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
  });
}

export async function addNote(
  disputeId: string,
  authorId: string,
  content: string,
): Promise<DisputeNote> {
  return prisma.disputeNote.create({
    data: { disputeId, authorId, content },
  });
}

export async function resolveDispute(
  id: string,
  resolvedBy: string,
  resolution: string,
  tx: Prisma.TransactionClient = prisma,
): Promise<Dispute> {
  return tx.dispute.update({
    where: { id },
    data: {
      status: "RESOLVED",
      resolution,
      resolvedBy,
      resolvedAt: new Date(),
    },
  });
}

export async function countOpen(): Promise<number> {
  return prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } });
}
