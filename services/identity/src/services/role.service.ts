import type { AuthContext, SystemContext } from "@techorbit/auth-middleware";
import type { UserRoleType } from "@prisma/client";
import { roleRepository } from "../repositories/index.js";
import { outboxRepository } from "../repositories/index.js";

// Roles that are AUTO_ACTIVE (no staff verification required)
const AUTO_ACTIVE_ROLES: UserRoleType[] = ["CUSTOMER", "CANDIDATE"];

export interface AddRoleResult {
  roleId: string;
  roleType: UserRoleType;
  status: "PENDING_VERIFICATION" | "ACTIVE";
}

export const roleService = {
  async addRoleForUser(
    ctx: AuthContext | SystemContext,
    userId: string,
    roleType: UserRoleType
  ): Promise<AddRoleResult> {
    // Check user has access
    if (ctx.type !== "system" && ctx.userId !== userId) {
      throw new Error("Access denied");
    }

    // Determine initial status based on role type
    const initialStatus =
      AUTO_ACTIVE_ROLES.includes(roleType)
        ? "ACTIVE"
        : "PENDING_VERIFICATION";

    const role = await roleRepository.addRole(ctx, {
      userId,
      roleType,
      status: initialStatus,
    });

    // Emit role_added event
    await outboxRepository.enqueue(
      ctx.type === "system" ? { type: "system" } : ctx,
      {
        type: "user.role_added.v1",
        payload: {
          userId,
          roleId: role.id,
          roleType,
          initialStatus,
        },
      }
    );

    return {
      roleId: role.id,
      roleType,
      status: initialStatus,
    };
  },

  async getRolesForUser(
    ctx: AuthContext | SystemContext,
    userId: string
  ): Promise<Array<{ id: string; roleType: string; status: string; addedAt: Date }>> {
    const roles = await roleRepository.findForUser(ctx, userId);
    return roles.map((r) => ({
      id: r.id,
      roleType: r.roleType,
      status: r.status,
      addedAt: r.createdAt,
    }));
  },
};