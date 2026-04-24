"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type {
  CommissionRuleResponse,
  PlacementResponse,
  PlacementStatus,
  ValueChainResponse,
} from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";
import { getPlacementClient } from "@/lib/api-client";
import { ValueChainGraph } from "./value-chain-graph";
import {
  PlatformFeeBreakdown,
  computePlatformBreakdown,
} from "@/components/placement/platform-fee-breakdown";
import { UserRatingsPanel } from "@/components/user-ratings-panel";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<PlacementStatus, string> = {
  ACTIVE:          "bg-success/10 text-success border-success/30",
  ENDED_COMPLETED: "bg-surface-soft text-sage-500 border-surface-border",
  ENDED_EARLY:     "bg-warning/10 text-warning border-warning/30",
  SUSPENDED:       "bg-danger/10 text-danger border-danger/20",
};

const ENGAGEMENT_LABEL: Record<string, string> = {
  W2: "W-2",
  C2C: "C2C",
  IC_1099: "1099",
};

export default function PlacementDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const [placement, setPlacement] = useState<PlacementResponse | null>(null);
  const [valueChain, setValueChain] = useState<ValueChainResponse | null>(null);
  const [rules, setRules] = useState<CommissionRuleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    if (!params?.id) return;
    setLoading(true);
    try {
      const [p, vc, r] = await Promise.all([
        getPlacementClient().getById(params.id),
        getPlacementClient().getValueChain(params.id).catch(() => null),
        getPlacementClient().getCommissions(params.id).catch(() => ({ data: [] })),
      ]);
      setPlacement(p);
      setValueChain(vc);
      setRules(r?.data ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load placement");
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (searchParams?.get("created") === "1") setNotice("Placement created successfully.");
  }, [searchParams]);

  async function onEnd(status: "ENDED_COMPLETED" | "ENDED_EARLY") {
    if (!placement) return;
    const reason = window.prompt(
      status === "ENDED_COMPLETED" ? "Reason for completion?" : "Reason for ending early?",
    );
    if (!reason?.trim()) return;
    setWorking(true);
    try {
      const updated = await getPlacementClient().end(placement.id, {
        reason: reason.trim(),
        status,
      });
      setPlacement(updated);
      setNotice(`Placement ${status === "ENDED_COMPLETED" ? "completed" : "ended early"}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to end placement");
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <p className="text-sage-500">Loading placement…</p>;
  if (error && !placement) return <Card><CardBody className="text-danger">{error}</CardBody></Card>;
  if (!placement) return <p>Not found.</p>;

  const isOwner = user?.id === placement.createdByUserId;
  const canEnd = isOwner && placement.status === "ACTIVE";
  const duration = Math.max(
    1,
    Math.round((new Date(placement.endDate).getTime() - new Date(placement.startDate).getTime()) / 86400_000 / 7),
  );

  return (
    <div>
      {/* Hero header */}
      <div className="rounded-2xl bg-forest-800 p-6 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 85% 30%, #B2CCBA 0%, transparent 55%)" }} />
        <div className="relative z-10">
          <div className="mb-3">
            <Link href="/placements" className="text-sage-400 hover:text-cream-100 text-sm">
              ← All placements
            </Link>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-mint-200 text-xs font-medium uppercase tracking-wider mb-1">
                {ENGAGEMENT_LABEL[placement.engagementType] ?? placement.engagementType} placement
              </p>
              <h1 className="text-2xl font-bold text-cream-100">
                ${placement.billRateUsd.toFixed(0)}/hr ·{" "}
                {Math.round(
                  (new Date(placement.endDate).getTime() -
                    new Date(placement.startDate).getTime()) /
                    (7 * 24 * 60 * 60 * 1000),
                )}{" "}
                weeks
              </h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-sage-400">
                <span>
                  {new Date(placement.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {" → "}
                  {new Date(placement.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                <span>·</span>
                <span>{duration} weeks</span>
              </div>
            </div>
            <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[placement.status]}`}>
              {placement.status.replace("_", " ")}
            </span>
          </div>
        </div>
      </div>

      {notice && (
        <div className="mb-4 p-3 rounded-lg bg-mint-200 text-forest-900 text-sm">{notice}</div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Contract details */}
          <Card>
            <CardHeader><CardTitle>Contract</CardTitle></CardHeader>
            <CardBody>
              <dl className="grid grid-cols-2 gap-y-3 text-sm">
                <dt className="text-sage-500">Engagement type</dt>
                <dd><Badge variant="muted">{ENGAGEMENT_LABEL[placement.engagementType] ?? placement.engagementType}</Badge></dd>
                <dt className="text-sage-500">Bill rate</dt>
                <dd className="font-semibold text-forest-900">${placement.billRateUsd.toFixed(2)}/hr</dd>
                {placement.payRateUsd !== null && (
                  <>
                    <dt className="text-sage-500">Pay rate (W-2)</dt>
                    <dd className="font-semibold text-forest-900">${placement.payRateUsd.toFixed(2)}/hr</dd>
                  </>
                )}
                <dt className="text-sage-500">Start</dt>
                <dd>{new Date(placement.startDate).toLocaleDateString()}</dd>
                <dt className="text-sage-500">End</dt>
                <dd>{new Date(placement.endDate).toLocaleDateString()}</dd>
                {placement.actualEndDate && (
                  <>
                    <dt className="text-sage-500">Actual end</dt>
                    <dd className="text-warning">{new Date(placement.actualEndDate).toLocaleDateString()}</dd>
                  </>
                )}
              </dl>
              {placement.endReason && (
                <div className="mt-4 p-3 rounded-lg bg-surface-soft text-sm">
                  <p className="text-xs text-sage-500 mb-1">End reason</p>
                  <p className="text-forest-900">{placement.endReason}</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Value chain visualization */}
          {valueChain && (
            <Card>
              <CardHeader>
                <CardTitle>Value Chain</CardTitle>
                <p className="text-xs text-sage-500 mt-0.5">
                  Who&apos;s involved in this placement and what they earn.
                </p>
              </CardHeader>
              <CardBody>
                <ValueChainGraph
                  valueChain={valueChain}
                  commissionRules={rules}
                  billRateUsd={placement.billRateUsd}
                  engagementType={placement.engagementType}
                />
              </CardBody>
            </Card>
          )}

          {/* Commission table */}
          {rules.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Commission breakdown</CardTitle></CardHeader>
              <CardBody>
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-sage-500 uppercase tracking-wider border-b border-surface-border">
                    <tr>
                      <th className="pb-2">Slot</th>
                      <th className="pb-2">Calculation</th>
                      <th className="pb-2 text-right">Hourly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((r) => (
                      <tr key={r.id} className="border-b border-surface-border/50">
                        <td className="py-2">
                          <span className="font-medium text-forest-900">{r.slot.replace("_", " ")}</span>
                          {r.notes && <p className="text-xs text-sage-500 mt-0.5">{r.notes}</p>}
                        </td>
                        <td className="py-2 text-sage-600">
                          {r.calculation === "PERCENT_OF_BILL" && r.percentOfBillRate !== null
                            ? `${(r.percentOfBillRate * 100).toFixed(1)}% of bill`
                            : r.calculation === "FLAT_FEE"
                              ? `Flat ${r.flatFeeUsd?.toFixed(2) ?? "—"}`
                              : "Residual"}
                        </td>
                        <td className="py-2 text-right font-medium text-forest-900">
                          {r.projectedHourlyUsd !== null ? `$${r.projectedHourlyUsd.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {(() => {
                  // Render the explicit Platform breakdown only when the viewer
                  // can actually see the Value Chain (customer/admin).  We
                  // know this when valueChain has no redactedSlots.
                  if (!valueChain || valueChain.redactedSlots.length > 0) return null;
                  if (placement.engagementType !== "W2") return null;
                  const breakdown = computePlatformBreakdown({
                    billRateUsd: placement.billRateUsd,
                    crmAttributed: !!valueChain.attributedCrmId,
                    srmAttributed: !!valueChain.attributedSrmId,
                    engagementType: "W2",
                  });
                  if (!breakdown || breakdown.absorbedCrmPct + breakdown.absorbedSrmPct === 0) {
                    return null;
                  }
                  return (
                    <div className="mt-5 pt-4 border-t border-surface-border/50 bg-warning/5 rounded-lg p-4 -mx-2">
                      <p className="text-xs font-semibold text-forest-900 mb-2 flex items-center gap-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-warning/15 text-warning uppercase tracking-wider">
                          Why this platform fee?
                        </span>
                      </p>
                      <PlatformFeeBreakdown b={breakdown} />
                    </div>
                  );
                })()}
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {canEnd && (
            <Card>
              <CardHeader><CardTitle>Manage placement</CardTitle></CardHeader>
              <CardBody className="space-y-2">
                <Button className="w-full" onClick={() => onEnd("ENDED_COMPLETED")} disabled={working}>
                  Mark completed
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => onEnd("ENDED_EARLY")} disabled={working}>
                  End early
                </Button>
              </CardBody>
            </Card>
          )}

          {placement.contractDocumentId && (
            <Card>
              <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
              <CardBody className="space-y-1.5 text-sm">
                <p className="text-sage-600">MSA: <span className="font-mono text-xs">{placement.contractDocumentId.slice(0, 8)}…</span></p>
                {placement.workOrderId && (
                  <p className="text-sage-600">Work Order: <span className="font-mono text-xs">{placement.workOrderId}</span></p>
                )}
                {placement.rtrDocumentId && (
                  <p className="text-sage-600">RTR: <span className="font-mono text-xs">{placement.rtrDocumentId.slice(0, 8)}…</span></p>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Linked</CardTitle></CardHeader>
            <CardBody className="space-y-1.5 text-sm">
              <Link href={`/requirements/${placement.requirementId}`} className="block text-forest-700 hover:underline">
                View requirement →
              </Link>
              <Link href={`/submissions/${placement.submissionId}`} className="block text-forest-700 hover:underline">
                View submission →
              </Link>
            </CardBody>
          </Card>

          {placement.status === "ENDED_COMPLETED" &&
            (user?.id === placement.createdByUserId || user?.id === placement.candidateId) && (
              <Card>
                <CardHeader><CardTitle>Rate this placement</CardTitle></CardHeader>
                <CardBody className="text-sm space-y-2">
                  <p className="text-sage-600">
                    Share how the engagement went. Public on their profile.
                  </p>
                  <Link
                    href={`/placements/${placement.id}/rate`}
                    className="inline-block text-forest-700 font-semibold hover:underline"
                  >
                    Rate {user?.id === placement.createdByUserId ? "candidate" : "customer"} →
                  </Link>
                </CardBody>
              </Card>
            )}
        </div>
      </div>

      {/* Counterparty ratings */}
      {(user?.id === placement.createdByUserId || user?.id === placement.candidateId) && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UserRatingsPanel
            userId={placement.candidateId}
            title={user?.id === placement.candidateId ? "Your ratings" : "Candidate ratings"}
          />
          <UserRatingsPanel
            userId={placement.createdByUserId}
            title={user?.id === placement.createdByUserId ? "Your ratings" : "Customer ratings"}
          />
        </div>
      )}
    </div>
  );
}
