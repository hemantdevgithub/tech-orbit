"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type { CommissionPayoutResponse, PayoutStatus } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getPaymentsClient } from "@/lib/api-client";
import { Breadcrumbs } from "@/components/breadcrumbs";

const STATUS_STYLES: Record<PayoutStatus, string> = {
  PENDING: "bg-warning/10 text-warning border-warning/30",
  PROCESSING: "bg-mint-200 text-forest-700 border-forest-200",
  COMPLETED: "bg-success/10 text-success border-success/30",
  FAILED: "bg-danger/10 text-danger border-danger/20",
  SETTLED: "bg-forest-100 text-forest-700 border-forest-200",
};

function money(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function sameMonth(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return d.getUTCFullYear() === ref.getUTCFullYear() && d.getUTCMonth() === ref.getUTCMonth();
}

export default function PayoutsPage() {
  const [rows, setRows] = useState<CommissionPayoutResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PayoutStatus | "ALL">("ALL");

  useEffect(() => {
    getPaymentsClient()
      .listPayouts({ limit: 100 })
      .then((res) => setRows(res.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const now = new Date();
    let pending = 0;
    let thisMonth = 0;
    let lifetime = 0;
    for (const p of rows) {
      if (p.status === "PENDING" || p.status === "PROCESSING") pending += p.amountUsd;
      if (p.status === "COMPLETED") {
        lifetime += p.amountUsd;
        if (p.processedAt && sameMonth(p.processedAt, now)) thisMonth += p.amountUsd;
      }
    }
    return { pending, thisMonth, lifetime };
  }, [rows]);

  const filtered = filter === "ALL" ? rows : rows.filter((r) => r.status === filter);

  if (loading) return <p className="text-sage-500">Loading…</p>;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Payouts" },
        ]}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-forest-900">Payouts</h1>
        <p className="text-sage-500 text-sm mt-0.5">Your commission earnings</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl bg-forest-800 p-5 text-cream-100 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 85% 30%, #B2CCBA 0%, transparent 55%)" }} />
          <div className="relative z-10">
            <p className="text-mint-200 text-xs uppercase tracking-wider mb-1">Pending</p>
            <p className="text-3xl font-bold">{money(summary.pending)}</p>
            <p className="text-sage-400 text-xs mt-1">Awaiting invoice payment</p>
          </div>
        </div>
        <Card>
          <CardBody>
            <p className="text-sage-500 text-xs uppercase tracking-wider mb-1">This month</p>
            <p className="text-3xl font-bold text-forest-900">{money(summary.thisMonth)}</p>
            <p className="text-sage-500 text-xs mt-1">Completed payouts</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sage-500 text-xs uppercase tracking-wider mb-1">Lifetime</p>
            <p className="text-3xl font-bold text-forest-900">{money(summary.lifetime)}</p>
            <p className="text-sage-500 text-xs mt-1">Total earned to date</p>
          </CardBody>
        </Card>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["ALL", "PENDING", "PROCESSING", "COMPLETED", "FAILED", "SETTLED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filter === s
                ? "bg-forest-800 text-cream-100 border-forest-800"
                : "bg-surface-elevated text-sage-600 border-surface-border hover:border-forest-300"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardHeader><CardTitle>No payouts yet</CardTitle></CardHeader>
          <CardBody>
            <p className="text-sage-500 text-sm">
              Commission payouts appear here after invoices are paid. Pending earnings become payable once the customer
              settles the weekly invoice.
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-sage-500 uppercase tracking-wider border-b border-surface-border">
                <tr>
                  <th className="px-4 py-3">Slot</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Processed</th>
                  <th className="px-4 py-3">Reference</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-surface-border/50 last:border-0">
                    <td className="px-4 py-3 text-forest-900 font-medium">{p.slot.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-right font-semibold text-forest-900">{money(p.amountUsd)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sage-600 text-xs">
                      {p.processedAt ? new Date(p.processedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-sage-500 text-xs font-mono">
                      {p.stripeTransferId ?? p.gustoPayrollId ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
