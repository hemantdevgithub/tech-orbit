"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CommissionPayoutResponse, InvoiceListResponse, TimesheetResponse } from "@techorbit/types";
import { getPaymentsClient } from "@/lib/api-client";

function money(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function sameMonth(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return d.getUTCFullYear() === ref.getUTCFullYear() && d.getUTCMonth() === ref.getUTCMonth();
}

type StatCardProps = {
  label: string;
  value: string;
  sub?: string;
  href: string;
  tone?: "default" | "accent" | "warn";
};

function StatCard({ label, value, sub, href, tone = "default" }: StatCardProps) {
  const toneStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
    default: "bg-surface border-surface-border hover:border-forest-300",
    accent: "bg-forest-800 border-forest-800 text-cream-100 hover:shadow-cardHover",
    warn: "bg-warning/10 border-warning/30 hover:border-warning/50",
  };
  const labelColor = tone === "accent" ? "text-mint-200" : "text-sage-500";
  const valueColor = tone === "accent" ? "text-cream-100" : tone === "warn" ? "text-warning" : "text-forest-900";
  const subColor = tone === "accent" ? "text-sage-400" : "text-sage-500";
  return (
    <Link
      href={href}
      className={`block rounded-2xl border p-5 transition-all ${toneStyles[tone]}`}
    >
      <p className={`text-xs uppercase tracking-wider mb-1 ${labelColor}`}>{label}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>}
    </Link>
  );
}

export function CandidateEarningsCards() {
  const [timesheets, setTimesheets] = useState<TimesheetResponse[]>([]);
  const [payouts, setPayouts] = useState<CommissionPayoutResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPaymentsClient().listTimesheets({ limit: 100 }).then((r) => r.data).catch(() => []),
      getPaymentsClient().listPayouts({ limit: 100 }).then((r) => r.data).catch(() => []),
    ])
      .then(([ts, po]) => {
        setTimesheets(ts);
        setPayouts(po);
      })
      .finally(() => setLoading(false));
  }, []);

  const { pendingCount, earningsMonth } = useMemo(() => {
    const now = new Date();
    const pc = timesheets.filter((t) => t.status === "DRAFT" || t.status === "REJECTED").length;
    let em = 0;
    for (const p of payouts) {
      if (p.status === "COMPLETED" && p.processedAt && sameMonth(p.processedAt, now)) em += p.amountUsd;
    }
    return { pendingCount: pc, earningsMonth: em };
  }, [timesheets, payouts]);

  if (loading) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <StatCard
        label="Earnings this month"
        value={money(earningsMonth)}
        sub="Completed payouts"
        href="/techforce/payouts"
        tone="accent"
      />
      <StatCard
        label="Timesheets to submit"
        value={String(pendingCount)}
        sub={pendingCount > 0 ? "Draft or rejected — needs your action" : "You're all caught up"}
        href="/techforce/timesheets"
        tone={pendingCount > 0 ? "warn" : "default"}
      />
    </div>
  );
}

export function CustomerEarningsCards() {
  const [invoices, setInvoices] = useState<InvoiceListResponse["data"]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPaymentsClient().listInvoices({ limit: 100 }).then((r) => r.data).catch(() => []),
      getPaymentsClient().listTimesheets({ status: "SUBMITTED", limit: 100 }).then((r) => r.data).catch(() => []),
    ])
      .then(([inv, ts]) => {
        setInvoices(inv);
        setTimesheets(ts);
      })
      .finally(() => setLoading(false));
  }, []);

  const { unpaid, toApprove } = useMemo(() => {
    const up = invoices
      .filter((i) => i.status === "SENT" || i.status === "OVERDUE")
      .reduce((s, i) => s + i.totalUsd, 0);
    return { unpaid: up, toApprove: timesheets.length };
  }, [invoices, timesheets]);

  if (loading) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <StatCard
        label="Unpaid invoices"
        value={money(unpaid)}
        sub={unpaid > 0 ? "Awaiting payment" : "No balance due"}
        href="/techforce/invoices"
        tone={unpaid > 0 ? "warn" : "default"}
      />
      <StatCard
        label="Timesheets to approve"
        value={String(toApprove)}
        sub={toApprove > 0 ? "Submitted by your candidates" : "Nothing pending"}
        href="/techforce/timesheets"
        tone={toApprove > 0 ? "accent" : "default"}
      />
    </div>
  );
}

// Used by both CRM and SRM dashboards — the backend already scopes
// listPayouts to the authenticated user's beneficiary rows.
export function BrokerEarningsCards() {
  const [payouts, setPayouts] = useState<CommissionPayoutResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPaymentsClient()
      .listPayouts({ limit: 100 })
      .then((r) => setPayouts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { pending, earningsMonth, lifetime } = useMemo(() => {
    const now = new Date();
    let p = 0;
    let em = 0;
    let lt = 0;
    for (const x of payouts) {
      if (x.status === "PENDING" || x.status === "PROCESSING") p += x.amountUsd;
      if (x.status === "COMPLETED") {
        lt += x.amountUsd;
        if (x.processedAt && sameMonth(x.processedAt, now)) em += x.amountUsd;
      }
    }
    return { pending: p, earningsMonth: em, lifetime: lt };
  }, [payouts]);

  if (loading) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <StatCard
        label="Pending commissions"
        value={money(pending)}
        sub="Awaiting invoice payment"
        href="/techforce/payouts"
        tone={pending > 0 ? "warn" : "default"}
      />
      <StatCard
        label="Earnings this month"
        value={money(earningsMonth)}
        sub="Completed payouts"
        href="/techforce/payouts"
        tone="accent"
      />
      <StatCard
        label="Lifetime earnings"
        value={money(lifetime)}
        sub={`${payouts.filter((p) => p.status === "COMPLETED").length} completed payouts`}
        href="/techforce/payouts"
      />
    </div>
  );
}

export function VendorEarningsCards() {
  const [payouts, setPayouts] = useState<CommissionPayoutResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPaymentsClient()
      .listPayouts({ limit: 100 })
      .then((r) => setPayouts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { pending, earningsMonth } = useMemo(() => {
    const now = new Date();
    let p = 0;
    let em = 0;
    for (const x of payouts) {
      if (x.status === "PENDING" || x.status === "PROCESSING") p += x.amountUsd;
      if (x.status === "COMPLETED" && x.processedAt && sameMonth(x.processedAt, now)) em += x.amountUsd;
    }
    return { pending: p, earningsMonth: em };
  }, [payouts]);

  if (loading) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <StatCard
        label="Pending commissions"
        value={money(pending)}
        sub="Awaiting invoice payment"
        href="/techforce/payouts"
        tone="warn"
      />
      <StatCard
        label="Earnings this month"
        value={money(earningsMonth)}
        sub="Completed payouts"
        href="/techforce/payouts"
        tone="accent"
      />
    </div>
  );
}
