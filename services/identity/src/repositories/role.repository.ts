import { prisma } from "../lib/prisma.js";
import type { AuthContext, SystemContext } from "@techorbit/auth-middleware";
import type { UserRoleType, UserRoleStatus } from "@prisma/client";

type UserRoleWithUser = {
  id: string;
  userId: string;
  roleType: UserRoleType;
  status: UserRoleStatus;
  verificationData: unknown;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  rejectNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type CreateRoleInput = {
  userId: string;
  roleType: UserRoleType;
  status?: UserRoleStatus;
  verificationData?: unknown;
};

export interface RoleRepository {
  findForUser(ctx: AuthContext | SystemContext, userId: string): Promise<UserRoleWithUser[]>;
  addRole(ctx: AuthContext | SystemContext, data: CreateRoleInput): Promise<UserRoleWithUser>;
  updateRoleStatus(
    ctx: AuthContext | SystemContext,
    roleId: string,
    status: UserRoleStatus,
    verifiedBy?: string,
    rejectNotes?: string
  ): Promise<UserRoleWithUser>;
  listPendingVerifications(ctx: AuthContext | SystemContext): Promise<UserRoleWithUser[]>;
}

function isSystemContext(ctx: AuthContext | SystemContext): ctx is SystemContext {
  return ctx.type === "system";
}

export const roleRepository: RoleRepository = {
  async findForUser(ctx, userId) {
    if (!isSystemContext(ctx) && ctx.userId !== userId) return [];
    return prisma.userRole.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  },

  async addRole(_ctx, data) {
    return prisma.userRole.create({
      data: {
        userId: data.userId,
        roleType: data.roleType,
        status: data.status ?? "PENDING_VERIFICATION",
        verificationData: data.verificationData ?? undefined,
      },
    });
  },

  async updateRoleStatus(ctx, roleId, status, verifiedBy, rejectNotes) {
    if (!isSystemContext(ctx)) {
      throw new Error("Only system context can update role status");
    }
    return prisma.userRole.update({
      where: { id: roleId },
      data: {
        status,
        verifiedBy: verifiedBy ?? null,
        verifiedAt: verifiedBy ? new Date() : null,
        rejectNotes: rejectNotes ?? null,
      },
    });
  },

  async listPendingVerifications(_ctx) {
    return prisma.userRole.findMany({
      where: { status: "PENDING_VERIFICATION" },
      orderBy: { createdAt: "asc" },
    });
  },
};