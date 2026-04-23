import type {
  CommissionRule,
  ValueChain,
} from "../generated/client/index.js";
import type { AuthContext } from "@techorbit/auth-middleware";
import type { CommissionSlot } from "@techorbit/types";

// ─── The visibility contract (from SPRINT_6_PROMPT Task 5) ──────────────────
//
// FULL visibility:
//   - Customer (the placement creator or any user in their company)
//   - Platform Admin
//
// PARTIAL visibility:
//   CRM:
//     see   : customer, candidate, own commission
//     hide  : SRM, MSME, all other commissions
//   SRM:
//     see   : customer, candidate, own commission
//     hide  : CRM, MSME, all other commissions
//   MSME:
//     see   : customer, candidate, SRM (who sourced), own residual
//     hide  : CRM, interviewer fees, platform cut
//   Candidate:
//     see   : customer, own pay rate (W-2) OR MSME (C2C)
//     hide  : CRM, SRM, platform cut, vendor commissions
//   Interviewer:
//     see   : customer, candidate, own fee
//     hide  : every other commission
//
// Implementation: we never leak a user id or commission rule that the
// viewer isn't authorized to see.  When a slot is redacted, the filtered
// VisibleValueChain leaves it null AND the response includes a
// `redactedSlots` array so the UI can render a "Confidential" label
// instead of showing a blank.

export type ViewerRole =
  | { kind: "ADMIN" }
  | { kind: "CUSTOMER_OWNER" }       // the user who created the placement (or ADMIN)
  | { kind: "CRM"; userId: string }
  | { kind: "SRM"; userId: string }
  | { kind: "MSME"; msmeId: string }
  | { kind: "CANDIDATE"; userId: string }
  | { kind: "INTERVIEWER"; userId: string }
  | { kind: "OUTSIDER" };            // authenticated but not on the Value Chain

export type VisibleValueChain = {
  id: string;
  placementId: string;
  customerCompanyId: string | null;
  attributedCrmId: string | null;
  attributedSrmId: string | null;
  attributedMsmeId: string | null;
  candidateId: string | null;
  interviewerIds: string[];
  redactedSlots: CommissionSlot[];
  createdAt: Date;
};

export function resolveViewerRole(
  ctx: AuthContext,
  placementCreatedByUserId: string,
  valueChain: ValueChain,
): ViewerRole {
  if (ctx.roles.includes("ADMIN")) return { kind: "ADMIN" };
  if (ctx.userId === placementCreatedByUserId) return { kind: "CUSTOMER_OWNER" };
  if (ctx.userId === valueChain.candidateId) return { kind: "CANDIDATE", userId: ctx.userId };
  if (valueChain.attributedCrmId && ctx.userId === valueChain.attributedCrmId) {
    return { kind: "CRM", userId: ctx.userId };
  }
  if (valueChain.attributedSrmId && ctx.userId === valueChain.attributedSrmId) {
    return { kind: "SRM", userId: ctx.userId };
  }
  if (valueChain.interviewerIds.includes(ctx.userId)) {
    return { kind: "INTERVIEWER", userId: ctx.userId };
  }
  // MSME visibility is resolved at the service layer by looking up the
  // MSME's primary userId from profile-svc.  If the service determines
  // the caller IS the MSME primary, it passes that explicitly.
  return { kind: "OUTSIDER" };
}

