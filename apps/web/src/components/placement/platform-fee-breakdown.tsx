"use client";

// Shared visual for the platform-fee absorption rule.
// Used in two places:
//   1. /submissions/[id]/hire sidebar — live preview before placement creation
//   2. /placements/[id] — read-only on the created placement detail
//
// Rules (W-2 only — in C2C platform is fixed at 12% and MSME absorbs residual):
//   Candidate  = 75% (or payRate/billRate)
//   CRM        = 8% if attributed, else absorbed by platform
//   SRM        = 5% if attributed, else absorbed by platform
//   Platform   = 12% base + unfilled slots
// Invariant: sum to 100% of bill rate.

export const BASE_PLATFORM_PCT = 0.12;
export const CRM_PCT = 0.08;
export const SRM_PCT = 0.05;
export const CANDIDATE_DEFAULT_PCT = 0.75;

export type PlatformBreakdown = {
  billRateUsd: number;
  basePct: number;        // always 0.12
  absorbedCrmPct: number; // 0.08 or 0
  absorbedSrmPct: number; // 0.05 or 0
  totalPlatformPct: number; // sum of the above
  totalPlatformHourly: number;
};

export function computePlatformBreakdown(opts: {
  billRateUsd: number;
  crmAttributed: boolean;
  srmAttributed: boolean;
  engagementType: "W2" | "C2C";
}): PlatformBreakdown | null {
  // In C2C the platform is fixed at 12% — no absorption.  Return null so
  // the caller can just render the plain fee row.
  if (opts.engagementType === "C2C") return null;

  const absorbedCrmPct = opts.crmAttributed ? 0 : CRM_PCT;
  const absorbedSrmPct = opts.srmAttributed ? 0 : SRM_PCT;
  const totalPct = BASE_PLATFORM_PCT + absorbedCrmPct + absorbedSrmPct;
  return {
    billRateUsd: opts.billRateUsd,
    basePct: BASE_PLATFORM_PCT,
    absorbedCrmPct,
    absorbedSrmPct,
    totalPlatformPct: totalPct,
    totalPlatformHourly: opts.billRateUsd * totalPct,
  };
}

function formatPct(pct: number): string {
  return `${(pct * 100).toFixed(pct * 100 < 10 ? 1 : 0)}%`.replace(".0%", "%");
}

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function PlatformFeeBreakdown({ b }: { b: PlatformBreakdown }) {
  const hasAbsorption = b.absorbedCrmPct > 0 || b.absorbedSrmPct > 0;

  return (
    <div>
      <div className="flex items-center justify-between py-1.5">
        <div>
          <span className="text-sage-600">Platform</span>
          {hasAbsorption && (
            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-warning/15 text-warning uppercase tracking-wider">
              +absorbed
            </span>
          )}
        </div>
        <span className="font-semibold text-forest-900">
          {formatUsd(b.totalPlatformHourly)} · {formatPct(b.totalPlatformPct)}
        </span>
      </div>
      {hasAbsorption && (
        <div className="ml-3 pl-3 border-l-2 border-warning/30 mt-1 space-y-1 text-xs text-sage-600">
          <div className="flex items-center justify-between">
            <span>Base platform fee</span>
            <span>
              {formatUsd(b.billRateUsd * b.basePct)} · {formatPct(b.basePct)}
            </span>
          </div>
          {b.absorbedCrmPct > 0 && (
            <div className="flex items-center justify-between">
              <span>Unattributed CRM slot</span>
              <span className="text-warning font-medium">
                +{formatUsd(b.billRateUsd * b.absorbedCrmPct)} · +{formatPct(b.absorbedCrmPct)}
              </span>
            </div>
          )}
          {b.absorbedSrmPct > 0 && (
            <div className="flex items-center justify-between">
              <span>Unattributed SRM slot</span>
              <span className="text-warning font-medium">
                +{formatUsd(b.billRateUsd * b.absorbedSrmPct)} · +{formatPct(b.absorbedSrmPct)}
              </span>
            </div>
          )}
          <p className="text-[11px] text-sage-500 italic pt-1">
            The platform absorbs commissions for unattributed roles. Every dollar of bill rate is still accounted for — this keeps the split transparent.
          </p>
        </div>
      )}
    </div>
  );
}
