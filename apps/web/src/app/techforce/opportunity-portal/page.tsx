"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardBody } from "@techorbit/ui";
import type { RequirementResponse } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";
import { getRequirementClient } from "@/lib/api-client";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ArrowRightIcon } from "@/components/icons";

type Tab = "available" | "owned" | "assigned";

// Sprint 12 — Opportunity Portal: role-aware entry point for CRMs and SRMs.
// CRM: Available (unowned OPEN requirements) + Owned (where they're a
//      co-owner). Accept buttons on Available; Assign-SRM picker on Owned.
// SRM: Assigned (requirements a CRM has assigned to them).
export default function OpportunityPortalPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const roles = (user?.roles ?? [])
    .filter((r) => r.status === "ACTIVE")
    .map((r) => r.roleType);
  const isCrm = roles.includes("CRM");
  const isSrm = roles.includes("SRM");
  const isAdmin = roles.includes("ADMIN");

  const defaultTab: Tab = isCrm ? "available" : isSrm ? "assigned" : "available";
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [available, setAvailable] = useState<RequirementResponse[]>([]);
  const [owned, setOwned] = useState<RequirementResponse[]>([]);
  const [assigned, setAssigned] = useState<RequirementResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const client = getRequirementClient();
    try {
      const [a, o, s] = await Promise.all([
        isCrm || isAdmin
          ? client.list({ available: true, limit: 50 })
          : Promise.resolve({ data: [], nextCursor: null, hasMore: false }),
        isCrm || isAdmin
          ? client.list({ ownedByCrmId: user.id, limit: 50 })
          : Promise.resolve({ data: [], nextCursor: null, hasMore: false }),
        isSrm || isAdmin
          ? client.list({ assignedSrmId: user.id, limit: 50 })
          : Promise.resolve({ data: [], nextCursor: null, hasMore: false }),
      ]);
      setAvailable(a.data);
      setOwned(o.data);
      setAssigned(s.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [user, isCrm, isSrm, isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  async function accept(id: string) {
    setWorking(id);
    setError(null);
    try {
      await getRequirementClient().acceptByCrm(id);
      setNotice("Accepted — this requirement is now in your owned list.");
      await load();
      setTab("owned");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to accept");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/techforce/dashboard" },
          { label: "Opportunity Portal" },
        ]}
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-forest-900">
            Opportunity Portal
          </h1>
          <p className="text-sage-500 text-sm mt-0.5">
            {isCrm ? "Accept open requirements and assign SRMs to source." : null}
            {isSrm && !isCrm ? "Requirements a CRM has assigned to you." : null}
            {!isCrm && !isSrm && !isAdmin
              ? "Opportunity Portal is for CRMs and SRMs."
              : null}
          </p>
        </div>
      </div>

      {notice && (
        <div className="mb-4 p-3 rounded-lg bg-mint-200 text-forest-900 text-sm">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">
          {error}
        </div>
      )}

      <div className="mb-4 flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {(isCrm || isAdmin) && (
          <TabButton
            active={tab === "available"}
            onClick={() => setTab("available")}
            label="Available"
            count={available.length}
          />
        )}
        {(isCrm || isAdmin) && (
          <TabButton
            active={tab === "owned"}
            onClick={() => setTab("owned")}
            label="Owned by me"
            count={owned.length}
          />
        )}
        {(isSrm || isAdmin) && (
          <TabButton
            active={tab === "assigned"}
            onClick={() => setTab("assigned")}
            label="Assigned to me"
            count={assigned.length}
          />
        )}
      </div>

      {loading ? (
        <p className="text-sage-500">Loading…</p>
      ) : tab === "available" ? (
        <AvailableList
          items={available}
          onAccept={accept}
          working={working}
        />
      ) : tab === "owned" ? (
        <OwnedList items={owned} reload={load} />
      ) : (
        <AssignedList items={assigned} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        active
          ? "bg-forest-800 text-cream-100 border-forest-800"
          : "bg-surface text-sage-600 border-surface-border hover:border-forest-300"
      }`}
    >
      {label} ({count})
    </button>
  );
}

// ─── Tab bodies ─────────────────────────────────────────────────────────────

function AvailableList({
  items,
  onAccept,
  working,
}: {
  items: RequirementResponse[];
  onAccept: (id: string) => void;
  working: string | null;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="text-sage-500 text-sm">
            No unowned requirements right now. When customers post jobs, they
            land here for any CRM to accept.
          </p>
        </CardBody>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((r) => (
        <Card key={r.id} className="hover:border-forest-300 transition-colors motion-reduce:transition-none">
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-forest-900 text-sm truncate">
                {r.title}
              </p>
              <p className="text-xs text-sage-500 mt-0.5">
                {r.seniority} · {r.locationType} · ${r.billRateMinUsd}–${r.billRateMaxUsd}/hr ·{" "}
                {r.techStack.slice(0, 3).join(", ")}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/techforce/requirements/${r.id}`}
                className="text-xs text-forest-700 hover:underline"
              >
                View →
              </Link>
              <Button
                size="sm"
                onClick={() => onAccept(r.id)}
                disabled={working === r.id}
              >
                {working === r.id ? "Accepting…" : "Accept"}
              </Button>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function OwnedList({
  items,
  reload,
}: {
  items: RequirementResponse[];
  reload: () => void | Promise<void>;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="text-sage-500 text-sm">
            You don't own any requirements yet. Accept one from the Available
            tab to claim it and assign an SRM.
          </p>
        </CardBody>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((r) => (
        <OwnedRow key={r.id} requirement={r} onChanged={reload} />
      ))}
    </div>
  );
}

