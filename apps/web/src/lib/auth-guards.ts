import type { UserProfile } from "@techorbit/types";
import type { AuthState } from "@/store/auth.store";

export type RoleType = "CUSTOMER" | "CANDIDATE" | "CRM" | "SRM" | "MSME";

export interface GuardOptions {
  requireAuth?: boolean;
  requireRoles?: RoleType[];
  requireVerified?: boolean;
}

export function canAccessRoute(
  authState: Pick<AuthState, "status" | "user">,
  options: GuardOptions
): { allowed: boolean; reason?: string } {
  // Auth check
  if (options.requireAuth && authState.status !== "authenticated") {
    return { allowed: false, reason: "authentication_required" };
  }

  // Role check
  if (options.requireRoles && options.requireRoles.length > 0) {
    if (!authState.user) {
      return { allowed: false, reason: "authentication_required" };
    }

    const activeRoles = authState.user.roles.filter((r) => r.status === "ACTIVE");
    const userRoleTypes = activeRoles.map((r) => r.roleType);

    const hasRole = options.requireRoles.some((role) => userRoleTypes.includes(role));
    if (!hasRole) {
      return { allowed: false, reason: "insufficient_permissions" };
    }
  }

  return { allowed: true };
}

export function hasRole(user: UserProfile | null, role: RoleType): boolean {
  if (!user) return false;
  return user.roles.some((r) => r.roleType === role && r.status === "ACTIVE");
}

export function hasAnyRole(user: UserProfile | null, roles: RoleType[]): boolean {
  if (!user) return false;
  const activeRoles = user.roles.filter((r) => r.status === "ACTIVE").map((r) => r.roleType);
  return roles.some((role) => activeRoles.includes(role));
}

export function isOnboardingComplete(user: UserProfile | null): boolean {
  if (!user) return false;
  return user.roles.some((r) => r.status === "ACTIVE");
}

export function getOnboardingRequiredRoles(user: UserProfile | null): RoleType[] {
  if (!user) return [];
  const pending = user.roles.filter((r) => r.status === "PENDING_VERIFICATION");
  return pending.map((r) => r.roleType) as RoleType[];
}
