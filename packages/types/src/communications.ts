import { z } from "zod";
import { NotificationType, RaterRole, ThreadContextType } from "./enums.js";

// ─── Messaging ───────────────────────────────────────────────────────────────

export const CreateThreadRequestSchema = z.object({
  contextType: ThreadContextType,
  contextId: z.string().uuid(),
  subject: z.string().max(200).optional(),
  initialMessage: z.string().min(1).max(5000),
  // Only honored when contextType === "GENERAL". For contexts tied to a
  // domain object (placement/requirement/etc.) the server derives participants.
  participantIds: z.array(z.string().uuid()).optional(),
});
export type CreateThreadRequest = z.infer<typeof CreateThreadRequestSchema>;

export const SendMessageRequestSchema = z.object({
  content: z.string().min(1).max(5000),
});
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

export const MessageResponseSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  senderUserId: z.string().uuid(),
  content: z.string(),
  readBy: z.array(z.string().uuid()),
  createdAt: z.string().datetime(),
});
export type MessageResponse = z.infer<typeof MessageResponseSchema>;

export const ThreadResponseSchema = z.object({
  id: z.string().uuid(),
  contextType: ThreadContextType,
  contextId: z.string().uuid(),
  participantIds: z.array(z.string().uuid()),
  subject: z.string().nullable(),
  lastMessageAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  unreadCount: z.number().int().min(0),
  lastMessagePreview: z.string().nullable(),
});
export type ThreadResponse = z.infer<typeof ThreadResponseSchema>;

export const ThreadWithMessagesResponseSchema = ThreadResponseSchema.extend({
  messages: z.array(MessageResponseSchema),
});
export type ThreadWithMessagesResponse = z.infer<typeof ThreadWithMessagesResponseSchema>;

export const ThreadListResponseSchema = z.object({
  data: z.array(ThreadResponseSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type ThreadListResponse = z.infer<typeof ThreadListResponseSchema>;

export const ThreadFilterSchema = z.object({
  contextType: ThreadContextType.optional(),
  contextId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ThreadFilter = z.infer<typeof ThreadFilterSchema>;

// ─── Notifications ───────────────────────────────────────────────────────────

export const NotificationResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: NotificationType,
  title: z.string(),
  message: z.string(),
  linkUrl: z.string().nullable(),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;

export const NotificationListResponseSchema = z.object({
  data: z.array(NotificationResponseSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  unreadCount: z.number().int().min(0),
});
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;

export const NotificationFilterSchema = z.object({
  unreadOnly: z.coerce.boolean().default(false),
  type: NotificationType.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type NotificationFilter = z.infer<typeof NotificationFilterSchema>;

export const NotificationPreferenceSchema = z.object({
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  perType: z.record(NotificationType, z.boolean()).default({}),
});
export type NotificationPreference = z.infer<typeof NotificationPreferenceSchema>;

export const NotificationPreferenceResponseSchema = NotificationPreferenceSchema.extend({
  userId: z.string().uuid(),
  updatedAt: z.string().datetime(),
});
export type NotificationPreferenceResponse = z.infer<typeof NotificationPreferenceResponseSchema>;

export const UpdateNotificationPreferenceSchema = NotificationPreferenceSchema.partial();
export type UpdateNotificationPreference = z.infer<typeof UpdateNotificationPreferenceSchema>;

// ─── Ratings ─────────────────────────────────────────────────────────────────

export const SubmitRatingRequestSchema = z.object({
  placementId: z.string().uuid(),
  ratedUserId: z.string().uuid(),
  overallScore: z.number().int().min(1).max(5),
  technicalScore: z.number().int().min(1).max(5).optional(),
  communicationScore: z.number().int().min(1).max(5).optional(),
  professionalismScore: z.number().int().min(1).max(5).optional(),
  feedback: z.string().max(500).optional(),
});
export type SubmitRatingRequest = z.infer<typeof SubmitRatingRequestSchema>;

export const RatingResponseSchema = z.object({
  id: z.string().uuid(),
  placementId: z.string().uuid(),
  ratedUserId: z.string().uuid(),
  raterUserId: z.string().uuid(),
  raterRole: RaterRole,
  overallScore: z.number().int().min(1).max(5),
  technicalScore: z.number().int().min(1).max(5).nullable(),
  communicationScore: z.number().int().min(1).max(5).nullable(),
  professionalismScore: z.number().int().min(1).max(5).nullable(),
  feedback: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type RatingResponse = z.infer<typeof RatingResponseSchema>;

export const RatingListResponseSchema = z.object({
  data: z.array(RatingResponseSchema),
  averageOverall: z.number().nullable(),
  averageTechnical: z.number().nullable(),
  averageCommunication: z.number().nullable(),
  averageProfessionalism: z.number().nullable(),
  totalCount: z.number().int().min(0),
});
export type RatingListResponse = z.infer<typeof RatingListResponseSchema>;

export const RatingFilterSchema = z.object({
  userId: z.string().uuid().optional(),
  placementId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type RatingFilter = z.infer<typeof RatingFilterSchema>;

// ─── Events ──────────────────────────────────────────────────────────────────

const EventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  version: z.literal(1),
});

export const MessageSentEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("message.sent.v1"),
  payload: z.object({
    threadId: z.string().uuid(),
    messageId: z.string().uuid(),
    senderUserId: z.string().uuid(),
    recipientUserIds: z.array(z.string().uuid()),
    contextType: ThreadContextType,
    contextId: z.string().uuid(),
    preview: z.string(),
  }),
});
export type MessageSentEvent = z.infer<typeof MessageSentEventSchema>;

export const RatingSubmittedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("rating.submitted.v1"),
  payload: z.object({
    ratingId: z.string().uuid(),
    placementId: z.string().uuid(),
    ratedUserId: z.string().uuid(),
    raterUserId: z.string().uuid(),
    raterRole: RaterRole,
    overallScore: z.number().int(),
  }),
});
export type RatingSubmittedEvent = z.infer<typeof RatingSubmittedEventSchema>;
