"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type { InvoiceResponse, InvoiceStatus } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";
import { getPaymentsClient } from "@/lib/api-client";
import { Breadcrumbs } from "@/components/breadcrumbs";

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

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [inv, setInv] = useState<InvoiceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    getPaymentsClient()
      .getInvoice(params.id)
      .then(setInv)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [params?.id]);

  const isAdmin = user?.roles?.some((r) => r.roleType === "ADMIN");

  async function markPaid() {
    if (!inv) return;
    setWorking(true);
    try {
      const updated = await getPaymentsClient().markInvoicePaid(inv.id);
      setInv(updated);
      setNotice("Invoice marked paid; payouts are processing.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to mark paid");
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <p className="text-sage-500">Loading…</p>;
  if (error || !inv) return <Card><CardBody className="text-danger">{error ?? "Not found"}</CardBody></Card>;

  const periodLabel = `${new Date(inv.billingPeriodStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${money(inv.totalUsd)}`;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Invoices", href: "/invoices" },
          { label: periodLabel },
        ]}
      />

      <div className="rounded-2xl bg-forest-800 p-6 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 85% 30%, #B2CCBA 0%, transparent 55%)" }} />
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-mint-200 text-xs uppercase tracking-wider mb-1">
              {inv.invoiceType === "INTERVIEWER_FEES" ? "Interviewer fees invoice" : "Weekly hours invoice"}
            </p>
            <h1 className="text-2xl font-bold text-cream-100">{money(inv.totalUsd)}</h1>
            <p className="text-sage-400 text-sm mt-1">
              Billing period starting {new Date(inv.billingPeriodStart).toLocaleDateString()}
              {inv.dueDate && ` · Due ${new Date(inv.dueDate).toLocaleDateString()}`}
            </p>
          </div>
          <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[inv.status]}`}>
            {inv.status}
          </span>
        </div>
      </div>

      {notice && <div className="mb-4 p-3 rounded-lg bg-mint-200 text-forest-900 text-sm">{notice}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
            <CardBody>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-sage-500 uppercase tracking-wider border-b border-surface-border">
                  <tr>
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-right">Hours</th>
                    <th className="pb-2 text-right">Rate</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.lineItems.map((li) => (
                    <tr key={li.id} className="border-b border-surface-border/50">
                      <td className="py-2 text-forest-900">{li.description}</td>
                      <td className="py-2 text-right text-sage-600">{li.hoursWorked ?? "—"}</td>
                      <td className="py-2 text-right text-sage-600">{li.rateUsd !== null ? money(li.rateUsd) : "—"}</td>
                      <td className="py-2 text-right font-medium text-forest-900">{money(li.amountUsd)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} className="py-2 pt-4 text-right text-sage-600">Subtotal</td>
                    <td className="py-2 pt-4 text-right font-medium text-forest-900">{money(inv.subtotalUsd)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-2 text-right text-sage-600">Tax</td>
                    <td className="py-2 text-right text-forest-900">{money(inv.taxUsd)}</td>
                  </tr>
                  <tr className="border-t-2 border-forest-200">
                    <td colSpan={3} className="py-2 pt-3 text-right text-forest-900 font-semibold">Total</td>
                    <td className="py-2 pt-3 text-right font-bold text-forest-900 text-lg">{money(inv.totalUsd)}</td>
                  </tr>
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          {inv.status === "SENT" && (
            <Card>
              <CardHeader><CardTitle>Pay invoice</CardTitle></CardHeader>
              <CardBody>
                {inv.stripeInvoiceId ? (
                  <a href={`https://invoice.stripe.test/mock/${inv.id}`} target="_blank" rel="noreferrer">
                    <Button className="w-full">Open Stripe invoice →</Button>
                  </a>
                ) : (
                  <p className="text-xs text-sage-500">
                    Payment link will appear once the invoice is processed. Pay via ACH or your account manager.
                  </p>
                )}
                {isAdmin && (
                  <Button variant="secondary" size="sm" className="w-full mt-2" onClick={markPaid} disabled={working}>
                    {working ? "Working…" : "Mark paid (admin)"}
                  </Button>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardBody className="text-xs space-y-2">
              <div className="flex items-start gap-2">
                <Badge variant="muted">Generated</Badge>
                <span className="text-sage-600">{new Date(inv.createdAt).toLocaleString()}</span>
              </div>
              {inv.sentAt && (
                <div className="flex items-start gap-2">
                  <Badge variant="mint">Sent</Badge>
                  <span className="text-sage-600">{new Date(inv.sentAt).toLocaleString()}</span>
                </div>
              )}
              {inv.paidAt && (
                <div className="flex items-start gap-2">
                  <Badge variant="success">Paid</Badge>
                  <span className="text-sage-600">{new Date(inv.paidAt).toLocaleString()}</span>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
