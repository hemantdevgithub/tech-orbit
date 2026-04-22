import { z } from "zod";
import {
  Seniority,
  BackgroundCheckStatus,
  BenchAvailability,
  CompanySizeRange,
  CustomerStatus,
  InterviewType,
  CalendarProvider,
  InterviewerStatus,
  MsmeStatus,
  WorkAuthStatus,
} from "./enums.js";

// ─── Availability slot (used by InterviewerProfile) ─────────────────────────

export const AvailabilitySlotSchema = z.object({
  date: z.string(),       // ISO date "YYYY-MM-DD"
  startTime: z.string(),  // "HH:mm"
  endTime: z.string(),    // "HH:mm"
  timezone: z.string(),
});
export type AvailabilitySlot = z.infer<typeof AvailabilitySlotSchema>;

// ─── Candidate ───────────────────────────────────────────────────────────────

export const CandidateProfileResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  headline: z.string().nullable(),
  bio: z.string().nullable(),
  location: z.string().nullable(),
  seniority: Seniority.nullable(),
  skills: z.array(z.string()),
  workAuthStatus: WorkAuthStatus.nullable(),
  workAuthExpiry: z.string().nullable(),
  availableFrom: z.string().nullable(),
  rateMin: z.number().int().nullable(),
  rateMax: z.number().int().nullable(),
  preferRemote: z.boolean(),
  preferHybrid: z.boolean(),
  preferOnsite: z.boolean(),
  locationPreference: z.string().nullable(),
  resumeFileId: z.string().nullable(),
  backgroundCheckStatus: BackgroundCheckStatus,
  kycVerified: z.boolean(),
  averageRating: z.string().nullable(),
  ratingCount: z.number().int(),
  isProfileComplete: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CandidateProfileResponse = z.infer<typeof CandidateProfileResponseSchema>;

export const UpdateCandidateProfileSchema = z.object({
  headline: z.string().max(160).optional(),
  bio: z.string().max(2000).optional(),
  location: z.string().optional(),
  seniority: Seniority.optional(),
  skills: z.array(z.string().max(60)).max(40).optional(),
  workAuthStatus: WorkAuthStatus.optional(),
  workAuthExpiry: z.string().datetime().optional().nullable(),
  availableFrom: z.string().datetime().optional().nullable(),
  rateMin: z.number().int().min(0).optional().nullable(),
  rateMax: z.number().int().min(0).optional().nullable(),
  preferRemote: z.boolean().optional(),
  preferHybrid: z.boolean().optional(),
  preferOnsite: z.boolean().optional(),
  locationPreference: z.string().optional().nullable(),
});
export type UpdateCandidateProfile = z.infer<typeof UpdateCandidateProfileSchema>;

export const StartKycResponseSchema = z.object({
  sessionUrl: z.string(),
  sessionId: z.string(),
  isMock: z.boolean(),
});

// ─── MSME ────────────────────────────────────────────────────────────────────

