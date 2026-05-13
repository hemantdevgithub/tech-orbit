"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { RequirementResponse, CrmAttributionRequestResponse, CommissionPayoutResponse } from "@techorbit/types";
import { getRequirementClient, getPaymentsClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";
import { DashboardHeader, WorkspaceCard, StatStrip } from "./dashboard-shell";
import {
  HandshakeIcon,
  BriefcaseIcon,
  UsersIcon,
  TargetIcon,
  DollarIcon,
  MessageIcon,
} from "@/components/icons";

function money(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function sameMonth(iso: string, ref: Date) {
  const d = new Date(iso);
  return d.getUTCFullYear() === ref.getUTCFullYear() && d.getUTCMonth() === ref.getUTCMonth();
}

export function CrmDashboard() {
  const me = useAuthStore((s) => s.user);
  const [attributedReqs, setAttributedReqs] = useState<RequirementResponse[]>([]);
  const [pendingAttributions, setPendingAttributions] = useState<CrmAttributionRequestResponse[]>([]);
  const [payouts, setPayouts] = useState<CommissionPayoutResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me) return;
    Promise.all([
      getRequirementClient().list({ attributedCrmId: me.id, limit: 100 }).then((r) => r.data).catch(() => []),
      getRequirementClient().listPendingAttributions().then((r) => r.data).catch(() => []),
      getPaymentsClient().listPayouts({ limit: 100 }).then((r) => r.data).catch(() => []),
    ])
      .then(([reqs, attrs, po]) => { setAttributedReqs(reqs); setPendingAttributions(attrs); setPayouts(po); })
      .finally(() => setLoading(false));
  }, [me]);

  const { openReqs, pendingComm, earningsMonth } = useMemo(() => {
    const open = attributedReqs.filter((r) => r.status === "OPEN" || r.status === "DRAFT").length;
    const now = new Date();
    let pc = 0;
    let em = 0;
    for (const p of payouts) {
      if (p.status === "PENDING" || p.status === "PROCESSING") pc += p.amountUsd;
      if (p.status === "COMPLETED" && p.processedAt && sameMonth(p.processedAt, now)) em += p.amountUsd;
    }
    return { openReqs: open, pendingComm: pc, earningsMonth: em };
  }, [attributedReqs, payouts]);

  const recentAttributions = pendingAttributions.slice(0, 5);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="CRM Dashboard"
        subtitle="Live view of your attributions, pipeline and commission earnings."
        action={
          <Link
            href="/requirements"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-forest-800 text-cream-100 text-sm font-semibold hover:bg-forest-700 transition-colors"
          >
            <span className="text-base leading-none">+</span> Claim requirement
          </Link>
        }
      />

      {/* Workspace */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-3">Workspace</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <WorkspaceCard icon={<HandshakeIcon size={18} />} title="Claim Requirement" subtitle="Attribute a client" href="/requirements" />
          <WorkspaceCard icon={<BriefcaseIcon size={18} />} title="Requirements" subtitle="Your attributed jobs" href="/requirements" />
          <WorkspaceCard icon={<UsersIcon size={18} />} title="Submissions" subtitle="Candidate pipeline" href="/requirements" />
          <WorkspaceCard icon={<TargetIcon size={18} />} title="Placements" subtitle="Closed deals" href="/placements" />
          <WorkspaceCard icon={<DollarIcon size={18} />} title="Commissions" subtitle="Earnings & payouts" href="/payouts" />
          <WorkspaceCard icon={<MessageIcon size={18} />} title="Messages" subtitle="Inbox & threads" href="/messages" />
        </div>
      </section>

      {/* Pipeline overview */}
      {!loading && (
        <StatStrip
          title="Pipeline overview"
          stats={[
            { label: "Attributed requirements", value: openReqs, href: "/requirements" },
            { label: "Pending attributions", value: pendingAttributions.length, href: "/requirements" },
            { label: "Pending commissions", value: money(pendingComm), href: "/payouts" },
            { label: "Earnings this month", value: money(earningsMonth), href: "/payouts" },
          ]}
        />
      )}

      {/* Recent attribution requests */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400">Attribution requests</p>
          <Link href="/requirements" className="text-xs text-forest-700 hover:underline">View all →</Link>
        </div>
        <div className="bg-white rounded-xl border border-sage-200 divide-y divide-sage-100">
          {loading ? (
            <p className="px-5 py-4 text-sage-500 text-sm">Loading…</p>
          ) : recentAttributions.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="font-medium text-forest-900 text-sm mb-1">No pending attributions</p>
              <Link href="/requirements" className="text-xs text-forest-700 hover:underline">Browse requirements to claim →</Link>
            </div>
          ) : (
            recentAttributions.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="font-medium text-forest-900 text-sm">Requirement {a.requirementId.slice(0, 8)}…</p>
                  <p className="text-xs text-sage-500 mt-0.5">
                    Status: <span className="font-medium text-forest-800">{a.status}</span>
                    {a.createdAt && <> · {new Date(a.createdAt).toLocaleDateString()}</>}
                  </p>
                </div>
                <Link href={`/requirements/${a.requirementId}`} className="text-xs text-forest-700 hover:underline shrink-0">View →</Link>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
