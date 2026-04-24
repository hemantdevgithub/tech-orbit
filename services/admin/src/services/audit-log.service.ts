import { ForbiddenError } from "@techorbit/errors";
import type { AuthContext } from "@techorbit/auth-middleware";
import type {
  AuditLogFilter,
  AuditLogListResponse,
  AuditLogResponse,
} from "@techorbit/types";
import type { AuditLog } from "../generated/client/index.js";
import { listAuditLogs } from "../repositories/audit-log.repository.js";

function isAdmin(auth: AuthContext): boolean {
  return auth.roles.includes("ADMIN");
}

function toResponse(log: AuditLog): AuditLogResponse {
  return {
    id: log.id,
    action: log.action,
    performedBy: log.performedBy,
    targetId: log.targetId,
    targetType: log.targetType,
    metadata: (log.metadata as Record<string, unknown>) ?? null,
    createdAt: log.createdAt.toISOString(),
  };
}

export type AuditLogService = ReturnType<typeof createAuditLogService>;

export function createAuditLogService() {
  return {
    async list(auth: AuthContext, filter: AuditLogFilter): Promise<AuditLogListResponse> {
      if (!isAdmin(auth)) throw new ForbiddenError("Admin role required");
      const rows = await listAuditLogs(filter);
      const hasMore = rows.length > filter.limit;
      const sliced = hasMore ? rows.slice(0, filter.limit) : rows;
      return {
        data: sliced.map(toResponse),
        nextCursor: hasMore ? (sliced[sliced.length - 1]?.id ?? null) : null,
        hasMore,
      };
    },
  };
}
