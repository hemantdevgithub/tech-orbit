import { z } from "zod";
import { SubmissionStatus, SubmitterRole } from "./enums.js";

// ─── Request schemas ─────────────────────────────────────────────────────────

// Create submission. submitterRole/attribution is inferred server-side from
// the caller's roles; clients only supply the target requirement, the
// candidate, and optional cover-note / proposed rate.
export const SubmissionRequestSchema = z.object({
  requirementId: z.string().uuid(),
  candidateId: z.string().uuid(),
  coverNote: z.string().max(500).optional(),
  proposedBillRate: z.number().positive().max(10_000).optional(),
});
export type SubmissionRequest = z.infer<typeof SubmissionRequestSchema>;

export const UpdateSubmissionStatusSchema = z.object({
  status: SubmissionStatus,
  rejectionReason: z.string().max(500).optional(),
});
export type UpdateSubmissionStatus = z.infer<typeof UpdateSubmissionStatusSchema>;

export const WithdrawSubmissionSchema = z.object({
  reason: z.string().min(1).max(500),
});
export type WithdrawSubmission = z.infer<typeof WithdrawSubmissionSchema>;

// ─── Filter / list schema ────────────────────────────────────────────────────

export const SubmissionFilterSchema = z.object({
  requirementId: z.string().uuid().optional(),
  candidateId: z.string().uuid().optional(),
  status: SubmissionStatus.optional(),
  submitterRole: SubmitterRole.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type SubmissionFilter = z.infer<typeof SubmissionFilterSchema>;

// ─── Response schemas ────────────────────────────────────────────────────────

export const SubmissionResponseSchema = z.object({
  id: z.string().uuid(),
  requirementId: z.string().uuid(),
  candidateId: z.string().uuid(),
  submittedByUserId: z.string().uuid(),
  submitterRole: SubmitterRole,
  attributedSrmId: z.string().uuid().nullable(),
  attributedMsmeId: z.string().uuid().nullable(),
  status: SubmissionStatus,
  matchScore: z.number().int().min(0).max(100).nullable(),
  coverNote: z.string().nullable(),
  proposedBillRate: z.number().nullable(),
  withdrawnAt: z.string().datetime().nullable(),
  withdrawnReason: z.string().nullable(),
  rejectedAt: z.string().datetime().nullable(),
  rejectionReason: z.string().nullable(),
  // Sprint 12 — invite-to-submit fields
  invitedAt: z.string().datetime().nullable(),
  invitedBySrmId: z.string().uuid().nullable(),
  inviteAcceptedAt: z.string().datetime().nullable(),
  inviteDeclinedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SubmissionResponse = z.infer<typeof SubmissionResponseSchema>;

// Sprint 12 — invite-to-submit request schemas
export const InviteCandidateSchema = z.object({
  candidateId: z.string().uuid(),
  coverNote: z.string().max(500).optional(),
});
export type InviteCandidate = z.infer<typeof InviteCandidateSchema>;

export const DeclineInviteSchema = z.object({
  reason: z.string().min(1).max(500),
});
export type DeclineInvite = z.infer<typeof DeclineInviteSchema>;

// Sprint 12 — SRM assigns an MSME to source a bench consultant for a requirement.
// Notifies the MSME (MSME_ASSIGNMENT); MSME then submits via the regular
// POST /api/v1/submissions flow when they pick a bench candidate. A
// RequirementMsmeAssignment row is persisted so the MSME has a stable inbox.
export const AssignMsmeSchema = z.object({
  msmePrimaryUserId: z.string().uuid(),
  note: z.string().max(500).optional(),
});
export type AssignMsme = z.infer<typeof AssignMsmeSchema>;

export const MsmeAssignmentStatus = z.enum([
  "ACTIVE",
  "SUBMITTED",
  "DECLINED",
  "EXPIRED",
]);
export type MsmeAssignmentStatus = z.infer<typeof MsmeAssignmentStatus>;

export const MsmeAssignmentResponseSchema = z.object({
  id: z.string().uuid(),
  requirementId: z.string().uuid(),
  assignedBySrmId: z.string().uuid(),
  note: z.string().nullable(),
  status: MsmeAssignmentStatus,
  createdAt: z.string().datetime(),
});
export type MsmeAssignmentResponse = z.infer<typeof MsmeAssignmentResponseSchema>;

export const MsmeAssignmentListResponseSchema = z.object({
  data: z.array(MsmeAssignmentResponseSchema),
});
export type MsmeAssignmentListResponse = z.infer<
  typeof MsmeAssignmentListResponseSchema
>;

export const DeclineMsmeAssignmentSchema = z.object({
  reason: z.string().min(1).max(500),
});
export type DeclineMsmeAssignment = z.infer<typeof DeclineMsmeAssignmentSchema>;

// Sprint 12 — events
const EventEnvelope = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  version: z.literal(1),
});

export const SubmissionInvitedEventSchema = EventEnvelope.extend({
  type: z.literal("submission.invited.v1"),
  payload: z.object({
    submissionId: z.string().uuid(),
    requirementId: z.string().uuid(),
    candidateId: z.string().uuid(),
    invitedBySrmId: z.string().uuid(),
    invitedAt: z.string().datetime(),
  }),
});
export type SubmissionInvitedEvent = z.infer<typeof SubmissionInvitedEventSchema>;

export const SubmissionInviteAcceptedEventSchema = EventEnvelope.extend({
  type: z.literal("submission.invite-accepted.v1"),
  payload: z.object({
    submissionId: z.string().uuid(),
    requirementId: z.string().uuid(),
    candidateId: z.string().uuid(),
    invitedBySrmId: z.string().uuid(),
    acceptedAt: z.string().datetime(),
  }),
});
export type SubmissionInviteAcceptedEvent = z.infer<
  typeof SubmissionInviteAcceptedEventSchema
>;

export const SubmissionInviteDeclinedEventSchema = EventEnvelope.extend({
  type: z.literal("submission.invite-declined.v1"),
  payload: z.object({
    submissionId: z.string().uuid(),
    requirementId: z.string().uuid(),
    candidateId: z.string().uuid(),
    invitedBySrmId: z.string().uuid(),
    declinedAt: z.string().datetime(),
    reason: z.string(),
  }),
});
export type SubmissionInviteDeclinedEvent = z.infer<
  typeof SubmissionInviteDeclinedEventSchema
>;

export const SubmissionListResponseSchema = z.object({
  data: z.array(SubmissionResponseSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type SubmissionListResponse = z.infer<typeof SubmissionListResponseSchema>;

export const MatchingSignalResponseSchema = z.object({
  id: z.string().uuid(),
  requirementId: z.string().uuid(),
  candidateId: z.string().uuid(),
  skillOverlap: z.number().int().min(0),
  seniorityMatch: z.boolean(),
  locationMatch: z.boolean(),
  workAuthMatch: z.boolean(),
  candidateRating: z.number(),
  matchScore: z.number().int().min(0).max(100),
  computedAt: z.string().datetime(),
});
export type MatchingSignalResponse = z.infer<typeof MatchingSignalResponseSchema>;

export const MatchingSignalListResponseSchema = z.object({
  data: z.array(MatchingSignalResponseSchema),
});
export type MatchingSignalListResponse = z.infer<
  typeof MatchingSignalListResponseSchema
>;

// ─── Event schemas ───────────────────────────────────────────────────────────

const EventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  version: z.literal(1),
});

export const SubmissionCreatedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("submission.created.v1"),
  payload: z.object({
    submissionId: z.string().uuid(),
    requirementId: z.string().uuid(),
    candidateId: z.string().uuid(),
    submittedByUserId: z.string().uuid(),
    submitterRole: SubmitterRole,
    attributedSrmId: z.string().uuid().nullable(),
    attributedMsmeId: z.string().uuid().nullable(),
    matchScore: z.number().int().min(0).max(100).nullable(),
    createdAt: z.string().datetime(),
  }),
});
export type SubmissionCreatedEvent = z.infer<typeof SubmissionCreatedEventSchema>;

export const SubmissionStatusChangedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("submission.status_changed.v1"),
  payload: z.object({
    submissionId: z.string().uuid(),
    requirementId: z.string().uuid(),
    candidateId: z.string().uuid(),
    fromStatus: SubmissionStatus,
    toStatus: SubmissionStatus,
    changedByUserId: z.string().uuid(),
    changedAt: z.string().datetime(),
  }),
});
export type SubmissionStatusChangedEvent = z.infer<
  typeof SubmissionStatusChangedEventSchema
>;

export const SubmissionWithdrawnEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("submission.withdrawn.v1"),
  payload: z.object({
    submissionId: z.string().uuid(),
    requirementId: z.string().uuid(),
    candidateId: z.string().uuid(),
    reason: z.string(),
    withdrawnAt: z.string().datetime(),
  }),
});
export type SubmissionWithdrawnEvent = z.infer<typeof SubmissionWithdrawnEventSchema>;
