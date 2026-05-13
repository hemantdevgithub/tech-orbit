import { z } from "zod";
import {
  CommissionCalc,
  CommissionSlot,
  EngagementType,
  PlacementStatus,
} from "./enums.js";

// ─── Request schemas ─────────────────────────────────────────────────────────

// billRate/payRate are numbers on the wire — the service converts to Decimal
// internally.  Keeping the API JSON-native makes the frontend simpler.
export const CreatePlacementRequestSchema = z
  .object({
    submissionId: z.string().uuid(),
    engagementType: EngagementType,
    billRateUsd: z.number().positive().max(10_000),
    payRateUsd: z.number().positive().max(10_000).optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    contractDocumentId: z.string().uuid().optional(),
    workOrderId: z.string().optional(),
    rtrDocumentId: z.string().uuid().optional(),
  })
  .refine(
    (d) =>
      d.engagementType !== "W2" ||
      (d.payRateUsd !== undefined && d.payRateUsd < d.billRateUsd),
    {
      message: "W-2 placements require payRateUsd, and payRateUsd must be less than billRateUsd",
      path: ["payRateUsd"],
    },
  )
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: "endDate must be after startDate",
    path: ["endDate"],
  });
export type CreatePlacementRequest = z.infer<typeof CreatePlacementRequestSchema>;

export const EndPlacementSchema = z.object({
  reason: z.string().min(1).max(500),
  actualEndDate: z.string().datetime().optional(),
  status: z.enum(["ENDED_COMPLETED", "ENDED_EARLY"]).default("ENDED_EARLY"),
});
export type EndPlacement = z.infer<typeof EndPlacementSchema>;

// ─── Filter ──────────────────────────────────────────────────────────────────

export const PlacementFilterSchema = z.object({
  customerCompanyId: z.string().uuid().optional(),
  candidateId: z.string().uuid().optional(),
  requirementId: z.string().uuid().optional(),
  status: PlacementStatus.optional(),
  attributedCrmId: z.string().uuid().optional(),
  attributedSrmId: z.string().uuid().optional(),
  attributedMsmeId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PlacementFilter = z.infer<typeof PlacementFilterSchema>;

// ─── Response schemas ────────────────────────────────────────────────────────

export const PlacementResponseSchema = z.object({
  id: z.string().uuid(),
  requirementId: z.string().uuid(),
  submissionId: z.string().uuid(),
  candidateId: z.string().uuid(),
  customerCompanyId: z.string().uuid(),
  createdByUserId: z.string().uuid(),
  engagementType: EngagementType,
  billRateUsd: z.number(),
  payRateUsd: z.number().nullable(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  actualEndDate: z.string().datetime().nullable(),
  status: PlacementStatus,
  endReason: z.string().nullable(),
  contractDocumentId: z.string().uuid().nullable(),
  workOrderId: z.string().nullable(),
  rtrDocumentId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PlacementResponse = z.infer<typeof PlacementResponseSchema>;

export const PlacementListResponseSchema = z.object({
  data: z.array(PlacementResponseSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type PlacementListResponse = z.infer<typeof PlacementListResponseSchema>;

// ValueChain uses nullable fields everywhere because a given viewer
// (e.g. an SRM) may not be authorized to see certain slots.  The service
// layer applies the filter before serializing.
export const ValueChainResponseSchema = z.object({
  id: z.string().uuid(),
  placementId: z.string().uuid(),
  customerCompanyId: z.string().uuid().nullable(),
  attributedCrmId: z.string().uuid().nullable(),
  attributedSrmId: z.string().uuid().nullable(),
  attributedMsmeId: z.string().uuid().nullable(),
  candidateId: z.string().uuid().nullable(),
  interviewerIds: z.array(z.string().uuid()),
  // `redactedSlots` is filled in when a viewer can't see a given slot.
  // UIs can render "Confidential" labels driven off this list.
  redactedSlots: z.array(CommissionSlot),
  createdAt: z.string().datetime(),
});
export type ValueChainResponse = z.infer<typeof ValueChainResponseSchema>;

export const CommissionRuleResponseSchema = z.object({
  id: z.string().uuid(),
  placementId: z.string().uuid(),
  slot: CommissionSlot,
  beneficiaryUserId: z.string().uuid().nullable(),
  beneficiaryMsmeId: z.string().uuid().nullable(),
  calculation: CommissionCalc,
  percentOfBillRate: z.number().nullable(),
  flatFeeUsd: z.number().nullable(),
  // Derived convenience fields for the UI.  null if the rule is RESIDUAL
  // and resolving the dollar value requires other rule context.
  projectedHourlyUsd: z.number().nullable(),
  notes: z.string().nullable(),
  interviewId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});
export type CommissionRuleResponse = z.infer<typeof CommissionRuleResponseSchema>;

export const CommissionRuleListResponseSchema = z.object({
  data: z.array(CommissionRuleResponseSchema),
});
export type CommissionRuleListResponse = z.infer<typeof CommissionRuleListResponseSchema>;

// ─── Events ──────────────────────────────────────────────────────────────────

const EventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  version: z.literal(1),
});

export const PlacementCreatedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("placement.created.v1"),
  payload: z.object({
    placementId: z.string().uuid(),
    requirementId: z.string().uuid(),
    submissionId: z.string().uuid(),
    candidateId: z.string().uuid(),
    customerCompanyId: z.string().uuid(),
    engagementType: EngagementType,
    billRateUsd: z.number(),
    payRateUsd: z.number().nullable(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    attributedCrmId: z.string().uuid().nullable(),
    attributedSrmId: z.string().uuid().nullable(),
    attributedMsmeId: z.string().uuid().nullable(),
    interviewerIds: z.array(z.string().uuid()),
    createdAt: z.string().datetime(),
  }),
});
export type PlacementCreatedEvent = z.infer<typeof PlacementCreatedEventSchema>;

export const PlacementEndedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("placement.ended.v1"),
  payload: z.object({
    placementId: z.string().uuid(),
    status: PlacementStatus,
    actualEndDate: z.string().datetime().nullable(),
    endReason: z.string(),
    endedAt: z.string().datetime(),
  }),
});
export type PlacementEndedEvent = z.infer<typeof PlacementEndedEventSchema>;
