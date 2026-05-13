"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge, Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import { useAuthStore } from "@/store/auth.store";
import { UserRatingsPanel } from "@/components/user-ratings-panel";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ROLE_ICON_COMPONENT } from "@/components/icons";

// Maps a role to a deep-link for the role-specific public profile page. Only
// CANDIDATE + CUSTOMER have dedicated pages today; the rest fall back to this
// generic view.
const ROLE_PROFILE_ROUTES: Record<string, (id: string) => string> = {
  CANDIDATE: (id) => `/techforce/candidates/${id}`,
  CUSTOMER: (id) => `/techforce/customers/${id}`,
};

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const { user: me } = useAuthStore();
  const id = params?.id;

  if (!id) return null;

  const isSelf = me?.id === id;
  const selfRoles = isSelf
    ? me.roles.filter((r) => r.status === "ACTIVE").map((r) => r.roleType)
    : [];

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/techforce/dashboard" },
          { label: isSelf ? "Your profile" : "User profile" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold text-forest-900">
          {isSelf ? `${me.firstName} ${me.lastName}` : "User profile"}
        </h1>
        {isSelf && me.email && (
          <p className="text-sage-700 text-sm mt-1">{me.email}</p>
        )}
        <p className="text-sage-500 text-xs mt-1 font-mono">{id}</p>
        {selfRoles.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {selfRoles.map((role) => {
              const RoleIcon = ROLE_ICON_COMPONENT[role];
              return (
                <Badge key={role} variant="mint">
                  <span className="inline-flex items-center gap-1.5">
                    {RoleIcon && <RoleIcon size={11} />}
                    {role}
                  </span>
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {isSelf && selfRoles.some((r) => ROLE_PROFILE_ROUTES[r]) && (
        <Card>
          <CardHeader>
            <CardTitle>Your role profiles</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-sage-700 mb-3">
              These are the public profile pages other users see when they land
              on you via a role context.
            </p>
            <div className="flex flex-wrap gap-2">
              {selfRoles
                .filter((r) => ROLE_PROFILE_ROUTES[r])
                .map((role) => {
                  const route = ROLE_PROFILE_ROUTES[role]!(id);
                  const RoleIcon = ROLE_ICON_COMPONENT[role];
                  return (
                    <Link
                      key={role}
                      href={route}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-forest-300 bg-forest-50 text-forest-800 text-sm hover:bg-forest-100"
                    >
                      {RoleIcon && <RoleIcon size={14} />}
                      <span>View as {role.toLowerCase()}</span>
                      <span className="text-forest-500">→</span>
                    </Link>
                  );
                })}
            </div>
          </CardBody>
        </Card>
      )}

      <UserRatingsPanel userId={id} title="Ratings & reviews" />
    </div>
  );
}
