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

// Requirement status
export const RequirementStatus = z.enum([
  "DRAFT",
  "OPEN",
  "FILLED",
  "CLOSED",
  "CANCELLED",
]);
export type RequirementStatus = z.infer<typeof RequirementStatus>;

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
