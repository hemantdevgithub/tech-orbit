"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/lib/auth-hooks";

const ROLE_DESCRIPTIONS: Record<string, string> = {
  CUSTOMER: "Post IT requirements and hire consultants.",
  CANDIDATE: "Browse opportunities and apply to requirements.",
  CRM: "Identify and engage with client companies.",
  SRM: "Source and submit qualified candidates.",
  MSME: "Deploy benched consultants to requirements.",
  ADMIN: "Manage the platform, approve applications, resolve disputes.",
};

const ONBOARDING_ROUTES: Record<string, string> = {
  CUSTOMER: "/onboarding/customer",
  CANDIDATE: "/onboarding/candidate",
  MSME: "/onboarding/msme",
};

const ADDABLE_ROLES = ["CUSTOMER", "CANDIDATE", "CRM", "SRM", "MSME"] as const;

export default function ProfileSettingsPage() {
  const { user } = useAuthStore();
  const { addRole, fetchMe } = useAuth();
  const [addingRole, setAddingRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!user) void fetchMe();
  }, [user, fetchMe]);

  if (!user) return null;

  const activeRoles = user.roles?.filter((r) => r.status === "ACTIVE") ?? [];
  const pendingRoles = user.roles?.filter((r) => r.status === "PENDING_VERIFICATION") ?? [];
  const currentRoleTypes = new Set(user.roles?.map((r) => r.roleType) ?? []);
  const availableToAdd = ADDABLE_ROLES.filter((r) => !currentRoleTypes.has(r));
  const isCandidate = currentRoleTypes.has("CANDIDATE");

  async function onAddRole(role: string) {
    setAddingRole(role);
    setError(null);
    setNotice(null);
    try {
      await addRole(role);
      setNotice(`Added ${role} role. Complete onboarding to activate.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add role");
    } finally {
      setAddingRole(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-forest-900">Profile</h1>
        <p className="text-sage-500 text-sm mt-0.5">
          Your account, roles, and role-specific profiles.
        </p>
      </div>

      {notice && <div className="p-3 rounded-lg bg-mint-200 text-forest-900 text-sm">{notice}</div>}
      {error && <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>}

      {/* Identity card */}
      <Card>
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardBody className="space-y-3 text-sm">
          <Row label="Name" value={`${user.firstName} ${user.lastName}`.trim() || "—"} />
          <Row label="Email" value={user.email} />
          <Row label="Email verified" value={user.emailVerified ? "Yes" : "No"} />
          <Row label="2FA" value={user.has2FA ? "Enabled" : "Not set up"} />
          <Row label="User ID" value={<code className="font-mono text-xs">{user.id}</code>} />
          <div className="pt-2 border-t border-surface-border flex flex-wrap gap-2">
            <Link href="/forgot-password" className="text-sm text-forest-700 hover:underline">
              Change password
            </Link>
          </div>
        </CardBody>
      </Card>

      {/* Active roles */}
      <Card>
        <CardHeader><CardTitle>Roles</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          {activeRoles.length === 0 && pendingRoles.length === 0 ? (
            <p className="text-sage-500 text-sm">You don&apos;t have any roles yet. Add one below to get started.</p>
          ) : (
            <>
              {activeRoles.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-forest-900">{r.roleType}</span>
                      <Badge variant="success">ACTIVE</Badge>
                    </div>
                    <p className="text-xs text-sage-600 mt-1">{ROLE_DESCRIPTIONS[r.roleType] ?? ""}</p>
                  </div>
                  {ONBOARDING_ROUTES[r.roleType] && (
                    <Link href={ONBOARDING_ROUTES[r.roleType]!} className="text-xs text-forest-700 hover:underline shrink-0 mt-1">
                      Edit profile →
                    </Link>
                  )}
                </div>
              ))}
              {pendingRoles.map((r) => {
                const route = ONBOARDING_ROUTES[r.roleType];
                return (
                  <div key={r.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-warning/5 border border-warning/20">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-forest-900">{r.roleType}</span>
                        <Badge variant="warning">PENDING VERIFICATION</Badge>
                      </div>
                      <p className="text-xs text-sage-600 mt-1">
                        Complete your profile to activate this role.
                      </p>
                    </div>
                    {route && (
                      <Link href={route} className="text-xs text-forest-700 hover:underline shrink-0 mt-1 font-semibold">
                        Complete onboarding →
                      </Link>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </CardBody>
      </Card>

      {/* Candidate-only: showcase featured interviews on public profile */}
      {isCandidate && (
        <Card>
          <CardHeader><CardTitle>Featured interviews</CardTitle></CardHeader>
          <CardBody>
            <p className="text-sm text-sage-600 mb-3">
              Pick up to 6 of your completed interview recordings to showcase
              on your public profile.
            </p>
            <Link
              href="/settings/featured-interviews"
              className="text-sm text-forest-700 hover:underline"
            >
              Manage featured interviews →
            </Link>
          </CardBody>
        </Card>
      )}

      {/* Add role */}
      {availableToAdd.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Add another role</CardTitle></CardHeader>
          <CardBody>
            <p className="text-sm text-sage-600 mb-3">
              Techorbit supports multi-role accounts. Add a role to use another side of the marketplace.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableToAdd.map((role) => (
                <div key={role} className="rounded-xl border border-surface-border p-4 hover:border-forest-300 transition-colors">
                  <p className="text-sm font-semibold text-forest-900">{role}</p>
                  <p className="text-xs text-sage-600 mt-1 mb-3">{ROLE_DESCRIPTIONS[role]}</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onAddRole(role)}
                    disabled={addingRole !== null}
                    className="w-full"
                  >
                    {addingRole === role ? "Adding…" : "Add role"}
                  </Button>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <dt className="text-sage-500 text-xs uppercase tracking-wider font-semibold">{label}</dt>
      <dd className="col-span-2 text-forest-900">{value}</dd>
    </div>
  );
}
