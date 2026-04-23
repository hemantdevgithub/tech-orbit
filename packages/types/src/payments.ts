import { z } from "zod";
import {
  CommissionSlot,
  InvoiceStatus,
  InvoiceType,
  PayoutStatus,
  TimesheetStatus,
} from "./enums.js";

// ─── Timesheet schemas ───────────────────────────────────────────────────────

export const SubmitTimesheetRequestSchema = z.object({
  placementId: z.string().uuid(),
  weekStartDate: z.string().datetime(),
  hoursWorked: z.number().positive().max(168),
  description: z.string().max(2000).optional(),
});
export type SubmitTimesheetRequest = z.infer<typeof SubmitTimesheetRequestSchema>;

export const UpdateTimesheetSchema = z.object({
  hoursWorked: z.number().positive().max(168).optional(),
  description: z.string().max(2000).optional(),
});
export type UpdateTimesheet = z.infer<typeof UpdateTimesheetSchema>;

export const RejectTimesheetSchema = z.object({
  reason: z.string().min(1).max(500),
});
export type RejectTimesheet = z.infer<typeof RejectTimesheetSchema>;

export const TimesheetFilterSchema = z.object({
  placementId: z.string().uuid().optional(),
  candidateId: z.string().uuid().optional(),
  status: TimesheetStatus.optional(),
  weekStartFrom: z.string().datetime().optional(),
  weekStartTo: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type TimesheetFilter = z.infer<typeof TimesheetFilterSchema>;

export const TimesheetResponseSchema = z.object({
  id: z.string().uuid(),
  placementId: z.string().uuid(),
  candidateId: z.string().uuid(),
  weekStartDate: z.string().datetime(),
  weekEndDate: z.string().datetime(),
  hoursWorked: z.number(),
  description: z.string().nullable(),
  status: TimesheetStatus,
  submittedAt: z.string().datetime().nullable(),
  approvedAt: z.string().datetime().nullable(),
  approvedBy: z.string().uuid().nullable(),
  rejectedAt: z.string().datetime().nullable(),
  rejectedBy: z.string().uuid().nullable(),
  rejectionReason: z.string().nullable(),
  invoiceId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TimesheetResponse = z.infer<typeof TimesheetResponseSchema>;

export const TimesheetListResponseSchema = z.object({
  data: z.array(TimesheetResponseSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type TimesheetListResponse = z.infer<typeof TimesheetListResponseSchema>;

// ─── Invoice schemas ─────────────────────────────────────────────────────────

export const InvoiceFilterSchema = z.object({
  customerCompanyId: z.string().uuid().optional(),
  invoiceType: InvoiceType.optional(),
  status: InvoiceStatus.optional(),
  billingPeriodFrom: z.string().datetime().optional(),
  billingPeriodTo: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type InvoiceFilter = z.infer<typeof InvoiceFilterSchema>;

export const InvoiceLineItemResponseSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string().uuid(),
  placementId: z.string().uuid(),
  timesheetId: z.string().uuid().nullable(),
  interviewId: z.string().uuid().nullable(),
  description: z.string(),
  hoursWorked: z.number().nullable(),
  rateUsd: z.number().nullable(),
  amountUsd: z.number(),
  createdAt: z.string().datetime(),
});
export type InvoiceLineItemResponse = z.infer<typeof InvoiceLineItemResponseSchema>;

export const InvoiceResponseSchema = z.object({
  id: z.string().uuid(),
  customerCompanyId: z.string().uuid(),
  placementId: z.string().uuid().nullable(),
  invoiceType: InvoiceType,
  billingPeriodStart: z.string().datetime(),
  billingPeriodEnd: z.string().datetime(),
  subtotalUsd: z.number(),
  taxUsd: z.number(),
  totalUsd: z.number(),
  status: InvoiceStatus,
  sentAt: z.string().datetime().nullable(),
  dueDate: z.string().datetime().nullable(),
  paidAt: z.string().datetime().nullable(),
  stripeInvoiceId: z.string().nullable(),
  stripePaymentIntentId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lineItems: z.array(InvoiceLineItemResponseSchema),
});
export type InvoiceResponse = z.infer<typeof InvoiceResponseSchema>;

export const InvoiceListResponseSchema = z.object({
  data: z.array(
    InvoiceResponseSchema.omit({ lineItems: true }),
  ),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type InvoiceListResponse = z.infer<typeof InvoiceListResponseSchema>;

// ─── Payout schemas ──────────────────────────────────────────────────────────

export const PayoutFilterSchema = z.object({
  invoiceId: z.string().uuid().optional(),
  placementId: z.string().uuid().optional(),
  beneficiaryUserId: z.string().uuid().optional(),
  beneficiaryMsmeId: z.string().uuid().optional(),
  status: PayoutStatus.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PayoutFilter = z.infer<typeof PayoutFilterSchema>;

export const CommissionPayoutResponseSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string().uuid(),
  placementId: z.string().uuid(),
  commissionRuleId: z.string().uuid(),
  beneficiaryUserId: z.string().uuid().nullable(),
  beneficiaryMsmeId: z.string().uuid().nullable(),
  slot: CommissionSlot,
  amountUsd: z.number(),
  status: PayoutStatus,
  processedAt: z.string().datetime().nullable(),
  stripeTransferId: z.string().nullable(),
  gustoPayrollId: z.string().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CommissionPayoutResponse = z.infer<typeof CommissionPayoutResponseSchema>;

export const CommissionPayoutListResponseSchema = z.object({
  data: z.array(CommissionPayoutResponseSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type CommissionPayoutListResponse = z.infer<typeof CommissionPayoutListResponseSchema>;

// ─── Internal: weekly invoice trigger ────────────────────────────────────────

export const GenerateWeeklyInvoicesRequestSchema = z.object({
  billingPeriodStart: z.string().datetime(),
  billingPeriodEnd: z.string().datetime(),
});
export type GenerateWeeklyInvoicesRequest = z.infer<typeof GenerateWeeklyInvoicesRequestSchema>;

// ─── Events ──────────────────────────────────────────────────────────────────

const EventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  version: z.literal(1),
});

export const TimesheetSubmittedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("timesheet.submitted.v1"),
  payload: z.object({
    timesheetId: z.string().uuid(),
    placementId: z.string().uuid(),
    candidateId: z.string().uuid(),
    weekStartDate: z.string().datetime(),
    hoursWorked: z.number(),
    submittedAt: z.string().datetime(),
  }),
});
export type TimesheetSubmittedEvent = z.infer<typeof TimesheetSubmittedEventSchema>;

export const TimesheetApprovedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("timesheet.approved.v1"),
  payload: z.object({
    timesheetId: z.string().uuid(),
    placementId: z.string().uuid(),
    approvedBy: z.string().uuid(),
    approvedAt: z.string().datetime(),
  }),
});
export type TimesheetApprovedEvent = z.infer<typeof TimesheetApprovedEventSchema>;

export const InvoiceGeneratedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("invoice.generated.v1"),
  payload: z.object({
    invoiceId: z.string().uuid(),
    customerCompanyId: z.string().uuid(),
    invoiceType: InvoiceType,
    billingPeriodStart: z.string().datetime(),
    totalUsd: z.number(),
    generatedAt: z.string().datetime(),
  }),
});
export type InvoiceGeneratedEvent = z.infer<typeof InvoiceGeneratedEventSchema>;

export const PayoutProcessedEventSchema = EventEnvelopeSchema.extend({
  type: z.literal("payout.processed.v1"),
  payload: z.object({
    payoutId: z.string().uuid(),
    invoiceId: z.string().uuid(),
    beneficiaryUserId: z.string().uuid().nullable(),
    beneficiaryMsmeId: z.string().uuid().nullable(),
    slot: CommissionSlot,
    amountUsd: z.number(),
    status: PayoutStatus,
    processedAt: z.string().datetime(),
  }),
});
export type PayoutProcessedEvent = z.infer<typeof PayoutProcessedEventSchema>;
