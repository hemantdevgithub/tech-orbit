"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@techorbit/ui";
import type { BenchEntryResponse, SubmissionResponse, CommissionPayoutResponse } from "@techorbit/types";
import { getProfileClient, getMatchingClient, getPaymentsClient } from "@/lib/api-client";
import { DashboardHeader, WorkspaceCard, StatStrip } from "./dashboard-shell";
import {
  BriefcaseIcon,
  UsersIcon,
  AwardIcon,
  GitBranchIcon,
} from "@/components/icons";

const STATUS_VARIANTS: Record<string, "mint" | "cream" | "success" | "muted" | "warning"> = {
  SUBMITTED: "mint",
  SCREENING: "cream",
  OFFER: "success",
  PLACED: "success",
  REJECTED: "muted",
  WITHDRAWN: "muted",
};

const AVAILABILITY_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  ENGAGED: "Engaged",
  NOTICE_PERIOD: "Notice period",
  UNAVAILABLE: "Unavailable",
};

function money(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function sameMonth(iso: string, ref: Date) {
  const d = new Date(iso);
  return d.getUTCFullYear() === ref.getUTCFullYear() && d.getUTCMonth() === ref.getUTCMonth();
}

export function MsmeDashboard() {
  const [benchEntries, setBenchEntries] = useState<BenchEntryResponse[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
  const [payouts, setPayouts] = useState<CommissionPayoutResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getProfileClient().getBenchEntries().then((r) => r.data).catch(() => []),
      getMatchingClient().listSubmissions({ submitterRole: "MSME", limit: 50 }).then((r) => r.data).catch(() => []),
      getPaymentsClient().listPayouts({ limit: 100 }).then((r) => r.data).catch(() => []),
    ])
      .then(([bench, subs, po]) => { setBenchEntries(bench); setSubmissions(subs); setPayouts(po); })
      .finally(() => setLoading(false));
  }, []);

  const { availableBench, activeSubmissions, pendingComm, earningsMonth, recentSubmissions } = useMemo(() => {
    const avail = benchEntries.filter((e) => e.availability === "AVAILABLE").length;
    const activeStatuses = new Set(["SUBMITTED", "SCREENING", "OFFER"]);
    const active = submissions.filter((s) => activeStatuses.has(s.status)).length;
    const sorted = [...submissions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const now = new Date();
    let pc = 0;
    let em = 0;
    for (const p of payouts) {
      if (p.status === "PENDING" || p.status === "PROCESSING") pc += p.amountUsd;
      if (p.status === "COMPLETED" && p.processedAt && sameMonth(p.processedAt, now)) em += p.amountUsd;
    }
    return { availableBench: avail, activeSubmissions: active, pendingComm: pc, earningsMonth: em, recentSubmissions: sorted.slice(0, 5) };
  }, [benchEntries, submissions, payouts]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Vendor Dashboard"
        subtitle="Live view of your bench, submissions and revenue pipeline."
        action={
          <Link
            href="/techforce/requirements"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-forest-800 text-cream-100 text-sm font-semibold hover:bg-forest-700 transition-colors"
          >
            <span className="text-base leading-none">+</span> Submit consultant
          </Link>
        }
      />

      {/* Workspace */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-3">Workspace</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <WorkspaceCard icon={<BriefcaseIcon size={18} />} title="Portfolio" subtitle="Earnings & projections" href="/techforce/payouts" />
          <WorkspaceCard icon={<BriefcaseIcon size={18} />} title="Opportunity Portal" subtitle="SRM assignments" href="/techforce/opportunity-portal" />
          <WorkspaceCard icon={<GitBranchIcon size={18} />} title="Value Chain" subtitle="Capped earnings" href="/techforce/placements" />
          <WorkspaceCard icon={<UsersIcon size={18} />} title="Team" subtitle="Members and roles" href="/techforce/messages" />
          <WorkspaceCard icon={<AwardIcon size={18} />} title="Perform" subtitle="Levels & calendar" href="/techforce/placements" />
        </div>
      </section>

      {/* Pipeline overview */}
      {!loading && (
        <StatStrip
          title="Pipeline overview"
          stats={[
            { label: "Bench available", value: availableBench },
            { label: "Active submissions", value: activeSubmissions, href: "/techforce/requirements" },
            { label: "Pending revenue", value: money(pendingComm), href: "/techforce/payouts" },
            { label: "Earnings this month", value: money(earningsMonth), href: "/techforce/payouts" },
          ]}
        />
      )}

      {/* Bench roster */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400">Bench roster</p>
        </div>
        <div className="bg-white rounded-xl border border-sage-200">
          {loading ? (
            <p className="px-5 py-4 text-sage-500 text-sm">Loading…</p>
          ) : benchEntries.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="font-medium text-forest-900 text-sm mb-1">No bench entries yet</p>
              <p className="text-xs text-sage-500">Add consultants you have available for placement.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-sage-100">
                    <th className="px-5 py-3 text-xs font-semibold text-sage-500 uppercase tracking-wider">Consultant</th>
                    <th className="px-5 py-3 text-xs font-semibold text-sage-500 uppercase tracking-wider">Availability</th>
                    <th className="px-5 py-3 text-xs font-semibold text-sage-500 uppercase tracking-wider">Rate</th>
                    <th className="px-5 py-3 text-xs font-semibold text-sage-500 uppercase tracking-wider">Skills</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage-100">
                  {benchEntries.map((e) => (
                    <tr key={e.id}>
                      <td className="px-5 py-3 font-mono text-xs text-forest-800">{e.candidateUserId.slice(0, 8)}…</td>
                      <td className="px-5 py-3">
                        <Badge variant={e.availability === "AVAILABLE" ? "success" : "muted"}>
                          {AVAILABILITY_LABELS[e.availability] ?? e.availability}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-sage-700 text-xs">
                        {e.expectedRateMin && e.expectedRateMax ? `$${e.expectedRateMin}–$${e.expectedRateMax}/hr` : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {e.skills.slice(0, 3).map((s) => (
                            <span key={s} className="bg-sage-100 text-forest-700 text-xs px-2 py-0.5 rounded-full">{s}</span>
                          ))}
                          {e.skills.length > 3 && <span className="text-sage-500 text-xs">+{e.skills.length - 3}</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Recent submissions */}
      {recentSubmissions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400">Recent submissions</p>
            <Link href="/techforce/requirements" className="text-xs text-forest-700 hover:underline">View all →</Link>
          </div>
          <div className="bg-white rounded-xl border border-sage-200 divide-y divide-sage-100">
            {recentSubmissions.map((s) => (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 px-4 sm:px-5 py-3 sm:py-3.5">
                <div className="min-w-0">
                  <p className="font-medium text-forest-900 text-sm truncate">
                    Candidate {s.candidateId.slice(0, 8)}… → Req {s.requirementId.slice(0, 8)}…
                  </p>
                  <p className="text-xs text-sage-500 mt-0.5">
                    {new Date(s.createdAt).toLocaleDateString()}
                    {s.matchScore !== null && <> · Match {s.matchScore}</>}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={STATUS_VARIANTS[s.status] ?? "muted"}>{s.status}</Badge>
                  <Link href={`/techforce/submissions/${s.id}`} className="text-xs text-forest-700 hover:underline">View →</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