function OwnedRow({
  requirement,
  onChanged,
}: {
  requirement: RequirementResponse;
  onChanged: () => void | Promise<void>;
}) {
  const [srmInput, setSrmInput] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const owners = requirement.crmOwners ?? [];
  const userId = useAuthStore((s) => s.user?.id);
  const mine = owners.find((o) => o.crmUserId === userId);

  async function assign() {
    const trimmed = srmInput.trim();
    if (!trimmed) return;
    setWorking(true);
    setError(null);
    try {
      await getRequirementClient().assignSrm(requirement.id, { srmUserId: trimmed });
      setSrmInput("");
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to assign");
    } finally {
      setWorking(false);
    }
  }

  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <Link
              href={`/techforce/requirements/${requirement.id}`}
              className="font-semibold text-forest-900 text-sm hover:text-forest-700 truncate block"
            >
              {requirement.title}
            </Link>
            <p className="text-xs text-sage-500 mt-0.5">
              {requirement.seniority} · {requirement.locationType} · {owners.length} co-owner{owners.length === 1 ? "" : "s"}
              {mine?.isPrimary && " · Primary"}
              {mine && ` · Your share ${Math.round(mine.commissionShare * 100)}%`}
            </p>
          </div>
          {requirement.assignedSrmId ? (
            <Badge variant="success">SRM assigned</Badge>
          ) : (
            <Badge variant="warning">No SRM yet</Badge>
          )}
        </div>
        {!requirement.assignedSrmId && (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={srmInput}
              onChange={(e) => setSrmInput(e.target.value)}
              placeholder="SRM user ID (UUID)"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-surface-border bg-surface focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm font-mono"
            />
            <Button onClick={assign} disabled={working || !srmInput.trim()}>
              {working ? "Assigning…" : "Assign SRM"}
            </Button>
          </div>
        )}
        {error && (
          <p className="text-danger text-xs">{error}</p>
        )}
      </CardBody>
    </Card>
  );
}

function AssignedList({ items }: { items: RequirementResponse[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="text-sage-500 text-sm">
            No assignments yet. CRMs will surface requirements to you here.
          </p>
        </CardBody>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((r) => (
        <Card key={r.id} className="hover:border-forest-300 transition-colors motion-reduce:transition-none">
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-forest-900 text-sm truncate">
                {r.title}
              </p>
              <p className="text-xs text-sage-500 mt-0.5">
                {r.seniority} · {r.locationType} · ${r.billRateMinUsd}–${r.billRateMaxUsd}/hr
              </p>
            </div>
            <Link
              href={`/techforce/requirements/${r.id}`}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-forest-800 text-cream-100 text-xs font-semibold hover:bg-forest-700 transition-colors motion-reduce:transition-none"
            >
              Invite candidates <ArrowRightIcon size={14} />
            </Link>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
