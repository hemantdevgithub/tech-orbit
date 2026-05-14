import { z } from "zod";

// ─── Domain enums ──────────────────────────────────────────────────────────
export * from "./enums.js";

// Pagination cursor
export const PaginationCursor = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type PaginationCursor = z.infer<typeof PaginationCursor>;

// API response envelope
export const PaginatedResponse = z.object({
  data: z.array(z.unknown()),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type PaginatedResponse = z.infer<typeof PaginatedResponse>;

// Error response
export const ErrorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;

// ─── Auth types (re-exported from auth.ts) ────────────────────────────────────
export {
  EmailSchema,
  PasswordSchema,
  RegisterRequestSchema,
  LoginRequestSchema,
  AuthSuccessResponseSchema,
  PartialAuthResponseSchema,
  RefreshRequestSchema,
  RefreshResponseSchema,
  PasswordResetRequestSchema,
  PasswordResetConfirmSchema,
  TwoFASetupResponseSchema,
  TwoFAVerifyRequestSchema,
  TwoFADisableRequestSchema,
  AddRoleRequestSchema,
  MeResponseSchema,
  OAuthStartResponseSchema,
  RegisterResponseSchema,
  LoginResponseSchema,
  LoginSuccessResponseSchema,
  Login2FAResponseSchema,
  TokenRefreshResponseSchema,
  PasswordResetRequestResponseSchema,
  UserRegisteredEventSchema,
  UserLoggedInEventSchema,
  UserRoleAddedEventSchema,
  PasswordChangedEventSchema,
  SessionRevokedEventSchema,
  User2FAEnabledEventSchema,
  User2FADisabledEventSchema,
} from "./auth.js";

export type {
  Email,
  Password,
  RegisterRequest,
  LoginRequest,
  AuthSuccessResponse,
  PartialAuthResponse,
  RefreshRequest,
  RefreshResponse,
  PasswordResetRequest,
  PasswordResetConfirm,
  TwoFASetupResponse,
  TwoFAVerifyRequest,
  TwoFADisableRequest,
  AddRoleRequest,
  MeResponse,
  OAuthStartResponse,
  RegisterResponse,
  LoginResponse,
  LoginSuccessResponse,
  Login2FAResponse,
  TokenRefreshResponse,
  PasswordResetRequestResponse,
  UserProfile,
  UserRegisteredEvent,
  UserLoggedInEvent,
  UserRoleAddedEvent,
  PasswordChangedEvent,
  SessionRevokedEvent,
  User2FAEnabledEvent,
  User2FADisabledEvent,
} from "./auth.js";

// ─── Profile types (re-exported from profile.ts) ─────────────────────────────
export {
  AvailabilitySlotSchema,
  CandidateProfileResponseSchema,
  PublicCandidateProfileSchema,
  UpdateCandidateProfileSchema,
  SetFeaturedInterviewsSchema,
  StartKycResponseSchema,
  MsmeProfileResponseSchema,
  CreateMsmeProfileSchema,
  UpdateMsmeProfileSchema,
  BenchEntryResponseSchema,
  AddBenchEntrySchema,
  CustomerCompanyResponseSchema,
  PublicCustomerProfileSchema,
  CreateCustomerCompanySchema,
  UpdateCustomerCompanySchema,
  AttributeCrmSchema,
  InterviewerProfileResponseSchema,
  PublicInterviewerProfileSchema,
  CreateInterviewerProfileSchema,
  UpdateInterviewerProfileSchema,
  SetAvailabilitySchema,
  CalendarConnectResponseSchema,
  CandidateProfileCompletedEventSchema,
  MsmeProfileCreatedEventSchema,
  CustomerProfileCreatedEventSchema,
  InterviewerProfileCreatedEventSchema,
  CrmAttributedEventSchema,
  FileUploadUrlRequestSchema,
  FileUploadUrlResponseSchema,
  FileResponseSchema,
} from "./profile.js";

export type {
  AvailabilitySlot,
  CandidateProfileResponse,
  PublicCandidateProfile,
  UpdateCandidateProfile,
  SetFeaturedInterviews,
  StartKycResponse,
  MsmeProfileResponse,
  CreateMsmeProfile,
  UpdateMsmeProfile,
  BenchEntryResponse,
  AddBenchEntry,
  CustomerCompanyResponse,
  PublicCustomerProfile,
  CreateCustomerCompany,
  UpdateCustomerCompany,
  AttributeCrm,
  InterviewerProfileResponse,
  PublicInterviewerProfile,
  CreateInterviewerProfile,
  UpdateInterviewerProfile,
  SetAvailability,
  FileUploadUrlRequest,
  FileUploadUrlResponse,
  FileResponse,
} from "./profile.js";

export { registry } from "./openapi-registry.js";

export { TECH_STACK_OPTIONS } from "./tech-stack.js";
export type { TechStack } from "./tech-stack.js";

// ─── Requirement types (re-exported from requirement.ts) ─────────────────────
// AttributeCrmSchema is already re-exported above from ./profile.js; it's
// reused by the requirement-svc endpoint with the same shape.
export {
  CreateRequirementSchema,
  UpdateRequirementSchema,
  PublishRequirementSchema,
  CloseRequirementSchema,
  RequirementFilterSchema,
  RequirementResponseSchema,
  RequirementListResponseSchema,
  RequirementCrmOwnerSchema,
  AssignSrmSchema,
  CrmAttributionRequestResponseSchema,
  RequirementPublishedEventSchema,
  RequirementClosedEventSchema,
  RequirementCrmAcceptedEventSchema,
  RequirementSrmAssignedEventSchema,
  RequirementAssignedMsmeEventSchema,
} from "./requirement.js";

export type {
  CreateRequirement,
  UpdateRequirement,
  PublishRequirement,
  CloseRequirement,
  RequirementFilter,
  RequirementResponse,
  RequirementListResponse,
  RequirementCrmOwner,
  AssignSrm,
  CrmAttributionRequestResponse,
  RequirementPublishedEvent,
  RequirementClosedEvent,
  RequirementCrmAcceptedEvent,
  RequirementSrmAssignedEvent,
  RequirementAssignedMsmeEvent,
} from "./requirement.js";

// ─── Matching / submission types (re-exported from matching.ts) ──────────────
export {
  SubmissionRequestSchema,
  UpdateSubmissionStatusSchema,
  WithdrawSubmissionSchema,
  SubmissionFilterSchema,
  SubmissionResponseSchema,
  SubmissionListResponseSchema,
  InviteCandidateSchema,
  DeclineInviteSchema,
  AssignMsmeSchema,
  MatchingSignalResponseSchema,
  MatchingSignalListResponseSchema,
  SubmissionCreatedEventSchema,
  SubmissionStatusChangedEventSchema,
  SubmissionWithdrawnEventSchema,
  SubmissionInvitedEventSchema,
  SubmissionInviteAcceptedEventSchema,
  SubmissionInviteDeclinedEventSchema,
} from "./matching.js";

export type {
  SubmissionRequest,
  UpdateSubmissionStatus,
  WithdrawSubmission,
  SubmissionFilter,
  SubmissionResponse,
  SubmissionListResponse,
  InviteCandidate,
  DeclineInvite,
  AssignMsme,
  MatchingSignalResponse,
  MatchingSignalListResponse,
  SubmissionCreatedEvent,
  SubmissionStatusChangedEvent,
  SubmissionWithdrawnEvent,
  SubmissionInvitedEvent,
  SubmissionInviteAcceptedEvent,
  SubmissionInviteDeclinedEvent,
} from "./matching.js";

// ─── Interview types (re-exported from interview.ts) ─────────────────────────
export {
  ScheduleInterviewRequestSchema,
  CancelInterviewSchema,
  ScorecardRequestSchema,
  InterviewFilterSchema,
  InterviewResponseSchema,
  InterviewListResponseSchema,
  InterviewSummarySchema,
  InterviewSummaryListSchema,
  RecordingPlaybackResponseSchema,
  ScorecardResponseSchema,
  InterviewScheduledEventSchema,
  InterviewCompletedEventSchema,
  ScorecardSubmittedEventSchema,
} from "./interview.js";

export type {
  ScheduleInterviewRequest,
  CancelInterview,
  ScorecardRequest,
  InterviewFilter,
  InterviewResponse,
  InterviewListResponse,
  InterviewSummary,
  InterviewSummaryList,
  RecordingPlaybackResponse,
  ScorecardResponse,
  InterviewScheduledEvent,
  InterviewCompletedEvent,
  ScorecardSubmittedEvent,
} from "./interview.js";

// ─── Placement types (re-exported from placement.ts) ─────────────────────────
export {
  CreatePlacementRequestSchema,
  EndPlacementSchema,
  PlacementFilterSchema,
  PlacementResponseSchema,
  PlacementListResponseSchema,
  ValueChainResponseSchema,
  CommissionRuleResponseSchema,
  CommissionRuleListResponseSchema,
  PlacementCreatedEventSchema,
  PlacementEndedEventSchema,
} from "./placement.js";

export type {
  CreatePlacementRequest,
  EndPlacement,
  PlacementFilter,
  PlacementResponse,
  PlacementListResponse,
  ValueChainResponse,
  CommissionRuleResponse,
  CommissionRuleListResponse,
  PlacementCreatedEvent,
  PlacementEndedEvent,
} from "./placement.js";

// ─── Payments types (re-exported from payments.ts) ───────────────────────────
export {
  SubmitTimesheetRequestSchema,
  UpdateTimesheetSchema,
  RejectTimesheetSchema,
  TimesheetFilterSchema,
  TimesheetResponseSchema,
  TimesheetListResponseSchema,
  InvoiceFilterSchema,
  InvoiceResponseSchema,
  InvoiceListResponseSchema,
  InvoiceLineItemResponseSchema,
  PayoutFilterSchema,
  CommissionPayoutResponseSchema,
  CommissionPayoutListResponseSchema,
  GenerateWeeklyInvoicesRequestSchema,
  TimesheetSubmittedEventSchema,
  TimesheetApprovedEventSchema,
  InvoiceGeneratedEventSchema,
  PayoutProcessedEventSchema,
} from "./payments.js";

export type {
  SubmitTimesheetRequest,
  UpdateTimesheet,
  RejectTimesheet,
  TimesheetFilter,
  TimesheetResponse,
  TimesheetListResponse,
  InvoiceFilter,
  InvoiceResponse,
  InvoiceListResponse,
  InvoiceLineItemResponse,
  PayoutFilter,
  CommissionPayoutResponse,
  CommissionPayoutListResponse,
  GenerateWeeklyInvoicesRequest,
  TimesheetSubmittedEvent,
  TimesheetApprovedEvent,
  InvoiceGeneratedEvent,
  PayoutProcessedEvent,
} from "./payments.js";

// ─── Communications (messaging / notification / rating) ──────────────────────
export {
  CreateThreadRequestSchema,
  SendMessageRequestSchema,
  MessageResponseSchema,
  ThreadResponseSchema,
  ThreadWithMessagesResponseSchema,
  ThreadListResponseSchema,
  ThreadFilterSchema,
  NotificationResponseSchema,
  NotificationListResponseSchema,
  NotificationFilterSchema,
  NotificationPreferenceSchema,
  NotificationPreferenceResponseSchema,
  UpdateNotificationPreferenceSchema,
  SubmitRatingRequestSchema,
  RatingResponseSchema,
  RatingListResponseSchema,
  RatingFilterSchema,
  MessageSentEventSchema,
  RatingSubmittedEventSchema,
} from "./communications.js";

export type {
  CreateThreadRequest,
  SendMessageRequest,
  MessageResponse,
  ThreadResponse,
  ThreadWithMessagesResponse,
  ThreadListResponse,
  ThreadFilter,
  NotificationResponse,
  NotificationListResponse,
  NotificationFilter,
  NotificationPreference,
  NotificationPreferenceResponse,
  UpdateNotificationPreference,
  SubmitRatingRequest,
  RatingResponse,
  RatingListResponse,
  RatingFilter,
  MessageSentEvent,
  RatingSubmittedEvent,
} from "./communications.js";

// ─── Admin (Sprint 9) ────────────────────────────────────────────────────────
export {
  RoleApplicationRequestSchema,
  ApproveApplicationSchema,
  RejectApplicationSchema,
  RoleApplicationFilterSchema,
  RoleApplicationResponseSchema,
  RoleApplicationListResponseSchema,
  CreateDisputeRequestSchema,
  ResolveDisputeSchema,
  AddDisputeNoteSchema,
  DisputeFilterSchema,
  DisputeNoteResponseSchema,
  DisputeResponseSchema,
  DisputeListResponseSchema,
  SuspendUserSchema,
  BanUserSchema,
  UserSearchResultSchema,
  UserSearchResponseSchema,
  AuditLogResponseSchema,
  AuditLogFilterSchema,
  AuditLogListResponseSchema,
  DashboardMetricsResponseSchema,
  RoleApprovedEventSchema,
  RoleRejectedEventSchema,
  DisputeRaisedEventSchema,
  DisputeResolvedEventSchema,
  UserSuspendedEventSchema,
  UserBannedEventSchema,
} from "./admin.js";

export type {
  RoleApplicationRequest,
  ApproveApplication,
  RejectApplication,
  RoleApplicationFilter,
  RoleApplicationResponse,
  RoleApplicationListResponse,
  CreateDisputeRequest,
  ResolveDispute,
  AddDisputeNote,
  DisputeFilter,
  DisputeNoteResponse,
  DisputeResponse,
  DisputeListResponse,
  SuspendUser,
  BanUser,
  UserSearchResult,
  UserSearchResponse,
  AuditLogResponse,
  AuditLogFilter,
  AuditLogListResponse,
  DashboardMetricsResponse,
  RoleApprovedEvent,
  RoleRejectedEvent,
  DisputeRaisedEvent,
  DisputeResolvedEvent,
  UserSuspendedEvent,
  UserBannedEvent,
} from "./admin.js";