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
  "ACTIVE",
  "ENDED_COMPLETED",
  "ENDED_EARLY",
  "SUSPENDED",
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

// Notification delivery channel (email/SMS/push/in-app)
export const NotificationChannel = z.enum([
  "EMAIL",
  "SMS",
  "PUSH",
  "IN_APP",
]);
export type NotificationChannel = z.infer<typeof NotificationChannel>;

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
  "INVITED",
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

export const RecordingStatus = z.enum([
  "NONE",
  "RECORDING",
  "PROCESSING",
  "READY",
  "FAILED",
]);
export type RecordingStatus = z.infer<typeof RecordingStatus>;

export const Recommendation = z.enum([
  "STRONG_YES",
  "YES",
  "WEAK_YES",
  "WEAK_NO",
  "NO",
  "STRONG_NO",
]);
export type Recommendation = z.infer<typeof Recommendation>;

// Placement enums
export const EngagementType = z.enum(["W2", "C2C", "IC_1099"]);
export type EngagementType = z.infer<typeof EngagementType>;

export const CommissionSlot = z.enum([
  "CRM",
  "SRM",
  "MSME",
  "CANDIDATE_W2",
  "INTERVIEWER",
  "PLATFORM",
]);
export type CommissionSlot = z.infer<typeof CommissionSlot>;

export const CommissionCalc = z.enum(["PERCENT_OF_BILL", "FLAT_FEE", "RESIDUAL"]);
export type CommissionCalc = z.infer<typeof CommissionCalc>;

// Payments enums
export const TimesheetStatus = z.enum([
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "INVOICED",
]);
export type TimesheetStatus = z.infer<typeof TimesheetStatus>;

export const InvoiceType = z.enum(["WEEKLY_HOURS", "INTERVIEWER_FEES"]);
export type InvoiceType = z.infer<typeof InvoiceType>;

export const InvoiceStatus = z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "SETTLED"]);
export type InvoiceStatus = z.infer<typeof InvoiceStatus>;

export const PayoutStatus = z.enum([
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "SETTLED",
]);
export type PayoutStatus = z.infer<typeof PayoutStatus>;

// File enums
export const FilePurpose = z.enum([
  "RESUME",
  "CONTRACT",
  "W9",
  "VIDEO_INTRO",
  "PROFILE_PHOTO",
  "INTERVIEW_RECORDING",
]);
export type FilePurpose = z.infer<typeof FilePurpose>;

export const FileStatus = z.enum(["PENDING", "CONFIRMED", "VIRUS_DETECTED", "DELETED"]);
export type FileStatus = z.infer<typeof FileStatus>;

// Sprint 8 — communications enums
export const ThreadContextType = z.enum([
  "REQUIREMENT",
  "SUBMISSION",
  "INTERVIEW",
  "PLACEMENT",
  "GENERAL",
]);
export type ThreadContextType = z.infer<typeof ThreadContextType>;

export const NotificationType = z.enum([
  "REQUIREMENT_PUBLISHED",
  "REQUIREMENT_ASSIGNED",
  "SUBMISSION_RECEIVED",
  "SUBMISSION_INVITED",
  "SUBMISSION_INVITE_ACCEPTED",
  "SUBMISSION_INVITE_DECLINED",
  "PORTFOLIO_INVITATION",
  "PORTFOLIO_REQUEST",
  "PORTFOLIO_APPROVED",
  "MSME_ASSIGNMENT",
  "INTERVIEW_SCHEDULED",
  "TIMESHEET_SUBMITTED",
  "TIMESHEET_APPROVED",
  "INVOICE_GENERATED",
  "PAYOUT_COMPLETED",
  "MESSAGE_RECEIVED",
  "RATING_RECEIVED",
]);
export type NotificationType = z.infer<typeof NotificationType>;

// Sprint 12 — SRM portfolio (two-sided handshake) enums
export const PortfolioMembershipStatus = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export type PortfolioMembershipStatus = z.infer<typeof PortfolioMembershipStatus>;

export const PortfolioInitiator = z.enum(["SRM", "MEMBER"]);
export type PortfolioInitiator = z.infer<typeof PortfolioInitiator>;

export const PortfolioMemberType = z.enum(["CANDIDATE", "MSME"]);
export type PortfolioMemberType = z.infer<typeof PortfolioMemberType>;

export const RaterRole = z.enum(["CUSTOMER", "CANDIDATE"]);
export type RaterRole = z.infer<typeof RaterRole>;

// Sprint 9 — admin enums
export const ApplicationRole = z.enum(["CRM", "SRM", "MSME", "INTERVIEWER"]);
export type ApplicationRole = z.infer<typeof ApplicationRole>;

export const ApplicationStatus = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export type ApplicationStatus = z.infer<typeof ApplicationStatus>;

export const DisputeType = z.enum([
  "TIMESHEET",
  "COMMISSION",
  "PAYMENT",
  "CONDUCT",
  "OTHER",
]);
export type DisputeType = z.infer<typeof DisputeType>;

export const DisputeStatus = z.enum([
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED",
  "CLOSED",
]);
export type DisputeStatus = z.infer<typeof DisputeStatus>;

export const UserStatus = z.enum([
  "ACTIVE",
  "SUSPENDED",
  "BANNED",
  "DELETED",
]);
export type UserStatus = z.infer<typeof UserStatus>;

export const SuspendDuration = z.enum([
  "SEVEN_DAYS",
  "THIRTY_DAYS",
  "NINETY_DAYS",
  "INDEFINITE",
]);
export type SuspendDuration = z.infer<typeof SuspendDuration>;