export function filterValueChain(
  valueChain: ValueChain,
  viewer: ViewerRole,
): VisibleValueChain {
  const redacted: CommissionSlot[] = [];

  // Start with all-visible and redact per role.
  let customerCompanyId: string | null = valueChain.customerCompanyId;
  let attributedCrmId = valueChain.attributedCrmId;
  let attributedSrmId = valueChain.attributedSrmId;
  let attributedMsmeId = valueChain.attributedMsmeId;
  let candidateId: string | null = valueChain.candidateId;
  let interviewerIds = valueChain.interviewerIds;

  switch (viewer.kind) {
    case "ADMIN":
    case "CUSTOMER_OWNER":
      // Full visibility, no redactions.
      break;

    case "CRM":
      // CRM sees customer + candidate + own slot.  SRM/MSME hidden.
      if (attributedSrmId) { attributedSrmId = null; redacted.push("SRM"); }
      if (attributedMsmeId) { attributedMsmeId = null; redacted.push("MSME"); }
      if (interviewerIds.length > 0) { interviewerIds = []; redacted.push("INTERVIEWER"); }
      break;

    case "SRM":
      // SRM sees customer + candidate + own slot.  CRM/MSME hidden.
      if (attributedCrmId) { attributedCrmId = null; redacted.push("CRM"); }
      if (attributedMsmeId) { attributedMsmeId = null; redacted.push("MSME"); }
      if (interviewerIds.length > 0) { interviewerIds = []; redacted.push("INTERVIEWER"); }
      break;

    case "MSME":
      // MSME sees customer + candidate + SRM (sourcing lineage).  CRM and
      // interviewer fees hidden.
      if (attributedCrmId) { attributedCrmId = null; redacted.push("CRM"); }
      if (interviewerIds.length > 0) { interviewerIds = []; redacted.push("INTERVIEWER"); }
      break;

    case "CANDIDATE":
      // Candidate sees customer (and in C2C, their MSME).  CRM/SRM hidden.
      if (attributedCrmId) { attributedCrmId = null; redacted.push("CRM"); }
      if (attributedSrmId) { attributedSrmId = null; redacted.push("SRM"); }
      if (interviewerIds.length > 0) { interviewerIds = []; redacted.push("INTERVIEWER"); }
      break;

    case "INTERVIEWER":
      // Interviewer sees customer + candidate + own fee.  All attribution hidden.
      if (attributedCrmId) { attributedCrmId = null; redacted.push("CRM"); }
      if (attributedSrmId) { attributedSrmId = null; redacted.push("SRM"); }
      if (attributedMsmeId) { attributedMsmeId = null; redacted.push("MSME"); }
      // Keep only the caller's own interviewer id in the list.
      if (!interviewerIds.includes(viewer.userId)) {
        interviewerIds = [];
      } else {
        interviewerIds = [viewer.userId];
      }
      break;

    case "OUTSIDER":
      // Shouldn't get here — the service layer should have thrown 403
      // before we reach this filter.  Redact everything just in case.
      customerCompanyId = null;
      candidateId = null;
      attributedCrmId = null;
      attributedSrmId = null;
      attributedMsmeId = null;
      interviewerIds = [];
      redacted.push("CRM", "SRM", "MSME", "INTERVIEWER", "CANDIDATE_W2", "PLATFORM");
      break;
  }

  return {
    id: valueChain.id,
    placementId: valueChain.placementId,
    customerCompanyId,
    attributedCrmId,
    attributedSrmId,
    attributedMsmeId,
    candidateId,
    interviewerIds,
    redactedSlots: Array.from(new Set(redacted)),
    createdAt: valueChain.createdAt,
  };
}

export function filterCommissionRules(
  rules: CommissionRule[],
  viewer: ViewerRole,
): CommissionRule[] {
  // ADMIN and CUSTOMER_OWNER see everything.
  if (viewer.kind === "ADMIN" || viewer.kind === "CUSTOMER_OWNER") return rules;

  return rules.filter((r) => {
    switch (viewer.kind) {
      case "CRM":
        // Own CRM rule only.
        return r.slot === "CRM" && r.beneficiaryUserId === viewer.userId;
      case "SRM":
        return r.slot === "SRM" && r.beneficiaryUserId === viewer.userId;
      case "MSME":
        return r.slot === "MSME" && r.beneficiaryMsmeId === viewer.msmeId;
      case "CANDIDATE":
        // Candidate sees their own pay rate (W-2).  In C2C, no candidate rule.
        return (
          r.slot === "CANDIDATE_W2" &&
          r.beneficiaryUserId === viewer.userId
        );
      case "INTERVIEWER":
        // Only own interviewer rows.
        return (
          r.slot === "INTERVIEWER" &&
          r.beneficiaryUserId === viewer.userId
        );
      case "OUTSIDER":
        return false;
      default:
        return false;
    }
  });
}
