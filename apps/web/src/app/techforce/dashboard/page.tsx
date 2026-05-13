"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@techorbit/ui";
import { isOnboardingComplete } from "@/lib/auth-guards";
import type { RoleType } from "@/lib/auth-guards";
import { useAuth } from "@/lib/auth-hooks";
import { CandidateDashboard } from "@/components/dashboard/candidate-dashboard";
import { MsmeDashboard } from "@/components/dashboard/msme-dashboard";
import { CustomerDashboard } from "@/components/dashboard/customer-dashboard";
import { CrmDashboard } from "@/components/dashboard/crm-dashboard";
import { SrmDashboard } from "@/components/dashboard/srm-dashboard";
import { ClockIcon, ROLE_ICON_COMPONENT } from "@/components/icons";

const ROLE_FULL_LABELS: Record<RoleType, string> = {
  CUSTOMER: "Customer",
  CANDIDATE: "Candidate",
  CRM: "Business Developer",
  SRM: "Recruiter",
  MSME: "Vendor Firm",
};

const ROLE_DESCRIPTIONS: Record<RoleType, string> = {
  CUSTOMER: "Post requirements and hire consultants",
  CANDIDATE: "Browse and apply to opportunities",
  CRM: "Identify and engage client companies",
  SRM: "Source and submit qualified candidates",
  MSME: "Deploy benched consultants to requirements",
};

const ONBOARDING_ROUTES: Partial<Record<RoleType, string>> = {
  CANDIDATE: "/onboarding/candidate",
  MSME: "/onboarding/msme",
  CUSTOMER: "/onboarding/customer",
  CRM: "/onboarding/crm",
  SRM: "/onboarding/srm",
};

export default function DashboardPage() {
  const router = useRouter();
  const store = useAuthStore();
  const { addRole } = useAuth();
  const user = store.user;
  const [addingRole, setAddingRole] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  if (!user) return null;

  const activeRoles = user.roles.filter((r) => r.status === "ACTIVE");
  const pendingRoles = user.roles.filter((r) => r.status === "PENDING_VERIFICATION");
  const workspaceRoles = user.roles.filter(
    (r) => r.status === "ACTIVE" || r.status === "PENDING_VERIFICATION",
  );
  const availableRoles = (
    ["CUSTOMER", "CANDIDATE", "CRM", "SRM", "MSME"] as RoleType[]
  ).filter((role) => !user.roles.some((r) => r.roleType === role));

  async function handleAddRole(role: RoleType) {
    setAddingRole(role);
    setRoleError(null);
    try {
      await addRole(role);
      const route = ONBOARDING_ROUTES[role];
      if (route) router.push(route);
    } catch {
      setRoleError("Failed to add role — please try again.");
    } finally {
      setAddingRole(null);
    }
  }

  // Single-role users go straight to their workspace dashboard
  if (workspaceRoles.length === 1 && availableRoles.length < 5) {
    const role = workspaceRoles[0]!.roleType as RoleType;
    if (role === "CUSTOMER") return <CustomerDashboard />;
    if (role === "CANDIDATE") return <CandidateDashboard />;
    if (role === "CRM") return <CrmDashboard />;
    if (role === "SRM") return <SrmDashboard />;
    if (role === "MSME") return <MsmeDashboard />;
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <p className="text-xs text-sage-400 mb-1">Workspace / Dashboard</p>
        <h1 className="text-3xl font-bold text-forest-900">
          Welcome back, {user.firstName}
        </h1>
        <p className="text-sage-500 text-sm mt-1">
          {isOnboardingComplete(user)
            ? `${activeRoles.length} active workspace${activeRoles.length !== 1 ? "s" : ""} · select one below`
            : "Complete your onboarding to unlock all features."}
        </p>
      </div>

      {/* Pending roles banner */}
      {pendingRoles.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-start gap-3">
          <span className="text-warning shrink-0 mt-0.5"><ClockIcon size={18} /></span>
          <div className="flex-1">
            <p className="font-semibold text-forest-900 text-sm">
              {pendingRoles.length} role{pendingRoles.length > 1 ? "s" : ""} pending verification
            </p>
            <p className="text-sage-600 text-xs mt-0.5 mb-3">Complete your profile to unlock full access.</p>
            <div className="flex flex-wrap gap-2">
              {pendingRoles.map((r) => {
                const route = ONBOARDING_ROUTES[r.roleType as RoleType];
                return route ? (
                  <button
                    key={r.id}
                    onClick={() => router.push(route)}
                    className="px-3 py-1 rounded-full bg-warning/15 text-warning text-xs font-medium hover:bg-warning/25 transition-colors border border-warning/30"
                  >
                    {ROLE_FULL_LABELS[r.roleType as RoleType]} → Complete profile
                  </button>
                ) : null;
              })}
            </div>
          </div>
        </div>
      )}

      {/* Role workspaces */}
      {workspaceRoles.some((r) => r.roleType === "CUSTOMER") && (
        <section>
          <div className="border-t border-sage-200 pt-8">
            <CustomerDashboard />
          </div>
        </section>
      )}
      {workspaceRoles.some((r) => r.roleType === "CANDIDATE") && (
        <section>
          <div className="border-t border-sage-200 pt-8">
            <CandidateDashboard />
          </div>
        </section>
      )}
      {workspaceRoles.some((r) => r.roleType === "CRM") && (
        <section>
          <div className="border-t border-sage-200 pt-8">
            <CrmDashboard />
          </div>
        </section>
      )}
      {workspaceRoles.some((r) => r.roleType === "SRM") && (
        <section>
          <div className="border-t border-sage-200 pt-8">
            <SrmDashboard />
          </div>
        </section>
      )}
      {workspaceRoles.some((r) => r.roleType === "MSME") && (
        <section>
          <div className="border-t border-sage-200 pt-8">
            <MsmeDashboard />
          </div>
        </section>
      )}

      {/* Add more roles */}
      {availableRoles.length > 0 && (
        <section className="border-t border-sage-200 pt-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">
            {activeRoles.length === 0 ? "Get started — choose a role" : "Add another role"}
          </p>
          {roleError && (
            <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{roleError}</div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {availableRoles.map((role) => {
              const RoleIcon = ROLE_ICON_COMPONENT[role];
              return (
                <div
                  key={role}
                  className="bg-white rounded-xl border border-sage-200 p-5 hover:border-forest-300 hover:shadow-card transition-all"
                >
                  {RoleIcon && <div className="mb-3 w-9 h-9 rounded-lg bg-sage-100 flex items-center justify-center text-forest-700"><RoleIcon size={18} /></div>}
                  <p className="font-semibold text-forest-900 text-sm">{ROLE_FULL_LABELS[role]}</p>
                  <p className="text-sage-500 text-xs mt-0.5 mb-4">{ROLE_DESCRIPTIONS[role]}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    disabled={addingRole !== null}
                    onClick={() => handleAddRole(role)}
                  >
                    {addingRole === role ? "Adding…" : "Add role"}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
