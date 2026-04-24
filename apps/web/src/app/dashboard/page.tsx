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
import { InterviewerDashboard } from "@/components/dashboard/interviewer-dashboard";
import { CrmDashboard } from "@/components/dashboard/crm-dashboard";
import { SrmDashboard } from "@/components/dashboard/srm-dashboard";
import { ROLE_ICON_COMPONENT } from "@/components/icons";

const ROLE_LABELS: Record<RoleType, string> = {
  CUSTOMER: "Customer",
  CANDIDATE: "Candidate",
  CRM: "CRM",
  SRM: "SRM",
  MSME: "MSME",
  INTERVIEWER: "Interviewer",
};

const ROLE_FULL_LABELS: Record<RoleType, string> = {
  CUSTOMER: "Customer",
  CANDIDATE: "Candidate",
  CRM: "Business Developer",
  SRM: "Recruiter",
  MSME: "Vendor Firm",
  INTERVIEWER: "Interviewer",
};

const ROLE_DESCRIPTIONS: Record<RoleType, string> = {
  CUSTOMER: "Post IT requirements and hire consultants",
  CANDIDATE: "Browse and apply to IT opportunities",
  CRM: "Identify and engage with client companies",
  SRM: "Source and submit qualified candidates",
  MSME: "Deploy benched consultants to requirements",
  INTERVIEWER: "Conduct technical interviews for candidates",
};

// Icon components are looked up from ROLE_ICON_COMPONENT (see components/icons.tsx).

const ROLE_COLORS: Record<RoleType, string> = {
  CUSTOMER: "from-forest-700 to-forest-600",
  CANDIDATE: "from-info to-sky-500",
  CRM: "from-forest-600 to-forest-500",
  SRM: "from-warning to-amber-500",
  MSME: "from-sage-600 to-sage-500",
  INTERVIEWER: "from-success to-emerald-500",
};

const ROLE_ROUTES: Record<RoleType, string> = {
  CUSTOMER: "/requirements",
  CANDIDATE: "/requirements",
  CRM: "/requirements",
  SRM: "/requirements",
  MSME: "/requirements",
  INTERVIEWER: "/interviews",
};

