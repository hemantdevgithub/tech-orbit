"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type { InvoiceStatus } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getPaymentsClient } from "@/lib/api-client";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ViewToggle, useViewMode } from "@/components/view-toggle";
import { ReceiptIcon } from "@/components/icons";

type InvoiceRow = {
  id: string;
  invoiceType: string;
  billingPeriodStart: string;
  totalUsd: number;
  status: InvoiceStatus;
  dueDate: string | null;
  paidAt: string | null;
};

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  DRAFT: "bg-surface-soft text-sage-500 border-surface-border",
  SENT: "bg-warning/10 text-warning border-warning/30",
  PAID: "bg-success/10 text-success border-success/30",
  OVERDUE: "bg-danger/10 text-danger border-danger/20",
  SETTLED: "bg-forest-100 text-forest-700 border-forest-200",
};

function money(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString();
}

export default function InvoicesPage() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useViewMode("invoices-view", "list");

  useEffect(() => {
    getPaymentsClient()
      .listInvoices({ limit: 50 })
      .then((res) => setRows(res.data as unknown as InvoiceRow[]))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const totalUnpaid = rows
    .filter((r) => r.status === "SENT" || r.status === "OVERDUE")
    .reduce((s, r) => s + r.totalUsd, 0);

  if (loading) return <p className="text-sage-500">Loading…</p>;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/techforce/dashboard" },
          { label: "Invoices" },
        ]}
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-forest-900">Invoices</h1>
          <p className="text-sage-500 text-sm mt-0.5">
            {rows.length} invoice{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {totalUnpaid > 0 && (
            <div className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm">
              <span className="text-sage-600">Unpaid: </span>
              <span className="font-semibold text-warning">{money(totalUnpaid)}</span>
            </div>
          )}
          {rows.length > 0 && <ViewToggle mode={view} onChange={setView} />}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>
      )}

      {rows.length === 0 ? (
        <Card>
          <CardHeader><CardTitle>No invoices yet</CardTitle></CardHeader>
          <CardBody>
            <p className="text-sage-500 text-sm">
              Weekly invoices are generated automatically every Monday from your active placements.
            </p>
          </CardBody>
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {rows.map((inv) => (
            <Link
              key={inv.id}
              href={`/techforce/invoices/${inv.id}`}
              className="group block bg-surface rounded-xl border border-surface-border p-5 hover:border-forest-300 hover:shadow-card transition-all motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-mint-300"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="w-10 h-10 rounded-lg bg-forest-100 text-forest-700 flex items-center justify-center shrink-0">
                  <ReceiptIcon size={18} />
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[inv.status]}`}
                >
                  {inv.status}
                </span>
              </div>
              <p className="text-2xl font-bold text-forest-900 mb-1">{money(inv.totalUsd)}</p>
              <p className="text-xs text-sage-500 mb-3">Weekly invoice</p>
              <dl className="space-y-1 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-sage-500">Period</dt>
                  <dd className="text-forest-900 font-medium text-right">
                    {formatDate(inv.billingPeriodStart)}
                  </dd>
                </div>
                {inv.dueDate && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-sage-500">Due</dt>
                    <dd className="text-forest-900 font-medium text-right">{formatDate(inv.dueDate)}</dd>
                  </div>
                )}
                {inv.paidAt && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-sage-500">Paid</dt>
                    <dd className="text-success font-medium text-right">{formatDate(inv.paidAt)}</dd>
                  </div>
                )}
              </dl>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((inv) => (
            <Link
              key={inv.id}
              href={`/techforce/invoices/${inv.id}`}
              className="block focus:outline-none focus:ring-2 focus:ring-mint-300 rounded-xl"
            >
              <Card className="hover:border-forest-300 transition-colors motion-reduce:transition-none">
                <CardBody className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-forest-900">
                      Weekly invoice — {money(inv.totalUsd)}
                    </p>
                    <p className="text-xs text-sage-500 mt-0.5">
                      Period {formatDate(inv.billingPeriodStart)}
                      {inv.dueDate && <> · Due {formatDate(inv.dueDate)}</>}
                      {inv.paidAt && <> · Paid {formatDate(inv.paidAt)}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[inv.status]}`}>
                      {inv.status}
                    </span>
                    <span className="hidden sm:inline text-sage-400 text-sm">→</span>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
