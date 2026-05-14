"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@techorbit/ui";
import type { RequirementResponse, InvoiceListResponse, TimesheetResponse } from "@techorbit/types";
import { getRequirementClient, getPaymentsClient } from "@/lib/api-client";
import { DashboardHeader, WorkspaceCard, StatStrip } from "./dashboard-shell";
import {
  BriefcaseIcon,
  ClockIcon,
  HandshakeIcon,
  ReceiptIcon,
} from "@/components/icons";

const STATUS_VARIANTS: Record<string, "mint" | "cream" | "success" | "muted" | "warning"> = {
  DRAFT: "cream",
  OPEN: "success",
  OFFER_EXTENDED: "mint",
  PLACED: "success",
  CLOSED: "muted",
  CANCELLED: "muted",
};

function money(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function CustomerDashboard() {
  const [requirements, setRequirements] = useState<RequirementResponse[]>([]);
  const [invoices, setInvoices] = useState<InvoiceListResponse["data"]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getRequirementClient().list({ limit: 100 }).then((r) => r.data).catch(() => []),
      getPaymentsClient().listInvoices({ limit: 100 }).then((r) => r.data).catch(() => []),
      getPaymentsClient().listTimesheets({ status: "SUBMITTED", limit: 100 }).then((r) => r.data).catch(() => []),
    ])
      .then(([reqs, inv, ts]) => { setRequirements(reqs); setInvoices(inv); setTimesheets(ts); })
      .finally(() => setLoading(false));
  }, []);

  const { openCount, unpaidAmt, toApproveCount } = useMemo(() => {
    const open = requirements.filter((r) => r.status === "OPEN").length;
    const unpaid = invoices
      .filter((i) => i.status === "SENT" || i.status === "OVERDUE")
      .reduce((s, i) => s + i.totalUsd, 0);
    return { openCount: open, unpaidAmt: unpaid, toApproveCount: timesheets.length };
  }, [requirements, invoices, timesheets]);

  const recent = requirements.slice(0, 5);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Customer Dashboard"
        subtitle="Live view of your requirements and consultant pipeline."
        action={
          <Link
            href="/techforce/requirements/new"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-forest-800 text-cream-100 text-sm font-semibold hover:bg-forest-700 transition-colors"
          >
            <span className="text-base leading-none">+</span> Post requirement
          </Link>
        }
      />

      {/* Workspace */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-3">Workspace</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <WorkspaceCard icon={<BriefcaseIcon size={18} />} title="Post Requirement" subtitle="Create a listing" href="/techforce/requirements/new" />
          <WorkspaceCard icon={<BriefcaseIcon size={18} />} title="Requirements" subtitle="Active listings" href="/techforce/requirements" />
          <WorkspaceCard icon={<HandshakeIcon size={18} />} title="Placements" subtitle="Active consultants" href="/techforce/placements" />
          <WorkspaceCard icon={<ReceiptIcon size={18} />} title="Invoices" subtitle="Billing & payments" href="/techforce/invoices" />
          <WorkspaceCard icon={<ClockIcon size={18} />} title="Timesheets" subtitle="Approve hours" href="/techforce/timesheets" />
        </div>
      </section>

      {/* Pipeline overview */}
      {!loading && (
        <StatStrip
          title="Pipeline overview"
          stats={[
            { label: "Open requirements", value: openCount, href: "/techforce/requirements" },
            { label: "Timesheets to approve", value: toApproveCount, href: "/techforce/timesheets" },
            { label: "Unpaid invoices", value: money(unpaidAmt), href: "/techforce/invoices" },
          ]}
        />
      )}

      {/* Recent requirements */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400">Recent requirements</p>
          {requirements.length > 0 && (
            <Link href="/techforce/requirements" className="text-xs text-forest-700 hover:underline">View all →</Link>
          )}
        </div>
        <div className="bg-white rounded-xl border border-sage-200 divide-y divide-sage-100">
          {loading ? (
            <p className="px-5 py-4 text-sage-500 text-sm">Loading…</p>
          ) : recent.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="font-medium text-forest-900 text-sm mb-1">No requirements yet</p>
              <Link href="/techforce/requirements/new" className="text-xs text-forest-700 hover:underline">Post your first one →</Link>
            </div>
          ) : (
            recent.map((r) => (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 px-4 sm:px-5 py-3 sm:py-3.5">
                <div className="min-w-0">
                  <p className="font-medium text-forest-900 text-sm truncate">{r.title}</p>
                  <p className="text-xs text-sage-500 mt-0.5">{r.seniority} · {r.locationType} · ${r.billRateMinUsd}–${r.billRateMaxUsd}/hr</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={STATUS_VARIANTS[r.status] ?? "muted"}>{r.status}</Badge>
                  <Link href={`/techforce/requirements/${r.id}`} className="text-xs text-forest-700 hover:underline">View →</Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
