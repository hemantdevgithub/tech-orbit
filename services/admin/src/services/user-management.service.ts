import { ForbiddenError } from "@techorbit/errors";
import type { AuthContext } from "@techorbit/auth-middleware";
import type {
  BanUser,
  SuspendDuration,
  SuspendUser,
  UserSearchResponse,
} from "@techorbit/types";
import { prisma } from "../lib/prisma.js";
import { buildEvent, enqueueEvent } from "../lib/outbox.js";
import type { IdentityApi } from "../lib/identity-api.js";
import { createAuditLog } from "../repositories/audit-log.repository.js";

function isAdmin(auth: AuthContext): boolean {
  return auth.roles.includes("ADMIN");
}

function suspendUntil(duration: SuspendDuration): Date | null {
  const now = new Date();
  switch (duration) {
    case "SEVEN_DAYS":
      return new Date(now.getTime() + 7 * 86400_000);
    case "THIRTY_DAYS":
      return new Date(now.getTime() + 30 * 86400_000);
    case "NINETY_DAYS":
      return new Date(now.getTime() + 90 * 86400_000);
    case "INDEFINITE":
      return null;
  }
}

export type UserManagementServiceDeps = {
  identityApi: IdentityApi;
};

export type UserManagementService = ReturnType<typeof createUserManagementService>;

export function createUserManagementService(deps: UserManagementServiceDeps) {
  return {
    async suspend(auth: AuthContext, userId: string, body: SuspendUser): Promise<{ ok: true }> {
      if (!isAdmin(auth)) throw new ForbiddenError("Admin role required");

      const until = suspendUntil(body.duration);
      await deps.identityApi.updateUserStatus(userId, "SUSPENDED", {
        reason: body.reason,
        duration: body.duration,
        performedBy: auth.userId,
      });

      await prisma.$transaction(async (tx) => {
        await createAuditLog(
          {
            action: "USER_SUSPENDED",
            performedBy: auth.userId,
            targetId: userId,
            targetType: "USER",
            metadata: {
              reason: body.reason,
              duration: body.duration,
              until: until?.toISOString() ?? null,
            },
          },
          tx,
        );
        const event = buildEvent("user.suspended.v1", {
          userId,
          reason: body.reason,
          duration: body.duration,
          performedBy: auth.userId,
          until: until?.toISOString() ?? null,
        });
        await enqueueEvent(tx, event, userId);
      });

      return { ok: true };
    },

    async ban(auth: AuthContext, userId: string, body: BanUser): Promise<{ ok: true }> {
      if (!isAdmin(auth)) throw new ForbiddenError("Admin role required");

      await deps.identityApi.updateUserStatus(userId, "BANNED", {
        reason: body.reason,
        performedBy: auth.userId,
      });

      await prisma.$transaction(async (tx) => {
        await createAuditLog(
          {
            action: "USER_BANNED",
            performedBy: auth.userId,
            targetId: userId,
            targetType: "USER",
            metadata: { reason: body.reason },
          },
          tx,
        );
        const event = buildEvent("user.banned.v1", {
          userId,
          reason: body.reason,
          performedBy: auth.userId,
        });
        await enqueueEvent(tx, event, userId);
      });

      return { ok: true };
    },

    async triggerPasswordReset(auth: AuthContext, userId: string): Promise<{ ok: true }> {
      if (!isAdmin(auth)) throw new ForbiddenError("Admin role required");

      await deps.identityApi.triggerPasswordReset(userId, auth.userId);
      await createAuditLog({
        action: "PASSWORD_RESET_TRIGGERED",
        performedBy: auth.userId,
        targetId: userId,
        targetType: "USER",
        metadata: null,
      });
      return { ok: true };
    },

    async search(auth: AuthContext, query: string): Promise<UserSearchResponse> {
      if (!isAdmin(auth)) throw new ForbiddenError("Admin role required");
      const results = await deps.identityApi.searchUsers(query);
      return { data: results };
    },
  };
}
