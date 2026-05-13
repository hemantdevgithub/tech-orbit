import { z } from "zod";
import {
  ApplicationRole,
  ApplicationStatus,
  DisputeStatus,
  DisputeType,
  SuspendDuration,
  UserStatus,
} from "./enums.js";

// ─── Role applications ───────────────────────────────────────────────────────

export const RoleApplicationRequestSchema = z.object({
  requestedRole: ApplicationRole,
  applicationData: z.record(z.unknown()).default({}),
});
export type RoleApplicationRequest = z.infer<typeof RoleApplicationRequestSchema>;

export const ApproveApplicationSchema = z.object({
  reviewNotes: z.string().max(2000).optional(),
});
export type ApproveApplication = z.infer<typeof ApproveApplicationSchema>;

export const RejectApplicationSchema = z.object({
  reviewNotes: z.string().min(1).max(2000),
});
export type RejectApplication = z.infer<typeof RejectApplicationSchema>;

export const RoleApplicationFilterSchema = z.object({
  status: ApplicationStatus.optional(),
  requestedRole: ApplicationRole.optional(),
  userId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type RoleApplicationFilter = z.infer<typeof RoleApplicationFilterSchema>;

export const RoleApplicationResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  requestedRole: ApplicationRole,
  status: ApplicationStatus,
  applicationData: z.record(z.unknown()),
  reviewedBy: z.string().uuid().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  reviewNotes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type RoleApplicationResponse = z.infer<typeof RoleApplicationResponseSchema>;

export const RoleApplicationListResponseSchema = z.object({
  data: z.array(RoleApplicationResponseSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type RoleApplicationListResponse = z.infer<typeof RoleApplicationListResponseSchema>;

// ─── Disputes ────────────────────────────────────────────────────────────────

export const CreateDisputeRequestSchema = z.object({
  type: DisputeType,
  contextType: z.string().min(1).max(40),
  contextId: z.string().uuid(),
  respondent: z.string().uuid().optional(),
  description: z.string().min(10).max(4000),
});
export type CreateDisputeRequest = z.infer<typeof CreateDisputeRequestSchema>;

export const ResolveDisputeSchema = z.object({
  resolution: z.string().min(1).max(4000),
});
export type ResolveDispute = z.infer<typeof ResolveDisputeSchema>;

export const AddDisputeNoteSchema = z.object({
  content: z.string().min(1).max(4000),
});
export type AddDisputeNote = z.infer<typeof AddDisputeNoteSchema>;

export const DisputeFilterSchema = z.object({
  status: DisputeStatus.optional(),
  type: DisputeType.optional(),
  raisedBy: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type DisputeFilter = z.infer<typeof DisputeFilterSchema>;

export const DisputeNoteResponseSchema = z.object({
  id: z.string().uuid(),
  disputeId: z.string().uuid(),
  authorId: z.string().uuid(),
  content: z.string(),
  createdAt: z.string().datetime(),
});
export type DisputeNoteResponse = z.infer<typeof DisputeNoteResponseSchema>;

export const DisputeResponseSchema = z.object({
  id: z.string().uuid(),
  type: DisputeType,
  contextType: z.string(),
  contextId: z.string().uuid(),
  raisedBy: z.string().uuid(),
  respondent: z.string().uuid().nullable(),
  description: z.string(),
  status: DisputeStatus,
  resolution: z.string().nullable(),
  resolvedBy: z.string().uuid().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  notes: z.array(DisputeNoteResponseSchema).default([]),
});
export type DisputeResponse = z.infer<typeof DisputeResponseSchema>;

export const DisputeListResponseSchema = z.object({
  data: z.array(DisputeResponseSchema.omit({ notes: true })),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type DisputeListResponse = z.infer<typeof DisputeListResponseSchema>;

// ─── User management ─────────────────────────────────────────────────────────

export const SuspendUserSchema = z.object({
  reason: z.string().min(1).max(2000),
  duration: SuspendDuration,
});
export type SuspendUser = z.infer<typeof SuspendUserSchema>;

export const BanUserSchema = z.object({
  reason: z.string().min(1).max(2000),
});
export type BanUser = z.infer<typeof BanUserSchema>;

export const UserSearchResultSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  status: UserStatus,
  roles: z.array(z.string()),
  createdAt: z.string().datetime(),
});
export type UserSearchResult = z.infer<typeof UserSearchResultSchema>;

export const UserSearchResponseSchema = z.object({
  data: z.array(UserSearchResultSchema),
});
export type UserSearchResponse = z.infer<typeof UserSearchResponseSchema>;

// ─── Audit logs ──────────────────────────────────────────────────────────────

export const AuditLogResponseSchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  performedBy: z.string().uuid(),
  targetId: z.string().nullable(),
  targetType: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string().datetime(),
});
export type AuditLogResponse = z.infer<typeof AuditLogResponseSchema>;

export const AuditLogFilterSchema = z.object({
  action: z.string().optional(),
  performedBy: z.string().uuid().optional(),
  targetId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type AuditLogFilter = z.infer<typeof AuditLogFilterSchema>;

export const AuditLogListResponseSchema = z.object({
  data: z.array(AuditLogResponseSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type AuditLogListResponse = z.infer<typeof AuditLogListResponseSchema>;

// ─── Dashboard metrics ───────────────────────────────────────────────────────

export const DashboardMetricsResponseSchema = z.object({
  pendingApplications: z.number().int(),
  openDisputes: z.number().int(),
  activeUsers: z.number().int(),
  totalPlacements: z.number().int(),
  gmvThisMonthUsd: z.number(),
});
export type DashboardMetricsResponse = z.infer<typeof DashboardMetricsResponseSchema>;

// ─── Events ──────────────────────────────────────────────────────────────────

const EventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  version: z.literal(1),
});

export const RoleApprovedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("role.approved.v1"),
  payload: z.object({
    applicationId: z.string().uuid(),
    userId: z.string().uuid(),
    role: ApplicationRole,
    reviewerId: z.string().uuid(),
  }),
});
export type RoleApprovedEvent = z.infer<typeof RoleApprovedEventSchema>;

export const RoleRejectedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("role.rejected.v1"),
  payload: z.object({
    applicationId: z.string().uuid(),
    userId: z.string().uuid(),
    role: ApplicationRole,
    reviewerId: z.string().uuid(),
    reviewNotes: z.string(),
  }),
});
export type RoleRejectedEvent = z.infer<typeof RoleRejectedEventSchema>;

export const DisputeRaisedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("dispute.raised.v1"),
  payload: z.object({
    disputeId: z.string().uuid(),
    type: DisputeType,
    raisedBy: z.string().uuid(),
    respondent: z.string().uuid().nullable(),
    contextType: z.string(),
    contextId: z.string().uuid(),
  }),
});
export type DisputeRaisedEvent = z.infer<typeof DisputeRaisedEventSchema>;

export const DisputeResolvedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("dispute.resolved.v1"),
  payload: z.object({
    disputeId: z.string().uuid(),
    resolution: z.string(),
    resolvedBy: z.string().uuid(),
  }),
});
export type DisputeResolvedEvent = z.infer<typeof DisputeResolvedEventSchema>;

export const UserSuspendedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("user.suspended.v1"),
  payload: z.object({
    userId: z.string().uuid(),
    reason: z.string(),
    duration: SuspendDuration,
    performedBy: z.string().uuid(),
    until: z.string().datetime().nullable(),
  }),
});
export type UserSuspendedEvent = z.infer<typeof UserSuspendedEventSchema>;

export const UserBannedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("user.banned.v1"),
  payload: z.object({
    userId: z.string().uuid(),
    reason: z.string(),
    performedBy: z.string().uuid(),
  }),
});
export type UserBannedEvent = z.infer<typeof UserBannedEventSchema>;