const ONBOARDING_ROUTES: Partial<Record<RoleType, string>> = {
  CANDIDATE: "/onboarding/candidate",
  MSME: "/onboarding/msme",
  CUSTOMER: "/onboarding/customer",
  INTERVIEWER: "/onboarding/interviewer",
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

  const complete = isOnboardingComplete(user);
  const activeRoles = user.roles.filter((r) => r.status === "ACTIVE");
  const pendingRoles = user.roles.filter((r) => r.status === "PENDING_VERIFICATION");
  // Workspace panels show for pending roles too — the data is read-only, and
  // hiding it leaves pending users with nowhere to see their activity.
  const workspaceRoles = user.roles.filter(
    (r) => r.status === "ACTIVE" || r.status === "PENDING_VERIFICATION",
  );
  const availableRoles = (["CUSTOMER", "CANDIDATE", "CRM", "SRM", "MSME", "INTERVIEWER"] as RoleType[])
    .filter((role) => !user.roles.some((r) => r.roleType === role));

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

  return (
    <div className="space-y-8">
      {/* Hero welcome strip */}
      <div className="rounded-2xl bg-forest-800 px-7 py-6 flex items-center justify-between overflow-hidden relative">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #B2CCBA 0%, transparent 60%)" }} />
        <div className="relative z-10">
          <p className="text-mint-200 text-sm font-medium mb-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-2xl font-bold text-cream-100">
            Welcome back, {user.firstName}!
          </h1>
          <p className="text-sage-400 text-sm mt-0.5">
            {complete ? "Your account is ready to go." : "Complete your onboarding to unlock all features."}
          </p>
        </div>
        {activeRoles.length > 0 && (
          <div className="relative z-10 hidden md:flex items-center gap-2">
            {activeRoles.slice(0, 3).map((r) => (
              <span key={r.id} className="px-3 py-1.5 rounded-full bg-forest-700 text-cream-200 text-xs font-medium border border-forest-600">
                {ROLE_LABELS[r.roleType as RoleType] ?? r.roleType}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pending roles banner */}
      {pendingRoles.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-start gap-3">
          <span className="text-warning text-xl shrink-0 mt-0.5">⏳</span>
          <div className="flex-1">
            <p className="font-semibold text-forest-900 text-sm">
              {pendingRoles.length} role{pendingRoles.length > 1 ? "s" : ""} pending verification
            </p>
            <p className="text-sage-600 text-xs mt-0.5 mb-3">
              Complete your profile to unlock full access.
            </p>
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

      {/* Active role cards */}
      {activeRoles.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-sage-500 uppercase tracking-wider mb-3">Your roles</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeRoles.map((r) => {
              const role = r.roleType as RoleType;
              return (
                <button
                  key={r.id}
                  onClick={() => router.push(ROLE_ROUTES[role])}
                  className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${ROLE_COLORS[role]} p-5 text-left hover:shadow-cardHover transition-all hover:-translate-y-0.5`}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 translate-x-8 -translate-y-8" />
                  <div className="relative z-10">
                    {(() => {
                      const RoleIcon = ROLE_ICON_COMPONENT[role];
                      return RoleIcon ? (
                        <div className="mb-3 text-white"><RoleIcon size={24} /></div>
                      ) : null;
                    })()}
                    <p className="text-white font-semibold text-sm">{ROLE_FULL_LABELS[role]}</p>
                    <p className="text-white/70 text-xs mt-0.5">{ROLE_DESCRIPTIONS[role]}</p>
                    <div className="mt-3 flex items-center gap-1 text-white/80 text-xs group-hover:gap-2 transition-all">
                      <span>Open workspace</span>
                      <span>→</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Role-specific dashboards */}
      {workspaceRoles.some((r) => r.roleType === "CANDIDATE") && (
        <section>
          <h2 className="text-sm font-semibold text-sage-500 uppercase tracking-wider mb-3">Candidate workspace</h2>
          <CandidateDashboard />
        </section>
      )}
      {workspaceRoles.some((r) => r.roleType === "MSME") && (
        <section>
          <h2 className="text-sm font-semibold text-sage-500 uppercase tracking-wider mb-3">MSME workspace</h2>
          <MsmeDashboard />
        </section>
      )}
      {workspaceRoles.some((r) => r.roleType === "CUSTOMER") && (
        <section>
          <h2 className="text-sm font-semibold text-sage-500 uppercase tracking-wider mb-3">Customer workspace</h2>
          <CustomerDashboard />
        </section>
      )}
      {workspaceRoles.some((r) => r.roleType === "INTERVIEWER") && (
        <section>
          <h2 className="text-sm font-semibold text-sage-500 uppercase tracking-wider mb-3">Interviewer workspace</h2>
          <InterviewerDashboard />
        </section>
      )}
      {workspaceRoles.some((r) => r.roleType === "CRM") && (
        <section>
          <h2 className="text-sm font-semibold text-sage-500 uppercase tracking-wider mb-3">CRM workspace</h2>
          <CrmDashboard />
        </section>
      )}
      {workspaceRoles.some((r) => r.roleType === "SRM") && (
        <section>
          <h2 className="text-sm font-semibold text-sage-500 uppercase tracking-wider mb-3">SRM workspace</h2>
          <SrmDashboard />
        </section>
      )}

      {/* Add more roles */}
      {availableRoles.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-sage-500 uppercase tracking-wider mb-3">
            {activeRoles.length === 0 ? "Get started — choose a role" : "Add another role"}
          </h2>
          {roleError && (
            <div className="mb-3 p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{roleError}</div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {availableRoles.map((role) => (
              <div key={role} className="group rounded-xl border border-surface-border bg-surface p-5 hover:border-forest-300 hover:shadow-card transition-all">
                {(() => {
                  const RoleIcon = ROLE_ICON_COMPONENT[role];
                  return RoleIcon ? (
                    <div className="mb-2 text-forest-700"><RoleIcon size={20} /></div>
                  ) : null;
                })()}
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
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
