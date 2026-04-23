"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { PageHeader, Card, CardBody, CardHeader, CardTitle, Button, Badge } from "@techorbit/ui";
import { isOnboardingComplete } from "@/lib/auth-guards";
import type { RoleType } from "@/lib/auth-guards";
import { useAuth } from "@/lib/auth-hooks";
import { CandidateDashboard } from "@/components/dashboard/candidate-dashboard";
import { MsmeDashboard } from "@/components/dashboard/msme-dashboard";
import { CustomerDashboard } from "@/components/dashboard/customer-dashboard";
import { InterviewerDashboard } from "@/components/dashboard/interviewer-dashboard";

const ROLE_LABELS: Record<RoleType, string> = {
  CUSTOMER: "Customer",
  CANDIDATE: "Candidate",
  CRM: "CRM (Business Developer)",
  SRM: "SRM ( recruiter)",
  MSME: "MSME (Vendor Firm)",
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

const ONBOARDING_ROUTES: Partial<Record<RoleType, string>> = {
  CANDIDATE: "/onboarding/candidate",
  MSME: "/onboarding/msme",
  CUSTOMER: "/onboarding/customer",
  INTERVIEWER: "/onboarding/interviewer",
};

export default function DashboardPage() {
  const router = useRouter();
  const store = useAuthStore();
  const { addRole } = useAuth();
  const user = store.user;
  const [addingRole, setAddingRole] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  const complete = isOnboardingComplete(user);

  async function handleAddRole(role: RoleType) {
    setAddingRole(role);
    setRoleError(null);
    try {
      await addRole(role);
      // Auto-active roles (CUSTOMER, CANDIDATE) redirect to onboarding
      const route = ONBOARDING_ROUTES[role];
      if (route) router.push(route);
    } catch {
      setRoleError("Failed to add role — please try again.");
    } finally {
      setAddingRole(null);
    }
  }

  const activeRoles = user.roles.filter((r) => r.status === "ACTIVE");
  const pendingRoles = user.roles.filter((r) => r.status === "PENDING_VERIFICATION");

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${user.firstName}!`}
        subtitle={
          complete
            ? "Your account is ready. Explore opportunities below."
            : "Complete your onboarding to unlock all features."
        }
      />

      {/* Pending roles alert */}
      {pendingRoles.length > 0 && (
        <Card className="border-sage-300 bg-mint-50">
          <CardBody>
            <CardHeader>
              <CardTitle>Complete your onboarding</CardTitle>
            </CardHeader>
            <p className="text-sage-700 mb-4">
              You have {pendingRoles.length} role{pendingRoles.length > 1 ? "s" : ""} pending verification.
              Complete the steps below to unlock full access.
            </p>
            <div className="flex flex-wrap gap-3">
              {pendingRoles.map((r) => {
                const route = ONBOARDING_ROUTES[r.roleType as RoleType];
                return (
                  <div key={r.id} className="flex items-center gap-2">
                    <Badge variant="success">
                      {ROLE_LABELS[r.roleType as RoleType] ?? r.roleType}
                    </Badge>
                    {route && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => router.push(route)}
                      >
                        Complete profile →
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Active roles */}
      <section>
        <h2 className="text-lg font-semibold text-forest-900 mb-4">Your roles</h2>
        {activeRoles.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-sage-600">No active roles yet.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeRoles.map((r) => (
              <Card key={r.id}>
                <CardBody>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-forest-900">
                      {ROLE_LABELS[r.roleType as RoleType] ?? r.roleType}
                    </h3>
                    <Badge variant="success">Active</Badge>
                  </div>
                  <p className="text-sm text-sage-600 mb-4">
                    {ROLE_DESCRIPTIONS[r.roleType as RoleType]}
                  </p>
                  <Button variant="secondary" size="sm" className="w-full">
                    Open dashboard
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Role-specific dashboards */}
      {activeRoles.some((r) => r.roleType === "CANDIDATE") && (
        <section>
          <h2 className="text-lg font-semibold text-forest-900 mb-4">Candidate workspace</h2>
          <CandidateDashboard />
        </section>
      )}
      {activeRoles.some((r) => r.roleType === "MSME") && (
        <section>
          <h2 className="text-lg font-semibold text-forest-900 mb-4">MSME workspace</h2>
          <MsmeDashboard />
        </section>
      )}
      {activeRoles.some((r) => r.roleType === "CUSTOMER") && (
        <section>
          <h2 className="text-lg font-semibold text-forest-900 mb-4">Customer workspace</h2>
          <CustomerDashboard />
        </section>
      )}
      {activeRoles.some((r) => r.roleType === "INTERVIEWER") && (
        <section>
          <h2 className="text-lg font-semibold text-forest-900 mb-4">Interviewer workspace</h2>
          <InterviewerDashboard />
        </section>
      )}

      {/* Available roles to add */}
      <section>
        <h2 className="text-lg font-semibold text-forest-900 mb-4">Add another role</h2>
        {roleError && (
          <div className="mb-3 p-3 rounded bg-red-50 text-red-800 text-sm">{roleError}</div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {(["CUSTOMER", "CANDIDATE", "CRM", "SRM", "MSME", "INTERVIEWER"] as RoleType[])
            .filter((role) => !user.roles.some((r) => r.roleType === role))
            .map((role) => (
              <Card key={role}>
                <CardBody>
                  <h3 className="font-semibold text-forest-900 mb-1">
                    {ROLE_LABELS[role]}
                  </h3>
                  <p className="text-sm text-sage-600 mb-4">{ROLE_DESCRIPTIONS[role]}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    disabled={addingRole !== null}
                    onClick={() => handleAddRole(role)}
                  >
                    {addingRole === role ? "Adding…" : "Add role"}
                  </Button>
                </CardBody>
              </Card>
            ))}
        </div>
      </section>
    </div>
  );
}
