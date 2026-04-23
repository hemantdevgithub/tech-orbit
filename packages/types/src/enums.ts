import { z } from "zod";

// User roles
export const UserRoleType = z.enum([
  "CUSTOMER",
  "CRM",
  "SRM",
  "CANDIDATE",
  "MSME",
  "INTERVIEWER",
  "ADMIN",
]);
export type UserRoleType = z.infer<typeof UserRoleType>;

// Work authorization
export const WorkAuthStatus = z.enum([
  "US_CITIZEN",
  "GREEN_CARD",
  "H1B",
  "L1",
  "OPT",
  "CPT",
  "TN",
  "OTHER",
]);
export type WorkAuthStatus = z.infer<typeof WorkAuthStatus>;

// Candidate status
export const CandidateStatus = z.enum([
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "INTERVIEWING",
  "OFFER_EXTENDED",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
]);
export type CandidateStatus = z.infer<typeof CandidateStatus>;

// Requirement status (see ENGINEERING_SPEC 5.4)
export const RequirementStatus = z.enum([
  "DRAFT",
  "OPEN",
  "INTERVIEWING",
  "OFFER_EXTENDED",
  "PLACED",
  "CLOSED",
  "CANCELLED",
]);
export type RequirementStatus = z.infer<typeof RequirementStatus>;

// Work location mode for a requirement
export const LocationType = z.enum(["ONSITE", "HYBRID", "REMOTE"]);
export type LocationType = z.infer<typeof LocationType>;

// CRM attribution request lifecycle (PRD 6.2)
export const CrmAttributionStatus = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export type CrmAttributionStatus = z.infer<typeof CrmAttributionStatus>;

// Interview status
export const InterviewStatus = z.enum([
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);
export type InterviewStatus = z.infer<typeof InterviewStatus>;

// Placement status
export const PlacementStatus = z.enum([
  "PROBATION",
  "ACTIVE",
  "PAUSED",
  "TERMINATED",
]);
export type PlacementStatus = z.infer<typeof PlacementStatus>;

// Payment status
export const PaymentStatus = z.enum([
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
]);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

// Notification type
export const NotificationType = z.enum([
  "EMAIL",
  "SMS",
  "PUSH",
  "IN_APP",
]);
export type NotificationType = z.infer<typeof NotificationType>;

// Rating type
export const RatingType = z.enum([
  "INTERVIEW",
  "PLACEMENT",
  "SRM",
  "MSME",
]);
export type RatingType = z.infer<typeof RatingType>;

// Profile enums
export const Seniority = z.enum(["JUNIOR", "MID", "SENIOR", "STAFF", "PRINCIPAL", "PARTNER"]);
export type Seniority = z.infer<typeof Seniority>;

export const BackgroundCheckStatus = z.enum([
  "NOT_INITIATED", "INITIATED", "IN_PROGRESS", "CLEAR", "CONSIDER", "FAILED",
]);
export type BackgroundCheckStatus = z.infer<typeof BackgroundCheckStatus>;

export const BenchAvailability = z.enum(["AVAILABLE", "ENGAGED", "NOTICE_PERIOD", "UNAVAILABLE"]);
export type BenchAvailability = z.infer<typeof BenchAvailability>;

export const CompanySizeRange = z.enum([
  "SIZE_1_10", "SIZE_11_50", "SIZE_51_200", "SIZE_201_500", "SIZE_501_1000", "SIZE_1001_PLUS",
]);
export type CompanySizeRange = z.infer<typeof CompanySizeRange>;

export const CustomerStatus = z.enum(["PENDING", "ACTIVE", "SUSPENDED"]);
export type CustomerStatus = z.infer<typeof CustomerStatus>;

export const InterviewType = z.enum([
  "TECHNICAL_CODING", "SYSTEM_DESIGN", "BEHAVIORAL", "CASE_STUDY", "DOMAIN_SPECIFIC",
]);
export type InterviewType = z.infer<typeof InterviewType>;

export const CalendarProvider = z.enum(["GOOGLE", "OUTLOOK"]);
export type CalendarProvider = z.infer<typeof CalendarProvider>;

export const InterviewerStatus = z.enum(["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED"]);
export type InterviewerStatus = z.infer<typeof InterviewerStatus>;

export const MsmeStatus = z.enum(["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED"]);
export type MsmeStatus = z.infer<typeof MsmeStatus>;

// Matching / submission enums
export const SubmitterRole = z.enum(["CANDIDATE_SELF", "SRM", "MSME"]);
export type SubmitterRole = z.infer<typeof SubmitterRole>;

export const SubmissionStatus = z.enum([
  "SUBMITTED",
  "SCREENING",
  "INTERVIEWING",
  "OFFER",
  "PLACED",
  "REJECTED",
  "WITHDRAWN",
]);
export type SubmissionStatus = z.infer<typeof SubmissionStatus>;

// Interview enums
export const InterviewerRole = z.enum(["PLATFORM_INTERVIEWER", "CUSTOMER_INTERNAL"]);
export type InterviewerRole = z.infer<typeof InterviewerRole>;

export const Recommendation = z.enum([
  "STRONG_YES",
  "YES",
  "WEAK_YES",
  "WEAK_NO",
  "NO",
  "STRONG_NO",
]);
export type Recommendation = z.infer<typeof Recommendation>;

// File enums
export const FilePurpose = z.enum(["RESUME", "CONTRACT", "W9", "VIDEO_INTRO", "PROFILE_PHOTO"]);
export type FilePurpose = z.infer<typeof FilePurpose>;

export const FileStatus = z.enum(["PENDING", "CONFIRMED", "VIRUS_DETECTED", "DELETED"]);
export type FileStatus = z.infer<typeof FileStatus>;
