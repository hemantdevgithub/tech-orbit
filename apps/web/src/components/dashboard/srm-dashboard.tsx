"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@techorbit/ui";
import type { SubmissionResponse, CommissionPayoutResponse } from "@techorbit/types";
import { getMatchingClient, getPaymentsClient } from "@/lib/api-client";
import { DashboardHeader, WorkspaceCard, StatStrip } from "./dashboard-shell";
import {
  BriefcaseIcon,
  UsersIcon,
  HandshakeIcon,
  TargetIcon,
  DollarIcon,
  MessageIcon,
} from "@/components/icons";

const STATUS_VARIANTS: Record<string, "mint" | "cream" | "success" | "muted" | "warning"> = {
  SUBMITTED: "mint",
  SCREENING: "cream",
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

export function SrmDashboard() {
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
  const [payouts, setPayouts] = useState<CommissionPayoutResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getMatchingClient().listSubmissions({ submitterRole: "SRM", limit: 100 }).then((r) => r.data).catch(() => []),
      getPaymentsClient().listPayouts({ limit: 100 }).then((r) => r.data).catch(() => []),
    ])
      .then(([subs, po]) => { setSubmissions(subs); setPayouts(po); })
      .finally(() => setLoading(false));
  }, []);

  const { active, placed, pendingComm, earningsMonth, recent } = useMemo(() => {
    const activeStatuses = new Set(["SUBMITTED", "SCREENING", "OFFER"]);
    const a = submissions.filter((s) => activeStatuses.has(s.status)).length;
    const p = submissions.filter((s) => s.status === "PLACED").length;
    const sorted = [...submissions].sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime());
    const now = new Date();
    let pc = 0;
    let em = 0;
    for (const x of payouts) {
      if (x.status === "PENDING" || x.status === "PROCESSING") pc += x.amountUsd;
      if (x.status === "COMPLETED" && x.processedAt && sameMonth(x.processedAt, now)) em += x.amountUsd;
    }
    return { active: a, placed: p, pendingComm: pc, earningsMonth: em, recent: sorted.slice(0, 5) };
  }, [submissions, payouts]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Recruiter Dashboard"
        subtitle="Live view of your submissions, placements and commission pipeline."
        action={
          <Link
            href="/techforce/requirements"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-forest-800 text-cream-100 text-sm font-semibold hover:bg-forest-700 transition-colors"
          >
            <span className="text-base leading-none">+</span> Submit candidate
          </Link>
        }
      />

      {/* Workspace */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-3">Workspace</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <WorkspaceCard icon={<BriefcaseIcon size={18} />} title="Requirements" subtitle="Open opportunities" href="/techforce/requirements" />
          <WorkspaceCard icon={<UsersIcon size={18} />} title="Submissions" subtitle="Candidates in flight" href="/techforce/requirements" />
          <WorkspaceCard icon={<TargetIcon size={18} />} title="Pipeline" subtitle="Status & tracking" href="/techforce/requirements" />
          <WorkspaceCard icon={<HandshakeIcon size={18} />} title="Placements" subtitle="Closed deals" href="/techforce/placements" />
          <WorkspaceCard icon={<DollarIcon size={18} />} title="Commissions" subtitle="Earnings & payouts" href="/techforce/payouts" />
          <WorkspaceCard icon={<MessageIcon size={18} />} title="Messages" subtitle="Inbox & threads" href="/techforce/messages" />
        </div>
      </section>

      {/* Pipeline overview */}
      {!loading && (
        <StatStrip
          title="Pipeline overview"
          stats={[
            { label: "Active submissions", value: active, href: "/techforce/requirements" },
            { label: "Placements closed", value: placed, href: "/techforce/placements" },
            { label: "Pending commissions", value: money(pendingComm), href: "/techforce/payouts" },
            { label: "Earnings this month", value: money(earningsMonth), href: "/techforce/payouts" },
          ]}
        />
      )}

      {/* Recent submissions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400">Recent submissions</p>
          <Link href="/techforce/requirements" className="text-xs text-forest-700 hover:underline">Find requirements →</Link>
        </div>
        <div className="bg-white rounded-xl border border-sage-200 divide-y divide-sage-100">
          {loading ? (
            <p className="px-5 py-4 text-sage-500 text-sm">Loading…</p>
          ) : recent.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="font-medium text-forest-900 text-sm mb-1">No submissions yet</p>
              <Link href="/techforce/requirements" className="text-xs text-forest-700 hover:underline">Browse requirements to submit to →</Link>
            </div>
          ) : (
            recent.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
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
            ))
          )}
        </div>
      </section>
    </div>
  );
}
