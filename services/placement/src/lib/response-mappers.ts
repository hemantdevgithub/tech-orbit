import { Decimal } from "@prisma/client/runtime/library";
import type {
  CommissionRule,
  Placement,
} from "../generated/client/index.js";
import type {
  CommissionRuleResponse,
  PlacementResponse,
  ValueChainResponse,
} from "@techorbit/types";
import type { VisibleValueChain } from "./value-chain-filter.js";

function decToNumber(d: Decimal | number | null | undefined): number | null {
  if (d === null || d === undefined) return null;
  return d instanceof Decimal ? Number(d.toFixed(2)) : Number(d);
}

function percentToNumber(d: Decimal | number | null | undefined): number | null {
  if (d === null || d === undefined) return null;
  return d instanceof Decimal ? Number(d.toFixed(4)) : Number(d);
}

export function toPlacementResponse(p: Placement): PlacementResponse {
  return {
    id: p.id,
    requirementId: p.requirementId,
    submissionId: p.submissionId,
    candidateId: p.candidateId,
    customerCompanyId: p.customerCompanyId,
    createdByUserId: p.createdByUserId,
    engagementType: p.engagementType,
    billRateUsd: decToNumber(p.billRateUsd)!,
    payRateUsd: decToNumber(p.payRateUsd),
    startDate: p.startDate.toISOString(),
    endDate: p.endDate.toISOString(),
    actualEndDate: p.actualEndDate?.toISOString() ?? null,
    status: p.status,
    endReason: p.endReason,
    contractDocumentId: p.contractDocumentId,
    workOrderId: p.workOrderId,
    rtrDocumentId: p.rtrDocumentId,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function toValueChainResponse(v: VisibleValueChain): ValueChainResponse {
  return {
    id: v.id,
    placementId: v.placementId,
    customerCompanyId: v.customerCompanyId,
    attributedCrmId: v.attributedCrmId,
    attributedSrmId: v.attributedSrmId,
    attributedMsmeId: v.attributedMsmeId,
    candidateId: v.candidateId,
    interviewerIds: v.interviewerIds,
    redactedSlots: v.redactedSlots,
    createdAt: v.createdAt.toISOString(),
  };
}

// Projects the hourly/flat dollar amount for a rule, given the placement
// bill rate.  For RESIDUAL, the caller needs to supply the full rule set
// so we can compute "bill rate minus all PERCENT_OF_BILL siblings".
function projectHourlyDollars(
  rule: CommissionRule,
  billRateUsd: number,
  allRules: CommissionRule[],
): number | null {
  if (rule.calculation === "FLAT_FEE") {
    return decToNumber(rule.flatFeeUsd);
  }
  if (rule.calculation === "PERCENT_OF_BILL" && rule.percentOfBillRate) {
    const pct = percentToNumber(rule.percentOfBillRate) ?? 0;
    return Math.round(billRateUsd * pct * 100) / 100;
  }
  if (rule.calculation === "RESIDUAL") {
    let remaining = billRateUsd;
    for (const r of allRules) {
      if (r.id === rule.id) continue;
      if (r.calculation === "PERCENT_OF_BILL" && r.percentOfBillRate) {
        const pct = percentToNumber(r.percentOfBillRate) ?? 0;
        remaining -= billRateUsd * pct;
      }
      // FLAT_FEE is one-time, not subtracted from hourly.
    }
    return Math.round(remaining * 100) / 100;
  }
  return null;
}

export function toCommissionRuleResponse(
  rule: CommissionRule,
  placementBillRate: number,
  allRulesForPlacement: CommissionRule[],
): CommissionRuleResponse {
  return {
    id: rule.id,
    placementId: rule.placementId,
    slot: rule.slot,
    beneficiaryUserId: rule.beneficiaryUserId,
    beneficiaryMsmeId: rule.beneficiaryMsmeId,
    calculation: rule.calculation,
    percentOfBillRate: percentToNumber(rule.percentOfBillRate),
    flatFeeUsd: decToNumber(rule.flatFeeUsd),
    projectedHourlyUsd: projectHourlyDollars(rule, placementBillRate, allRulesForPlacement),
    notes: rule.notes,
    interviewId: rule.interviewId,
    createdAt: rule.createdAt.toISOString(),
  };
}
