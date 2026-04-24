import type {
  ApplicationRole,
  ApplicationStatus,
  RoleApplicationFilter,
} from "@techorbit/types";
import type { Prisma, RoleApplication } from "../generated/client/index.js";
import { prisma } from "../lib/prisma.js";

export async function createApplication(
  userId: string,
  requestedRole: ApplicationRole,
  applicationData: Record<string, unknown>,
): Promise<RoleApplication> {
  return prisma.roleApplication.create({
    data: {
      userId,
      requestedRole,
      applicationData: applicationData as Prisma.InputJsonValue,
    },
  });
}

export async function findApplicationById(id: string): Promise<RoleApplication | null> {
  return prisma.roleApplication.findUnique({ where: { id } });
}

export async function listApplications(
  filter: RoleApplicationFilter,
): Promise<RoleApplication[]> {
  const where: Prisma.RoleApplicationWhereInput = {};
  if (filter.status) where.status = filter.status;
  if (filter.requestedRole) where.requestedRole = filter.requestedRole;
  if (filter.userId) where.userId = filter.userId;

  return prisma.roleApplication.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filter.limit + 1,
    ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
  });
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
  reviewedBy: string,
  reviewNotes: string | null,
  tx: Prisma.TransactionClient = prisma,
): Promise<RoleApplication> {
  return tx.roleApplication.update({
    where: { id },
    data: {
      status,
      reviewedBy,
      reviewedAt: new Date(),
      reviewNotes,
    },
  });
}

export async function countByStatus(status: ApplicationStatus): Promise<number> {
  return prisma.roleApplication.count({ where: { status } });
}
