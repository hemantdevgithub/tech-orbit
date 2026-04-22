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
  UpdateCandidateProfileSchema,
  StartKycResponseSchema,
  MsmeProfileResponseSchema,
  CreateMsmeProfileSchema,
  UpdateMsmeProfileSchema,
  BenchEntryResponseSchema,
  AddBenchEntrySchema,
  CustomerCompanyResponseSchema,
  CreateCustomerCompanySchema,
  UpdateCustomerCompanySchema,
  AttributeCrmSchema,
  InterviewerProfileResponseSchema,
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
  UpdateCandidateProfile,
  StartKycResponse,
  MsmeProfileResponse,
  CreateMsmeProfile,
  UpdateMsmeProfile,
  BenchEntryResponse,
  AddBenchEntry,
  CustomerCompanyResponse,
  CreateCustomerCompany,
  UpdateCustomerCompany,
  AttributeCrm,
  InterviewerProfileResponse,
  CreateInterviewerProfile,
  UpdateInterviewerProfile,
  SetAvailability,
  FileUploadUrlRequest,
  FileUploadUrlResponse,
  FileResponse,
} from "./profile.js";

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
  CrmAttributionRequestResponseSchema,
  RequirementPublishedEventSchema,
  RequirementClosedEventSchema,
} from "./requirement.js";

export type {
  CreateRequirement,
  UpdateRequirement,
  PublishRequirement,
  CloseRequirement,
  RequirementFilter,
  RequirementResponse,
  RequirementListResponse,
  CrmAttributionRequestResponse,
  RequirementPublishedEvent,
  RequirementClosedEvent,
} from "./requirement.js";