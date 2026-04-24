import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@techorbit/errors";
import type { AuthContext } from "@techorbit/auth-middleware";
import type {
  ApproveApplication,
  RejectApplication,
  RoleApplicationFilter,
  RoleApplicationListResponse,
  RoleApplicationRequest,
  RoleApplicationResponse,
} from "@techorbit/types";
import type { RoleApplication } from "../generated/client/index.js";
import { prisma } from "../lib/prisma.js";
import { buildEvent, enqueueEvent } from "../lib/outbox.js";
import type { IdentityApi } from "../lib/identity-api.js";
import {
  countByStatus,
  createApplication,
  findApplicationById,
  listApplications,
  updateApplicationStatus,
} from "../repositories/role-application.repository.js";
import { createAuditLog } from "../repositories/audit-log.repository.js";

function isAdmin(auth: AuthContext): boolean {
  return auth.roles.includes("ADMIN");
}

function toResponse(r: RoleApplication): RoleApplicationResponse {
  return {
    id: r.id,
    userId: r.userId,
    requestedRole: r.requestedRole,
    status: r.status,
    applicationData: r.applicationData as Record<string, unknown>,
    reviewedBy: r.reviewedBy,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    reviewNotes: r.reviewNotes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export type RoleApplicationServiceDeps = {
  identityApi: IdentityApi;
};

export type RoleApplicationService = ReturnType<typeof createRoleApplicationService>;

export function createRoleApplicationService(deps: RoleApplicationServiceDeps) {
  return {
    async submit(
      auth: AuthContext,
      body: RoleApplicationRequest,
    ): Promise<RoleApplicationResponse> {
      // Users can only submit on their own behalf; admins can back-fill.
      const row = await createApplication(auth.userId, body.requestedRole, body.applicationData);
      return toResponse(row);
    },

    async list(
      auth: AuthContext,
      filter: RoleApplicationFilter,
    ): Promise<RoleApplicationListResponse> {
      // Non-admins see only their own applications.
      const scopedFilter = isAdmin(auth)
        ? filter
        : { ...filter, userId: auth.userId };

      const rows = await listApplications(scopedFilter);
      const hasMore = rows.length > filter.limit;
      const sliced = hasMore ? rows.slice(0, filter.limit) : rows;

      return {
        data: sliced.map(toResponse),
        nextCursor: hasMore ? (sliced[sliced.length - 1]?.id ?? null) : null,
        hasMore,
      };
    },

    async get(auth: AuthContext, id: string): Promise<RoleApplicationResponse> {
      const row = await findApplicationById(id);
      if (!row) throw new NotFoundError("Application not found");
      if (!isAdmin(auth) && row.userId !== auth.userId) {
        throw new ForbiddenError("Not authorized");
      }
      return toResponse(row);
    },

    async approve(
      auth: AuthContext,
      id: string,
      body: ApproveApplication,
    ): Promise<RoleApplicationResponse> {
      if (!isAdmin(auth)) throw new ForbiddenError("Admin role required");

      const existing = await findApplicationById(id);
      if (!existing) throw new NotFoundError("Application not found");
      if (existing.status !== "PENDING") {
        throw new ConflictError(`Application is ${existing.status}, cannot approve`);
      }

      // Add role in identity-svc first; if that fails, don't mark approved.
      await deps.identityApi.addRole(existing.userId, existing.requestedRole);

      const updated = await prisma.$transaction(async (tx) => {
        const row = await updateApplicationStatus(
          id,
          "APPROVED",
          auth.userId,
          body.reviewNotes ?? null,
          tx,
        );
        await createAuditLog(
          {
            action: "ROLE_APPLICATION_APPROVED",
            performedBy: auth.userId,
            targetId: existing.userId,
            targetType: "USER",
            metadata: {
              applicationId: id,
              role: existing.requestedRole,
              notes: body.reviewNotes ?? null,
            },
          },
          tx,
        );
        const event = buildEvent("role.approved.v1", {
          applicationId: id,
          userId: existing.userId,
          role: existing.requestedRole,
          reviewerId: auth.userId,
        });
        await enqueueEvent(tx, event, id);
        return row;
      });

      return toResponse(updated);
    },

    async reject(
      auth: AuthContext,
      id: string,
      body: RejectApplication,
    ): Promise<RoleApplicationResponse> {
      if (!isAdmin(auth)) throw new ForbiddenError("Admin role required");
      if (!body.reviewNotes.trim()) {
        throw new ValidationError("Review notes are required when rejecting");
      }

      const existing = await findApplicationById(id);
      if (!existing) throw new NotFoundError("Application not found");
      if (existing.status !== "PENDING") {
        throw new ConflictError(`Application is ${existing.status}, cannot reject`);
      }

      const updated = await prisma.$transaction(async (tx) => {
        const row = await updateApplicationStatus(
          id,
          "REJECTED",
          auth.userId,
          body.reviewNotes,
          tx,
        );
        await createAuditLog(
          {
            action: "ROLE_APPLICATION_REJECTED",
            performedBy: auth.userId,
            targetId: existing.userId,
            targetType: "USER",
            metadata: {
              applicationId: id,
              role: existing.requestedRole,
              notes: body.reviewNotes,
            },
          },
          tx,
        );
        const event = buildEvent("role.rejected.v1", {
          applicationId: id,
          userId: existing.userId,
          role: existing.requestedRole,
          reviewerId: auth.userId,
          reviewNotes: body.reviewNotes,
        });
        await enqueueEvent(tx, event, id);
        return row;
      });

      return toResponse(updated);
    },

    async countPending(): Promise<number> {
      return countByStatus("PENDING");
    },
  };
}
