import { z } from "zod";
import { InterviewerRole, InterviewStatus, Recommendation } from "./enums.js";

// ─── Request schemas ─────────────────────────────────────────────────────────

export const ScheduleInterviewRequestSchema = z.object({
  requirementId: z.string().uuid(),
  submissionId: z.string().uuid(),
  candidateId: z.string().uuid(),
  interviewerUserId: z.string().uuid().optional(),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
});
export type ScheduleInterviewRequest = z.infer<typeof ScheduleInterviewRequestSchema>;

export const CancelInterviewSchema = z.object({
  reason: z.string().min(1).max(500),
});
export type CancelInterview = z.infer<typeof CancelInterviewSchema>;

export const ScorecardRequestSchema = z.object({
  interviewId: z.string().uuid(),
  recommendation: Recommendation,
  technicalScore: z.number().int().min(1).max(5).optional(),
  communicationScore: z.number().int().min(1).max(5).optional(),
  problemSolvingScore: z.number().int().min(1).max(5).optional(),
  culturalFitScore: z.number().int().min(1).max(5).optional(),
  freeformFeedback: z.string().min(1).max(2000),
  redFlags: z.string().max(1000).optional(),
  wouldHireAgain: z.boolean().optional(),
});
export type ScorecardRequest = z.infer<typeof ScorecardRequestSchema>;

// ─── Filter schema ───────────────────────────────────────────────────────────

export const InterviewFilterSchema = z.object({
  requirementId: z.string().uuid().optional(),
  submissionId: z.string().uuid().optional(),
  candidateId: z.string().uuid().optional(),
  interviewerUserId: z.string().uuid().optional(),
  status: InterviewStatus.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type InterviewFilter = z.infer<typeof InterviewFilterSchema>;

// ─── Response schemas ────────────────────────────────────────────────────────

export const InterviewResponseSchema = z.object({
  id: z.string().uuid(),
  requirementId: z.string().uuid(),
  submissionId: z.string().uuid(),
  candidateId: z.string().uuid(),
  scheduledByUserId: z.string().uuid(),
  interviewerUserId: z.string().uuid().nullable(),
  conductedByRole: InterviewerRole,
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  videoRoomUrl: z.string().nullable(),
  videoRecordingUrl: z.string().nullable(),
  status: InterviewStatus,
  startedAt: z.string().datetime().nullable(),
  endedAt: z.string().datetime().nullable(),
  cancelledAt: z.string().datetime().nullable(),
  cancelledBy: z.string().uuid().nullable(),
  cancelReason: z.string().nullable(),
  interviewerFeeUsd: z.number().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type InterviewResponse = z.infer<typeof InterviewResponseSchema>;

export const InterviewListResponseSchema = z.object({
  data: z.array(InterviewResponseSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type InterviewListResponse = z.infer<typeof InterviewListResponseSchema>;

export const ScorecardResponseSchema = z.object({
  id: z.string().uuid(),
  interviewId: z.string().uuid(),
  recommendation: Recommendation,
  technicalScore: z.number().int().nullable(),
  communicationScore: z.number().int().nullable(),
  problemSolvingScore: z.number().int().nullable(),
  culturalFitScore: z.number().int().nullable(),
  freeformFeedback: z.string(),
  redFlags: z.string().nullable(),
  wouldHireAgain: z.boolean().nullable(),
  submittedAt: z.string().datetime(),
  submittedBy: z.string().uuid(),
});
export type ScorecardResponse = z.infer<typeof ScorecardResponseSchema>;

// ─── Event schemas ───────────────────────────────────────────────────────────

const EventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  version: z.literal(1),
});

export const InterviewScheduledEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("interview.scheduled.v1"),
  payload: z.object({
    interviewId: z.string().uuid(),
    requirementId: z.string().uuid(),
    submissionId: z.string().uuid(),
    candidateId: z.string().uuid(),
    interviewerUserId: z.string().uuid().nullable(),
    conductedByRole: InterviewerRole,
    scheduledStart: z.string().datetime(),
    scheduledEnd: z.string().datetime(),
    videoRoomUrl: z.string().nullable(),
    scheduledAt: z.string().datetime(),
  }),
});
export type InterviewScheduledEvent = z.infer<typeof InterviewScheduledEventSchema>;

export const InterviewCompletedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("interview.completed.v1"),
  payload: z.object({
    interviewId: z.string().uuid(),
    candidateId: z.string().uuid(),
    interviewerUserId: z.string().uuid().nullable(),
    endedAt: z.string().datetime(),
  }),
});
export type InterviewCompletedEvent = z.infer<typeof InterviewCompletedEventSchema>;

export const ScorecardSubmittedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("scorecard.submitted.v1"),
  payload: z.object({
    scorecardId: z.string().uuid(),
    interviewId: z.string().uuid(),
    candidateId: z.string().uuid(),
    interviewerUserId: z.string().uuid().nullable(),
    recommendation: Recommendation,
    submittedBy: z.string().uuid(),
    submittedAt: z.string().datetime(),
  }),
});
export type ScorecardSubmittedEvent = z.infer<typeof ScorecardSubmittedEventSchema>;
