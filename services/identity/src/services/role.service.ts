import type { AuthContext, SystemContext } from "@techorbit/auth-middleware";
import type { UserRoleType } from "../generated/client/index.js";
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

  // Flip a PENDING_VERIFICATION role to ACTIVE. Called from admin-svc when
  // a role application is approved. System-context only — there's no
  // user-facing self-activation path.
  async markRoleActive(
    ctx: SystemContext,
    userId: string,
    roleType: UserRoleType,
  ): Promise<void> {
    if (ctx.type !== "system") throw new Error("Access denied");
    await roleRepository.markActive(ctx, userId, roleType);
  },
};