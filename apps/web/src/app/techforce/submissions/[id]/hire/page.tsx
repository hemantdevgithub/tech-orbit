"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Input, Label } from "@techorbit/ui";
import type { EngagementType, RequirementResponse, SubmissionResponse } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";
import {
  getMatchingClient,
  getPlacementClient,
  getRequirementClient,
} from "@/lib/api-client";
import {
  CANDIDATE_DEFAULT_PCT,
  CRM_PCT,
  PlatformFeeBreakdown,
  SRM_PCT,
  computePlatformBreakdown,
} from "@/components/placement/platform-fee-breakdown";

type EngType = Exclude<EngagementType, "IC_1099">;

const ENGAGEMENT_LABELS: Record<EngType, { title: string; desc: string }> = {
  W2: {
    title: "W-2 (Platform employee)",
    desc: "Candidate is a Techorbit platform employee. You pay the bill rate; we handle payroll, taxes, and benefits.",
  },
  C2C: {
    title: "C2C (Vendor corp-to-corp)",
    desc: "Candidate is employed by a vendor (MSME). You pay the bill rate; MSME invoices for the residual and handles their employee.",
  },
};

function toLocalDatetime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function HireCandidatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
  const [requirement, setRequirement] = useState<RequirementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [engagementType, setEngagementType] = useState<EngType>("W2");
  const [billRate, setBillRate] = useState("120");
  const [payRate, setPayRate] = useState("90");
  const [startDate, setStartDate] = useState(
    toLocalDatetime(new Date(Date.now() + 14 * 86400_000)),
  );
  const [endDate, setEndDate] = useState(
    toLocalDatetime(new Date(Date.now() + 180 * 86400_000)),
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    (async () => {
      try {
        const sub = await getMatchingClient().getSubmission(params.id);
        setSubmission(sub);
        // Fetch the requirement to know CRM attribution state — the
        // commission preview needs this to show the right platform fee.
        try {
          const req = await getRequirementClient().getById(sub.requirementId);
          setRequirement(req);
        } catch {
          // non-fatal; preview falls back to "not attributed"
        }
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.message : "Failed to load submission");
      } finally {
        setLoading(false);
      }
    })();
  }, [params?.id]);

  const isCustomer = user?.roles?.some((r) => r.roleType === "CUSTOMER");

  const bill = Number(billRate) || 0;
  const pay = Number(payRate) || 0;

  // Resolve attribution context from live data (with null fallbacks so the
  // preview still renders before the network responses land).
  const crmAttributed = !!requirement?.attributedCrmId;
  const srmAttributed = !!submission?.attributedSrmId;

  const candidatePct = engagementType === "W2" && bill > 0
    ? Math.min(pay / bill, CANDIDATE_DEFAULT_PCT + 1)
    : CANDIDATE_DEFAULT_PCT;

  const platformBreakdown = computePlatformBreakdown({
    billRateUsd: bill,
    crmAttributed,
    srmAttributed,
    engagementType,
  });

  // C2C: platform fixed at 12%, MSME gets residual.
  const c2cMsmeResidual = engagementType === "C2C"
    ? bill - (crmAttributed ? bill * CRM_PCT : 0) - (srmAttributed ? bill * SRM_PCT : 0) - bill * 0.12
    : 0;

  const weeklyCost = bill * 40;
  const fullTermWeeks = Math.max(
    1,
    Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400_000 / 7),
  );
  const fullTermCost = weeklyCost * fullTermWeeks;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!submission) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await getPlacementClient().create({
        submissionId: submission.id,
        engagementType,
        billRateUsd: Number(billRate),
        payRateUsd: engagementType === "W2" ? Number(payRate) : undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      router.push(`/techforce/placements/${result.placement.id}?created=1`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Failed to create placement");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sage-500">Loading…</p>;
  if (loadError || !submission) {
    return <Card><CardBody className="text-danger">{loadError ?? "Submission not found"}</CardBody></Card>;
  }
  if (!isCustomer) {
    return <Card><CardBody><p className="text-sage-700">Only customers can create placements.</p></CardBody></Card>;
  }
  if (submission.status !== "OFFER") {
    return (
      <Card>
        <CardBody>
          <p className="text-sage-700 mb-3">
            This submission is in status <Badge variant="muted">{submission.status}</Badge>. Move it to <strong>OFFER</strong> before hiring.
          </p>
          <Link href={`/techforce/submissions/${submission.id}`} className="text-forest-700 hover:underline text-sm">
            ← Back to submission
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <Link href={`/techforce/submissions/${submission.id}`} className="text-sm text-forest-700 hover:underline">
          ← Back to submission
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-forest-900 mb-1">Hire candidate</h1>
      <p className="text-sage-500 text-sm mb-6">
        Candidate: <span className="font-mono text-xs">{submission.candidateId.slice(0, 8)}…</span> · Match score {submission.matchScore ?? "—"}
      </p>

      <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Engagement type */}
          <Card>
            <CardHeader><CardTitle>Engagement type</CardTitle></CardHeader>
            <CardBody className="space-y-2">
              {(["W2", "C2C"] as EngType[]).map((t) => (
                <label
                  key={t}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    engagementType === t
                      ? "border-forest-600 bg-mint-50"
                      : "border-surface-border hover:border-forest-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="engagementType"
                    value={t}
                    checked={engagementType === t}
                    onChange={() => setEngagementType(t)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-forest-900 text-sm">{ENGAGEMENT_LABELS[t].title}</p>
                    <p className="text-xs text-sage-500 mt-0.5">{ENGAGEMENT_LABELS[t].desc}</p>
                  </div>
                </label>
              ))}
            </CardBody>
          </Card>

          {/* Rates */}
          <Card>
            <CardHeader><CardTitle>Rates</CardTitle></CardHeader>
            <CardBody className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="billRate">Bill rate ($/hr)</Label>
                <Input id="billRate" type="number" step="0.01" min="0" max="10000"
                  value={billRate} onChange={(e) => setBillRate(e.target.value)} required disabled={submitting} />
                <p className="text-xs text-sage-500 mt-1">What you pay per hour</p>
              </div>
              {engagementType === "W2" && (
                <div>
                  <Label htmlFor="payRate">Pay rate ($/hr)</Label>
                  <Input id="payRate" type="number" step="0.01" min="0" max="10000"
                    value={payRate} onChange={(e) => setPayRate(e.target.value)} required disabled={submitting} />
                  <p className="text-xs text-sage-500 mt-1">Candidate&apos;s W-2 hourly wage</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader><CardTitle>Engagement dates</CardTitle></CardHeader>
            <CardBody className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" type="datetime-local" value={startDate}
                  onChange={(e) => setStartDate(e.target.value)} required disabled={submitting} />
              </div>
              <div>
                <Label htmlFor="endDate">End date</Label>
                <Input id="endDate" type="datetime-local" value={endDate}
                  onChange={(e) => setEndDate(e.target.value)} required disabled={submitting} />
              </div>
            </CardBody>
          </Card>

          {submitError && (
            <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">
              {submitError}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating placement…" : "Confirm hire"}
            </Button>
            <Link href={`/techforce/submissions/${submission.id}`}>
              <Button type="button" variant="secondary" disabled={submitting}>Cancel</Button>
            </Link>
          </div>
        </div>

        {/* Commission preview sidebar */}
        <div>
          <Card className="sticky top-20">
            <CardHeader><CardTitle>Commission preview</CardTitle></CardHeader>
            <CardBody className="space-y-3 text-sm">
              <p className="text-xs text-sage-500 -mt-1 mb-2">
                Projected hourly breakdown. Final values computed server-side.
              </p>

              {/* CRM */}
              <div className="flex items-center justify-between py-1.5 border-b border-surface-border/50">
                <span className="text-sage-600">CRM {crmAttributed && "(8%)"}</span>
                {crmAttributed ? (
                  <span className="font-medium text-forest-900">
                    ${(bill * CRM_PCT).toFixed(2)}
                  </span>
                ) : (
                  <span className="text-sage-500 italic text-xs">None attributed</span>
                )}
              </div>

              {/* SRM */}
              <div className="flex items-center justify-between py-1.5 border-b border-surface-border/50">
                <span className="text-sage-600">SRM {srmAttributed && "(5%)"}</span>
                {srmAttributed ? (
                  <span className="font-medium text-forest-900">
                    ${(bill * SRM_PCT).toFixed(2)}
                  </span>
                ) : (
                  <span className="text-sage-500 italic text-xs">None attributed</span>
                )}
              </div>

              {/* Candidate / MSME */}
              {engagementType === "W2" ? (
                <div className="flex items-center justify-between py-1.5 border-b border-surface-border/50">
                  <span className="text-sage-600">Candidate (W-2)</span>
                  <span className="font-medium text-forest-900">
                    ${pay.toFixed(2)} · {(candidatePct * 100).toFixed(0)}%
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between py-1.5 border-b border-surface-border/50">
                  <span className="text-sage-600">MSME (residual)</span>
                  <span className="font-medium text-forest-900">
                    ${Math.max(0, c2cMsmeResidual).toFixed(2)}
                  </span>
                </div>
              )}

              {/* Platform with breakdown */}
              <div className="border-b border-surface-border/50 pb-2">
                {platformBreakdown ? (
                  <PlatformFeeBreakdown b={platformBreakdown} />
                ) : (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sage-600">Platform (12%)</span>
                    <span className="font-medium text-forest-900">${(bill * 0.12).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-2 text-base font-semibold">
                <span className="text-forest-900">Bill rate</span>
                <span className="text-forest-900">${bill.toFixed(2)}/hr</span>
              </div>

              {/* Term summary */}
              <div className="mt-3 pt-3 border-t border-surface-border/50 space-y-1 text-xs text-sage-600">
                <div className="flex justify-between">
                  <span>Weekly cost (40hr)</span>
                  <span className="font-medium text-forest-900">${weeklyCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Full-term ({fullTermWeeks}w)</span>
                  <span className="font-medium text-forest-900">${fullTermCost.toLocaleString()}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </form>
    </div>
  );
}
