import { Decimal } from "decimal.js";
import type { CommissionCalc, CommissionSlot, EngagementType } from "@techorbit/types";

// ─── Tunable weights ─────────────────────────────────────────────────────────
// Centralized here so future sprints can make them per-customer without
// rewriting the calculator.

export const COMMISSION_WEIGHTS = {
  CRM: new Decimal("0.08"),
  SRM: new Decimal("0.05"),
  // In C2C, platform is locked at 12% and MSME absorbs the rest.
  // In W-2, platform is RESIDUAL — takes whatever the bill rate has left
  // after CRM/SRM/candidate shares.  Unfilled attribution slots flow to
  // platform automatically (see Sprint 6 scenario 3 resolution).
  PLATFORM_C2C: new Decimal("0.12"),
  CANDIDATE_W2_DEFAULT: new Decimal("0.75"),
} as const;

// ─── Input / output shapes ───────────────────────────────────────────────────

export type InterviewerFee = {
  interviewId: string;
  interviewerUserId: string;
  feeUsd: Decimal;
};

// Sprint 12 — co-owning CRM. Each owner gets `share` of the CRM commission
// slot (where share is 0..1 and sums to 1.0 across owners). When `crmOwners`
// is present and non-empty, it takes precedence over `attributedCrmId`.
export type CrmOwnerInput = {
  crmUserId: string;
  share: Decimal;
};

export type CommissionInput = {
  engagementType: EngagementType;
  billRateUsd: Decimal;
  payRateUsd: Decimal | null;
  attributedCrmId: string | null;
  // Sprint 12 — present when the requirement has co-owning CRMs.
  crmOwners?: CrmOwnerInput[];
  attributedSrmId: string | null;
  attributedMsmeId: string | null;
  candidateId: string;
  interviewerFees: InterviewerFee[];
};

export type CommissionRuleDraft = {
  slot: CommissionSlot;
  beneficiaryUserId: string | null;
  beneficiaryMsmeId: string | null;
  calculation: CommissionCalc;
  percentOfBillRate: Decimal | null;
  flatFeeUsd: Decimal | null;
  interviewId: string | null;
  notes: string;
};

// ─── Pure calculator ─────────────────────────────────────────────────────────

