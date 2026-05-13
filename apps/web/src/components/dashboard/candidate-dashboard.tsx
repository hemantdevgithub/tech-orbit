"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@techorbit/ui";
import type { SubmissionResponse, CommissionPayoutResponse, TimesheetResponse } from "@techorbit/types";
import { getMatchingClient, getPaymentsClient, getProfileClient } from "@/lib/api-client";
import { DashboardHeader, WorkspaceCard, StatStrip } from "./dashboard-shell";
import {
  SearchIcon,
  TargetIcon,
  CalendarIcon,
  ClockIcon,
  DollarIcon,
  HandshakeIcon,
} from "@/components/icons";

const STATUS_VARIANTS: Record<string, "mint" | "cream" | "success" | "muted" | "warning"> = {
  SUBMITTED: "mint",
  SCREENING: "cream",
  INTERVIEWING: "warning",
  OFFER: "success",
  PLACED: "success",
  REJECTED: "muted",
  WITHDRAWN: "muted",
};

function money(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function sameMonth(iso: string, ref: Date) {
  const d = new Date(iso);
  return d.getUTCFullYear() === ref.getUTCFullYear() && d.getUTCMonth() === ref.getUTCMonth();
}

export function CandidateDashboard() {
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
  const [payouts, setPayouts] = useState<CommissionPayoutResponse[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetResponse[]>([]);
  const [isAvailable, setIsAvailable] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getMatchingClient().listSubmissions({ limit: 50 }).then((r) => r.data).catch(() => []),
      getPaymentsClient().listPayouts({ limit: 100 }).then((r) => r.data).catch(() => []),
      getPaymentsClient().listTimesheets({ limit: 100 }).then((r) => r.data).catch(() => []),
    ])
      .then(([subs, po, ts]) => { setSubmissions(subs); setPayouts(po); setTimesheets(ts); })
      .finally(() => setLoading(false));
  }, []);

  const { activeCount, earningsMonth, pendingTimesheets, recent } = useMemo(() => {
    const activeStatuses = new Set(["SUBMITTED", "SCREENING", "INTERVIEWING", "OFFER"]);
    const active = submissions.filter((s) => activeStatuses.has(s.status)).length;
    const now = new Date();
    let em = 0;
    for (const p of payouts) {
      if (p.status === "COMPLETED" && p.processedAt && sameMonth(p.processedAt, now)) em += p.amountUsd;
    }
    const pending = timesheets.filter((t) => t.status === "DRAFT" || t.status === "REJECTED").length;
    const sorted = [...submissions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { activeCount: active, earningsMonth: em, pendingTimesheets: pending, recent: sorted.slice(0, 5) };
  }, [submissions, payouts, timesheets]);

  async function toggleAvailability() {
    setToggling(true);
    try {
      const today = new Date().toISOString();
      await getProfileClient().updateCandidateProfile({ availableFrom: isAvailable ? null : today });
      setIsAvailable(!isAvailable);
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Candidate Dashboard"
        subtitle="Live view of your opportunities, submissions and professional pipeline."
        action={
          <button
            onClick={toggleAvailability}
            disabled={toggling}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              isAvailable
                ? "bg-success text-white hover:bg-emerald-600"
                : "bg-forest-800 text-cream-100 hover:bg-forest-700"
            }`}
          >
            {isAvailable ? "✓ Available" : "Set available"}
          </button>
        }
      />

      {/* Workspace */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-3">Workspace</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <WorkspaceCard icon={<SearchIcon size={18} />} title="Browse Jobs" subtitle="Open requirements" href="/techforce/requirements" />
          <WorkspaceCard icon={<TargetIcon size={18} />} title="Submissions" subtitle="Track your bids" href="/techforce/requirements" />
          <WorkspaceCard icon={<CalendarIcon size={18} />} title="Interviews" subtitle="Scheduled sessions" href="/techforce/interviews" />
          <WorkspaceCard icon={<HandshakeIcon size={18} />} title="My Placement" subtitle="Active engagement" href="/techforce/placements" />
          <WorkspaceCard icon={<ClockIcon size={18} />} title="Timesheets" subtitle="Log your hours" href="/techforce/timesheets" />
          <WorkspaceCard icon={<DollarIcon size={18} />} title="Payouts" subtitle="Earnings & history" href="/techforce/payouts" />
        </div>
      </section>

      {/* Pipeline overview */}
      {!loading && (
        <StatStrip
          title="Pipeline overview"
          stats={[
            { label: "Active submissions", value: activeCount, href: "/techforce/requirements" },
            { label: "Timesheets pending", value: pendingTimesheets, href: "/techforce/timesheets" },
            { label: "Earnings this month", value: money(earningsMonth), href: "/techforce/payouts" },
          ]}
        />
      )}

      {/* Recent submissions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400">Recent submissions</p>
          <Link href="/techforce/requirements" className="text-xs text-forest-700 hover:underline">Browse more →</Link>
        </div>
        <div className="bg-white rounded-xl border border-sage-200 divide-y divide-sage-100">
          {loading ? (
            <p className="px-5 py-4 text-sage-500 text-sm">Loading…</p>
          ) : recent.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="font-medium text-forest-900 text-sm mb-1">No submissions yet</p>
              <Link href="/techforce/requirements" className="text-xs text-forest-700 hover:underline">Browse open requirements →</Link>
            </div>
          ) : (
            recent.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="font-medium text-forest-900 text-sm truncate">
                    Requirement {s.requirementId.slice(0, 8)}…
                  </p>
                  <p className="text-xs text-sage-500 mt-0.5">
                    {new Date(s.createdAt).toLocaleDateString()}
                    {s.matchScore !== null && <> · Match score {s.matchScore}</>}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={STATUS_VARIANTS[s.status] ?? "muted"}>{s.status}</Badge>
                  <Link href={`/techforce/submissions/${s.id}`} className="text-xs text-forest-700 hover:underline">View →</Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
