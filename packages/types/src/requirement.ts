import { z } from "zod";
import {
  CrmAttributionStatus,
  LocationType,
  RequirementStatus,
  Seniority,
  WorkAuthStatus,
} from "./enums.js";

// ─── Request schemas ─────────────────────────────────────────────────────────

// Location fields are validated together so onsite/hybrid require a city.
const BaseRequirementFieldsSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  techStack: z.array(z.string().min(1)).min(1).max(20),
  seniority: Seniority,
  locationType: LocationType,
  locationCity: z.string().min(1).max(100).optional().nullable(),
  locationState: z.string().min(2).max(2).optional().nullable(),
  billRateMinUsd: z.number().positive().max(10_000),
  billRateMaxUsd: z.number().positive().max(10_000),
  durationWeeks: z.number().int().positive().max(260),
  startDate: z.string().datetime(),
  openings: z.number().int().positive().max(100).default(1),
  workAuthPrefs: z.array(WorkAuthStatus).default([]),
  requiredInterviews: z.number().int().min(1).max(4).default(2),
  blindPosting: z.boolean().default(false),
});

// customerCompanyId is NOT in the request body — the server derives it from
// the caller's CustomerCompanyProfile.id via profile-svc.
export const CreateRequirementSchema = BaseRequirementFieldsSchema.refine(
  (data) => data.billRateMaxUsd >= data.billRateMinUsd,
  { message: "billRateMaxUsd must be >= billRateMinUsd", path: ["billRateMaxUsd"] },
);
export type CreateRequirement = z.infer<typeof CreateRequirementSchema>;

// Updating a draft: every field is optional. Zod's .partial() drops the
// refine, so we re-assert rate coherence manually.
export const UpdateRequirementSchema = BaseRequirementFieldsSchema.partial().refine(
  (data) =>
    data.billRateMinUsd === undefined ||
    data.billRateMaxUsd === undefined ||
    data.billRateMaxUsd >= data.billRateMinUsd,
  { message: "billRateMaxUsd must be >= billRateMinUsd", path: ["billRateMaxUsd"] },
);
export type UpdateRequirement = z.infer<typeof UpdateRequirementSchema>;

export const PublishRequirementSchema = z.object({}).optional();
export type PublishRequirement = z.infer<typeof PublishRequirementSchema>;

export const CloseRequirementSchema = z.object({
  reason: z.string().min(1).max(500),
});
export type CloseRequirement = z.infer<typeof CloseRequirementSchema>;

// AttributeCrmSchema lives in profile.ts and is re-used here; both the
// customer-svc endpoint and requirement-svc endpoint take the same shape.

// ─── Filter schema (browse query params) ─────────────────────────────────────

// A single-or-list helper: query strings can come through as either "VALUE"
// or ["A", "B"] depending on framework parsing; we accept both and normalize
// downstream.
const listOf = <T extends z.ZodTypeAny>(item: T) =>
  z.union([item, z.array(item)]).optional();

export const RequirementFilterSchema = z.object({
  status: listOf(RequirementStatus),
  techStack: listOf(z.string()),
  seniority: listOf(Seniority),
  locationType: listOf(LocationType),
  workAuthPrefs: listOf(WorkAuthStatus),
  customerCompanyId: z.string().uuid().optional(),
  attributedCrmId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type RequirementFilter = z.infer<typeof RequirementFilterSchema>;

// ─── Response schemas ────────────────────────────────────────────────────────

// customerCompanyId/createdByUserId are nullable because blind postings
// redact them for non-owner/non-CRM viewers.
export const RequirementResponseSchema = z.object({
  id: z.string().uuid(),
  customerCompanyId: z.string().uuid().nullable(),
  createdByUserId: z.string().uuid().nullable(),
  attributedCrmId: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string(),
  techStack: z.array(z.string()),
  seniority: Seniority,
  locationType: LocationType,
  locationCity: z.string().nullable(),
  locationState: z.string().nullable(),
  billRateMinUsd: z.number(),
  billRateMaxUsd: z.number(),
  durationWeeks: z.number().int(),
  startDate: z.string().datetime(),
  openings: z.number().int(),
  workAuthPrefs: z.array(WorkAuthStatus),
  requiredInterviews: z.number().int(),
  blindPosting: z.boolean(),
  status: RequirementStatus,
  publishedAt: z.string().datetime().nullable(),
  closedAt: z.string().datetime().nullable(),
  closedReason: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type RequirementResponse = z.infer<typeof RequirementResponseSchema>;

export const RequirementListResponseSchema = z.object({
  data: z.array(RequirementResponseSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type RequirementListResponse = z.infer<typeof RequirementListResponseSchema>;

export const CrmAttributionRequestResponseSchema = z.object({
  id: z.string().uuid(),
  requirementId: z.string().uuid(),
  customerCompanyId: z.string().uuid(),
  crmUserId: z.string().uuid(),
  status: CrmAttributionStatus,
  approvedAt: z.string().datetime().nullable(),
  approvedBy: z.string().uuid().nullable(),
  rejectedAt: z.string().datetime().nullable(),
  rejectedBy: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});
export type CrmAttributionRequestResponse = z.infer<
  typeof CrmAttributionRequestResponseSchema
>;

// ─── Event schemas ───────────────────────────────────────────────────────────

const EventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  version: z.literal(1),
});

export const RequirementPublishedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("requirement.published.v1"),
  payload: z.object({
    requirementId: z.string().uuid(),
    customerCompanyId: z.string().uuid(),
    attributedCrmId: z.string().uuid().nullable(),
    techStack: z.array(z.string()),
    seniority: Seniority,
    locationType: LocationType,
    publishedAt: z.string().datetime(),
  }),
});
export type RequirementPublishedEvent = z.infer<
  typeof RequirementPublishedEventSchema
>;

export const RequirementClosedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("requirement.closed.v1"),
  payload: z.object({
    requirementId: z.string().uuid(),
    reason: z.string(),
    closedAt: z.string().datetime(),
  }),
});
export type RequirementClosedEvent = z.infer<typeof RequirementClosedEventSchema>;
