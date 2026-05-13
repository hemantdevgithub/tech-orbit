import type { AuditLogFilter } from "@techorbit/types";
import { Prisma } from "../generated/client/index.js";
import type { AuditLog } from "../generated/client/index.js";
import { prisma } from "../lib/prisma.js";

// Append-only. The module intentionally exports no update/delete helpers —
// audit rows are immutable once written.

export async function createAuditLog(
  input: {
    action: string;
    performedBy: string;
    targetId?: string | null;
    targetType?: string | null;
    metadata?: Record<string, unknown> | null;
  },
  tx: Prisma.TransactionClient = prisma,
): Promise<AuditLog> {
  return tx.auditLog.create({
    data: {
      action: input.action,
      performedBy: input.performedBy,
      targetId: input.targetId ?? null,
      targetType: input.targetType ?? null,
      metadata:
        input.metadata === null || input.metadata === undefined
          ? Prisma.JsonNull
          : (input.metadata as Prisma.InputJsonValue),
    },
  });
}

export async function listAuditLogs(filter: AuditLogFilter): Promise<AuditLog[]> {
  const where: Prisma.AuditLogWhereInput = {};
  if (filter.action) where.action = filter.action;
  if (filter.performedBy) where.performedBy = filter.performedBy;
  if (filter.targetId) where.targetId = filter.targetId;
  if (filter.from || filter.to) {
    where.createdAt = {};
    if (filter.from) where.createdAt.gte = new Date(filter.from);
    if (filter.to) where.createdAt.lte = new Date(filter.to);
  }

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filter.limit + 1,
    ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
  });
}