export function calculateCommissionRules(
  input: CommissionInput,
): CommissionRuleDraft[] {
  if (input.engagementType === "IC_1099") {
    throw new Error("1099 engagement type is not supported in Sprint 6");
  }
  if (input.engagementType === "C2C" && !input.attributedMsmeId) {
    throw new Error("C2C placement requires attributedMsmeId");
  }
  if (
    input.engagementType === "W2" &&
    input.payRateUsd !== null &&
    input.payRateUsd.gte(input.billRateUsd)
  ) {
    throw new Error("W-2 payRateUsd must be less than billRateUsd");
  }

  const rules: CommissionRuleDraft[] = [];

  // Sprint 12 — multi-CRM co-ownership takes precedence over the legacy
  // single-CRM attributedCrmId path. Each co-owner gets `8% * their_share`
  // of the bill rate; their_share sums to 1.0, so aggregate CRM cost stays
  // at the existing 8% weight (residual math unchanged below).
  const owners = input.crmOwners ?? [];
  if (owners.length > 0) {
    for (const owner of owners) {
      rules.push({
        slot: "CRM",
        beneficiaryUserId: owner.crmUserId,
        beneficiaryMsmeId: null,
        calculation: "PERCENT_OF_BILL",
        percentOfBillRate: COMMISSION_WEIGHTS.CRM.mul(owner.share),
        flatFeeUsd: null,
        interviewId: null,
        notes:
          owners.length === 1
            ? "CRM attribution commission (8% of bill rate)"
            : `CRM co-ownership commission (8% × ${owner.share.toFixed(4)} share of ${owners.length} co-owners)`,
      });
    }
  } else if (input.attributedCrmId) {
    rules.push({
      slot: "CRM",
      beneficiaryUserId: input.attributedCrmId,
      beneficiaryMsmeId: null,
      calculation: "PERCENT_OF_BILL",
      percentOfBillRate: COMMISSION_WEIGHTS.CRM,
      flatFeeUsd: null,
      interviewId: null,
      notes: "CRM attribution commission (8% of bill rate)",
    });
  }

  if (input.attributedSrmId) {
    rules.push({
      slot: "SRM",
      beneficiaryUserId: input.attributedSrmId,
      beneficiaryMsmeId: null,
      calculation: "PERCENT_OF_BILL",
      percentOfBillRate: COMMISSION_WEIGHTS.SRM,
      flatFeeUsd: null,
      interviewId: null,
      notes: "SRM sourcing commission (5% of bill rate)",
    });
  }

  for (const fee of input.interviewerFees) {
    rules.push({
      slot: "INTERVIEWER",
      beneficiaryUserId: fee.interviewerUserId,
      beneficiaryMsmeId: null,
      calculation: "FLAT_FEE",
      percentOfBillRate: null,
      flatFeeUsd: fee.feeUsd,
      interviewId: fee.interviewId,
      notes: "Flat fee per conducted interview",
    });
  }

  if (input.engagementType === "W2") {
    // Candidate share: pay rate / bill rate, or default 75% when payRate absent.
    const candidateShare = input.payRateUsd
      ? input.payRateUsd.div(input.billRateUsd)
      : COMMISSION_WEIGHTS.CANDIDATE_W2_DEFAULT;

    // Fixed shares check: candidate + CRM + SRM must be <= 1.0, or there's
    // nothing left for the platform.  We don't cap platform's residual at
    // 0 silently — that would hide a bad deal.
    // Sprint 12 — co-owning CRMs share the same 8% weight in aggregate,
    // so the cap math is unchanged whether there's one CRM or N.
    const hasCrm = owners.length > 0 || input.attributedCrmId !== null;
    const crmShare = hasCrm ? COMMISSION_WEIGHTS.CRM : new Decimal(0);
    const srmShare = input.attributedSrmId ? COMMISSION_WEIGHTS.SRM : new Decimal(0);
    const fixedTotal = candidateShare.plus(crmShare).plus(srmShare);
    if (fixedTotal.gte(1)) {
      throw new Error(
        `Commission shares exceed 100% of bill rate: candidate ${candidateShare.toFixed(4)} + CRM ${crmShare.toFixed(4)} + SRM ${srmShare.toFixed(4)} = ${fixedTotal.toFixed(4)}`,
      );
    }

    rules.push({
      slot: "CANDIDATE_W2",
      beneficiaryUserId: input.candidateId,
      beneficiaryMsmeId: null,
      calculation: "PERCENT_OF_BILL",
      percentOfBillRate: candidateShare,
      flatFeeUsd: null,
      interviewId: null,
      notes: input.payRateUsd
        ? "W-2 pay rate as percent of bill rate"
        : "W-2 pay rate (default 75%)",
    });

    // Platform = RESIDUAL (absorbs unfilled CRM/SRM slots)
    rules.push({
      slot: "PLATFORM",
      beneficiaryUserId: null,
      beneficiaryMsmeId: null,
      calculation: "RESIDUAL",
      percentOfBillRate: null,
      flatFeeUsd: null,
      interviewId: null,
      notes: "Platform residual — covers payroll taxes, benefits, overhead, and absorbs unfilled attribution slots",
    });
  } else if (input.engagementType === "C2C") {
    // MSME residual, platform fixed at 12%
    rules.push({
      slot: "MSME",
      beneficiaryUserId: null,
      beneficiaryMsmeId: input.attributedMsmeId,
      calculation: "RESIDUAL",
      percentOfBillRate: null,
      flatFeeUsd: null,
      interviewId: null,
      notes: "C2C vendor residual — MSME receives bill rate minus CRM/SRM/Platform cuts and pays the candidate",
    });

    rules.push({
      slot: "PLATFORM",
      beneficiaryUserId: null,
      beneficiaryMsmeId: null,
      calculation: "PERCENT_OF_BILL",
      percentOfBillRate: COMMISSION_WEIGHTS.PLATFORM_C2C,
      flatFeeUsd: null,
      interviewId: null,
      notes: "Platform fee (12% of bill rate) — MSME takes residual",
    });
  }

  return rules;
}

// ─── Projection helper ──────────────────────────────────────────────────────
// Given a rule + the full input, returns the hourly dollar amount.  For
// FLAT_FEE rules this returns the flat fee itself (it's a one-time amount,
// but the UI often displays it alongside hourly values).

export function projectHourly(
  rule: CommissionRuleDraft,
  input: CommissionInput,
): Decimal {
  switch (rule.calculation) {
    case "PERCENT_OF_BILL":
      return input.billRateUsd.mul(rule.percentOfBillRate!);
    case "FLAT_FEE":
      return rule.flatFeeUsd!;
    case "RESIDUAL":
      // The residual slot gets whatever's left over after every other
      // PERCENT_OF_BILL slot takes its share.  We walk all rules we
      // generated and subtract from bill rate.
      // NOTE: intentionally ignores FLAT_FEE (interviewer fees) because
      // those are one-time charges that don't reduce hourly rate.
      return computeResidual(rule.slot, input);
    default:
      throw new Error(`Unknown calculation: ${rule.calculation}`);
  }
}

function computeResidual(
  slot: CommissionSlot,
  input: CommissionInput,
): Decimal {
  const allRules = calculateCommissionRules(input);
  let remaining = input.billRateUsd;
  for (const r of allRules) {
    if (r.slot === slot) continue; // skip self
    if (r.calculation === "PERCENT_OF_BILL" && r.percentOfBillRate) {
      remaining = remaining.minus(input.billRateUsd.mul(r.percentOfBillRate));
    }
    // Other RESIDUAL rules: in C2C MSME is residual; platform is
    // PERCENT_OF_BILL so no recursion risk.  In W-2 platform is residual
    // and no other RESIDUAL exists.  This means at most one RESIDUAL per
    // placement in v1.
  }
  return remaining;
}
