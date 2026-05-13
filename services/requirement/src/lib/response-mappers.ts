import type { RequirementResponse } from "@techorbit/types";
import type {
  CrmAttributionRequest,
  Requirement,
} from "../generated/client/index.js";
import type { AuthContext } from "@techorbit/auth-middleware";
import { requirementAuth } from "../repositories/requirement.repository.js";

// Blind-posting rule: when blindPosting=true and the viewer is not the owner,
// not the attributed CRM, and not an admin, redact customerCompanyId and
// createdByUserId. Everything else (title, description, etc.) stays visible.
export function toRequirementResponse(
  ctx: AuthContext,
  req: Requirement,
): RequirementResponse {
  const { isOwner, isAttributedCrm, hasAdminRole } = requirementAuth;
  const canSeeIdentity =
    !req.blindPosting || isOwner(ctx, req) || isAttributedCrm(ctx, req) || hasAdminRole(ctx);

  return {
    id: req.id,
    customerCompanyId: canSeeIdentity ? req.customerCompanyId : null,
    createdByUserId: canSeeIdentity ? req.createdByUserId : null,
    attributedCrmId: req.attributedCrmId,
    title: req.title,
    description: req.description,
    techStack: req.techStack,
    seniority: req.seniority,
    locationType: req.locationType,
    locationCity: req.locationCity,
    locationState: req.locationState,
    billRateMinUsd: Number(req.billRateMinUsd),
    billRateMaxUsd: Number(req.billRateMaxUsd),
    durationWeeks: req.durationWeeks,
    startDate: req.startDate.toISOString(),
    openings: req.openings,
    workAuthPrefs: req.workAuthPrefs,
    requiredInterviews: req.requiredInterviews,
    blindPosting: req.blindPosting,
    status: req.status,
    publishedAt: req.publishedAt ? req.publishedAt.toISOString() : null,
    closedAt: req.closedAt ? req.closedAt.toISOString() : null,
    closedReason: req.closedReason,
    createdAt: req.createdAt.toISOString(),
    updatedAt: req.updatedAt.toISOString(),
  };
}

export function toCrmAttributionResponse(record: CrmAttributionRequest): {
  id: string;
  requirementId: string;
  customerCompanyId: string;
  crmUserId: string;
  status: CrmAttributionRequest["status"];
  approvedAt: string | null;
  approvedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  createdAt: string;
} {
  return {
    id: record.id,
    requirementId: record.requirementId,
    customerCompanyId: record.customerCompanyId,
    crmUserId: record.crmUserId,
    status: record.status,
    approvedAt: record.approvedAt ? record.approvedAt.toISOString() : null,
    approvedBy: record.approvedBy,
    rejectedAt: record.rejectedAt ? record.rejectedAt.toISOString() : null,
    rejectedBy: record.rejectedBy,
    createdAt: record.createdAt.toISOString(),
  };
}
