"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type { PlacementResponse, PlacementStatus } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getPlacementClient } from "@/lib/api-client";
import { ViewToggle, useViewMode } from "@/components/view-toggle";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { useDisplayName } from "@/lib/display-names";
import { useAuthStore } from "@/store/auth.store";

const STATUS_STYLES: Record<PlacementStatus, string> = {
  ACTIVE:          "bg-success/10 text-success border-success/30",
  ENDED_COMPLETED: "bg-surface-soft text-sage-500 border-surface-border",
  ENDED_EARLY:     "bg-warning/10 text-warning border-warning/30",
  SUSPENDED:       "bg-danger/10 text-danger border-danger/20",
};

export default function PlacementsListPage() {
  const [rows, setRows] = useState<PlacementResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useViewMode("placements-view", "list");

  useEffect(() => {
    getPlacementClient()
      .list({ limit: 50 })
      .then((res) => setRows(res.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sage-500">Loading placements…</p>;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/techforce/dashboard" },
          { label: "Placements" },
        ]}
      />
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">My placements</h1>
          <p className="text-sage-500 text-sm mt-0.5">
            {rows.length > 0
              ? `${rows.length} placement${rows.length === 1 ? "" : "s"} you are part of`
              : "Active and past placements you are part of."}
          </p>
        </div>
        {rows.length > 0 && <ViewToggle mode={viewMode} onChange={setViewMode} />}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>
      )}

      {rows.length === 0 ? (
        <Card>
          <CardHeader><CardTitle>No placements yet</CardTitle></CardHeader>
          <CardBody>
            <p className="text-sage-500 text-sm">
              Customers create placements from <strong>OFFER</strong>-status submissions.
            </p>
          </CardBody>
        </Card>
      ) : viewMode === "list" ? (
        <div className="space-y-2">
          {rows.map((p) => <PlacementListRow key={p.id} p={p} />)}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => {
            const weeks = Math.round(
              (new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) /
                (7 * 24 * 60 * 60 * 1000),
            );
            return (
              <Link key={p.id} href={`/techforce/placements/${p.id}`} className="block">
                <Card className="h-full hover:border-forest-300 transition-colors">
                  <CardBody>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <p className="text-xs uppercase tracking-wider text-sage-500 font-semibold">
                        {p.engagementType.replace("_", " ")}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_STYLES[p.status]}`}>
                        {p.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-forest-900">
                      ${p.billRateUsd.toFixed(0)}/hr
                    </p>
                    <p className="text-xs text-sage-500 mt-0.5">{weeks} weeks</p>
                    <div className="mt-4 pt-3 border-t border-sage-100 text-xs text-sage-600">
                      <p>{new Date(p.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      <p className="text-sage-400">→ {new Date(p.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Extracted so we can call useDisplayName per row (hook rule).
function PlacementListRow({ p }: { p: PlacementResponse }) {
  const me = useAuthStore((s) => s.user);
  // For the candidate viewing their own placement, showing their own
  // headline on every row is pointless — use the customer instead.
  const isOwnCandidate = me?.id === p.candidateId;
  const candidateName = useDisplayName(isOwnCandidate ? null : p.candidateId, "candidate");
  const customerName = useDisplayName(p.customerCompanyId, "customerByCompany");
  const counterpart = isOwnCandidate ? customerName : candidateName;

  return (
    <Link href={`/techforce/placements/${p.id}`} className="block">
      <Card className="hover:border-forest-300 transition-colors">
        <CardBody className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-forest-900">
              {p.engagementType.replace("_", " ")} placement · ${p.billRateUsd.toFixed(0)}/hr
            </p>
            <p className="text-xs text-sage-500 mt-0.5">
              {counterpart} · {new Date(p.startDate).toLocaleDateString()} →{" "}
              {new Date(p.endDate).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[p.status]}`}>
              {p.status.replace("_", " ")}
            </span>
            <span className="text-sage-400 text-sm">→</span>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
