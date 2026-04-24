"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type { InvoiceStatus } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getPaymentsClient } from "@/lib/api-client";

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

export default function InvoicesPage() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">Invoices</h1>
          <p className="text-sage-500 text-sm mt-0.5">{rows.length} invoices</p>
        </div>
        {totalUnpaid > 0 && (
          <div className="rounded-lg bg-warning/10 border border-warning/30 px-4 py-2 text-sm">
            <span className="text-sage-600">Unpaid balance: </span>
            <span className="font-semibold text-warning">{money(totalUnpaid)}</span>
          </div>
        )}
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
      ) : (
        <div className="space-y-2">
          {rows.map((inv) => (
            <Link key={inv.id} href={`/invoices/${inv.id}`} className="block">
              <Card className="hover:border-forest-300 transition-colors">
                <CardBody className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-forest-900">
                      {inv.invoiceType === "INTERVIEWER_FEES" ? "Interviewer fees" : "Weekly invoice"} — {money(inv.totalUsd)}
                    </p>
                    <p className="text-xs text-sage-500 mt-0.5">
                      Billing period {new Date(inv.billingPeriodStart).toLocaleDateString()}
                      {inv.dueDate && <> · Due {new Date(inv.dueDate).toLocaleDateString()}</>}
                      {inv.paidAt && <> · Paid {new Date(inv.paidAt).toLocaleDateString()}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[inv.status]}`}>
                      {inv.status}
                    </span>
                    <span className="text-sage-400 text-sm">→</span>
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