export const MsmeProfileResponseSchema = z.object({
  id: z.string(),
  ownerUserId: z.string(),
  legalName: z.string(),
  dba: z.string().nullable(),
  hasEin: z.boolean(),
  gstin: z.string().nullable(),
  countryOfIncorp: z.string().nullable(),
  website: z.string().nullable(),
  yearsInBusiness: z.number().int().nullable(),
  totalEmployees: z.number().int().nullable(),
  currentBenchSize: z.number().int(),
  w9FileId: z.string().nullable(),
  primaryContactName: z.string().nullable(),
  primaryContactEmail: z.string().nullable(),
  primaryContactPhone: z.string().nullable(),
  status: MsmeStatus,
  isProfileComplete: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MsmeProfileResponse = z.infer<typeof MsmeProfileResponseSchema>;

export const CreateMsmeProfileSchema = z.object({
  legalName: z.string().min(1).max(200),
  dba: z.string().max(200).optional(),
  ein: z.string().regex(/^\d{2}-\d{7}$/, "EIN must be in format XX-XXXXXXX").optional(),
  gstin: z.string().optional(),
  countryOfIncorp: z.string().optional(),
  website: z.string().url().optional(),
  yearsInBusiness: z.number().int().min(0).optional(),
  totalEmployees: z.number().int().min(1).optional(),
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().email().optional(),
  primaryContactPhone: z.string().optional(),
});
export type CreateMsmeProfile = z.infer<typeof CreateMsmeProfileSchema>;

export const UpdateMsmeProfileSchema = CreateMsmeProfileSchema.partial();
export type UpdateMsmeProfile = z.infer<typeof UpdateMsmeProfileSchema>;

export const BenchEntryResponseSchema = z.object({
  id: z.string(),
  msmeId: z.string(),
  candidateUserId: z.string(),
  availability: BenchAvailability,
  expectedRateMin: z.number().int().nullable(),
  expectedRateMax: z.number().int().nullable(),
  skills: z.array(z.string()),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BenchEntryResponse = z.infer<typeof BenchEntryResponseSchema>;

export const AddBenchEntrySchema = z.object({
  candidateUserId: z.string().uuid(),
  availability: BenchAvailability.optional().default("AVAILABLE"),
  expectedRateMin: z.number().int().min(0).optional(),
  expectedRateMax: z.number().int().min(0).optional(),
  skills: z.array(z.string()).optional().default([]),
  notes: z.string().max(1000).optional(),
});
export type AddBenchEntry = z.infer<typeof AddBenchEntrySchema>;

// ─── Customer ─────────────────────────────────────────────────────────────────

export const CustomerCompanyResponseSchema = z.object({
  id: z.string(),
  primaryUserId: z.string(),
  legalName: z.string(),
  dba: z.string().nullable(),
  hasEin: z.boolean(),
  industry: z.string().nullable(),
  companySizeRange: CompanySizeRange.nullable(),
  website: z.string().nullable(),
  billingStreet: z.string().nullable(),
  billingCity: z.string().nullable(),
  billingState: z.string().nullable(),
  billingZip: z.string().nullable(),
  billingCountry: z.string().nullable(),
  defaultNetTerms: z.number().int(),
  attributedCrmUserId: z.string().nullable(),
  status: CustomerStatus,
  isProfileComplete: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CustomerCompanyResponse = z.infer<typeof CustomerCompanyResponseSchema>;

export const CreateCustomerCompanySchema = z.object({
  legalName: z.string().min(1).max(200),
  dba: z.string().max(200).optional(),
  ein: z.string().regex(/^\d{2}-\d{7}$/, "EIN must be in format XX-XXXXXXX").optional(),
  industry: z.string().optional(),
  companySizeRange: CompanySizeRange.optional(),
  website: z.string().url().optional(),
  billingStreet: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZip: z.string().optional(),
  billingCountry: z.string().optional(),
  defaultNetTerms: z.number().int().min(0).optional().default(30),
});
export type CreateCustomerCompany = z.infer<typeof CreateCustomerCompanySchema>;

export const UpdateCustomerCompanySchema = CreateCustomerCompanySchema.partial();
export type UpdateCustomerCompany = z.infer<typeof UpdateCustomerCompanySchema>;

export const AttributeCrmSchema = z.object({
  crmUserId: z.string().uuid(),
});

// ─── Interviewer ──────────────────────────────────────────────────────────────

export const InterviewerProfileResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  displayName: z.string().nullable(),
  headline: z.string().nullable(),
  bio: z.string().nullable(),
  currentRole: z.string().nullable(),
  currentCompany: z.string().nullable(),
  specializations: z.array(z.string()),
  seniorityLevelsCoverable: z.array(Seniority),
  interviewTypes: z.array(InterviewType),
  perInterviewFeeUsd: z.number().int().nullable(),
  timezone: z.string().nullable(),
  videoIntroFileId: z.string().nullable(),
  linkedinVerified: z.boolean(),
  calendarProvider: CalendarProvider.nullable(),
  stripeAccountId: z.string().nullable(),
  availabilitySlots: z.array(AvailabilitySlotSchema),
  status: InterviewerStatus,
  isProfileComplete: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type InterviewerProfileResponse = z.infer<typeof InterviewerProfileResponseSchema>;

export const CreateInterviewerProfileSchema = z.object({
  displayName: z.string().max(100).optional(),
  headline: z.string().max(160).optional(),
  bio: z.string().max(2000).optional(),
  currentRole: z.string().optional(),
  currentCompany: z.string().optional(),
  specializations: z.array(z.string().max(60)).max(20).optional().default([]),
  seniorityLevelsCoverable: z.array(Seniority).optional().default([]),
  interviewTypes: z.array(InterviewType).optional().default([]),
  perInterviewFeeUsd: z.number().int().min(0).optional(),
  timezone: z.string().optional(),
});
export type CreateInterviewerProfile = z.infer<typeof CreateInterviewerProfileSchema>;

export const UpdateInterviewerProfileSchema = CreateInterviewerProfileSchema.partial();
export type UpdateInterviewerProfile = z.infer<typeof UpdateInterviewerProfileSchema>;

export const SetAvailabilitySchema = z.object({
  slots: z.array(AvailabilitySlotSchema).max(100),
});
export type SetAvailability = z.infer<typeof SetAvailabilitySchema>;

export const CalendarConnectResponseSchema = z.object({
  provider: CalendarProvider,
  connected: z.boolean(),
  isMock: z.boolean().optional(),
});

// ─── Profile event schemas ───────────────────────────────────────────────────

const EventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  version: z.literal(1),
});

export const CandidateProfileCompletedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("candidate.profile_completed.v1"),
  payload: z.object({
    candidateProfileId: z.string(),
    userId: z.string(),
    seniority: Seniority.nullable(),
    skills: z.array(z.string()),
  }),
});

export const MsmeProfileCreatedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("msme.profile_created.v1"),
  payload: z.object({
    msmeProfileId: z.string(),
    ownerUserId: z.string(),
    legalName: z.string(),
  }),
});

