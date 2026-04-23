import { Decimal } from "decimal.js";
import type { CommissionCalc, CommissionSlot } from "@techorbit/types";

// Pure functions — no DB, no side effects.  Given a set of CommissionRules
// (from placement-svc) and an hours total, produce one PayoutDraft per rule.
//
// There are TWO entry points:
//
//   calculateWeeklyPayouts       — scales PERCENT_OF_BILL and RESIDUAL rules
//                                   by hours × billRate.  Skips FLAT_FEE.
//   calculateInterviewerFeePayouts — pays FLAT_FEE rules at their face
//                                    value.  One-time, invoiced when the
//                                    placement is created.

export type CommissionRuleInput = {
  id: string;
  slot: CommissionSlot;
  calculation: CommissionCalc;
  percentOfBillRate: Decimal | null;
  flatFeeUsd: Decimal | null;
  beneficiaryUserId: string | null;
  beneficiaryMsmeId: string | null;
};

export type PayoutDraft = {
  invoiceId: string;
  placementId: string;
  commissionRuleId: string;
  beneficiaryUserId: string | null;
  beneficiaryMsmeId: string | null;
  slot: CommissionSlot;
  amountUsd: Decimal;
};

export type WeeklyPayoutInput = {
  placementId: string;
  invoiceId: string;
  billRateUsd: Decimal;
  totalHoursWorked: Decimal;
  commissionRules: CommissionRuleInput[];
};

export function calculateWeeklyPayouts(
  input: WeeklyPayoutInput,
): PayoutDraft[] {
  const billedRevenue = input.billRateUsd.mul(input.totalHoursWorked);
  const payouts: PayoutDraft[] = [];

  // First pass: PERCENT_OF_BILL.  Track the sum so we can compute residuals.
  let percentTotalDollars = new Decimal(0);
  for (const rule of input.commissionRules) {
    if (rule.calculation !== "PERCENT_OF_BILL") continue;
    if (rule.percentOfBillRate === null) continue; // bad-data defense
    const amount = billedRevenue.mul(rule.percentOfBillRate);
    percentTotalDollars = percentTotalDollars.plus(amount);
    payouts.push(basePayout(input, rule, amount));
  }

  // Second pass: RESIDUAL.  Each residual claims the leftover after all
  // PERCENT_OF_BILL rules.  In v1 there's at most one RESIDUAL per placement
  // (Platform in W-2, MSME in C2C), so "residual - other residuals" is a
  // no-op.  FLAT_FEE rules are explicitly excluded from the weekly cycle.
  for (const rule of input.commissionRules) {
    if (rule.calculation !== "RESIDUAL") continue;
    const amount = billedRevenue.minus(percentTotalDollars);
    payouts.push(basePayout(input, rule, amount));
  }

  return payouts;
}

export type InterviewerFeeInput = {
  placementId: string;
  invoiceId: string;
  commissionRules: CommissionRuleInput[];
};

export function calculateInterviewerFeePayouts(
  input: InterviewerFeeInput,
): PayoutDraft[] {
  const out: PayoutDraft[] = [];
  for (const rule of input.commissionRules) {
    if (rule.slot !== "INTERVIEWER") continue;
    if (rule.calculation !== "FLAT_FEE") continue;
    if (rule.flatFeeUsd === null) continue;
    out.push({
      invoiceId: input.invoiceId,
      placementId: input.placementId,
      commissionRuleId: rule.id,
      beneficiaryUserId: rule.beneficiaryUserId,
      beneficiaryMsmeId: rule.beneficiaryMsmeId,
      slot: rule.slot,
      amountUsd: rule.flatFeeUsd,
    });
  }
  return out;
}

function basePayout(
  input: { placementId: string; invoiceId: string },
  rule: CommissionRuleInput,
  amount: Decimal,
): PayoutDraft {
  return {
    invoiceId: input.invoiceId,
    placementId: input.placementId,
    commissionRuleId: rule.id,
    beneficiaryUserId: rule.beneficiaryUserId,
    beneficiaryMsmeId: rule.beneficiaryMsmeId,
    slot: rule.slot,
    amountUsd: amount,
  };
}