export const CustomerProfileCreatedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("customer.profile_created.v1"),
  payload: z.object({
    customerProfileId: z.string(),
    primaryUserId: z.string(),
    legalName: z.string(),
  }),
});

export const InterviewerProfileCreatedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("interviewer.profile_created.v1"),
  payload: z.object({
    interviewerProfileId: z.string(),
    userId: z.string(),
  }),
});

export const CrmAttributedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("customer.crm_attributed.v1"),
  payload: z.object({
    customerProfileId: z.string(),
    primaryUserId: z.string(),
    crmUserId: z.string(),
  }),
});

// ─── File schemas ────────────────────────────────────────────────────────────

export const FileUploadUrlRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string(),
  purpose: z.enum(["RESUME", "CONTRACT", "W9", "VIDEO_INTRO", "PROFILE_PHOTO"]),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024), // 50 MB max
});
export type FileUploadUrlRequest = z.infer<typeof FileUploadUrlRequestSchema>;

export const FileUploadUrlResponseSchema = z.object({
  fileId: z.string(),
  uploadUrl: z.string(),
  method: z.enum(["PUT", "POST"]),
  expiresAt: z.string(),
  isLocal: z.boolean(),
});
export type FileUploadUrlResponse = z.infer<typeof FileUploadUrlResponseSchema>;

export const FileResponseSchema = z.object({
  id: z.string(),
  filename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int(),
  purpose: z.string(),
  status: z.string(),
  downloadUrl: z.string().optional(),
  createdAt: z.string(),
});
export type FileResponse = z.infer<typeof FileResponseSchema>;
