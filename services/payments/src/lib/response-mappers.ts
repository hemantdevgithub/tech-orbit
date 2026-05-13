import { Decimal } from "@prisma/client/runtime/library";
import type {
  CommissionPayout,
  Invoice,
  InvoiceLineItem,
  Timesheet,
} from "../generated/client/index.js";
import type {
  CommissionPayoutResponse,
  InvoiceLineItemResponse,
  InvoiceResponse,
  TimesheetResponse,
} from "@techorbit/types";

function num(d: Decimal | number | null | undefined): number | null {
  if (d === null || d === undefined) return null;
  return d instanceof Decimal ? Number(d.toFixed(2)) : Number(d);
}

export function toTimesheetResponse(t: Timesheet): TimesheetResponse {
  return {
    id: t.id,
    placementId: t.placementId,
    candidateId: t.candidateId,
    weekStartDate: t.weekStartDate.toISOString(),
    weekEndDate: t.weekEndDate.toISOString(),
    hoursWorked: num(t.hoursWorked) ?? 0,
    description: t.description,
    status: t.status,
    submittedAt: t.submittedAt?.toISOString() ?? null,
    approvedAt: t.approvedAt?.toISOString() ?? null,
    approvedBy: t.approvedBy,
    rejectedAt: t.rejectedAt?.toISOString() ?? null,
    rejectedBy: t.rejectedBy,
    rejectionReason: t.rejectionReason,
    invoiceId: t.invoiceId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function toInvoiceLineItemResponse(li: InvoiceLineItem): InvoiceLineItemResponse {
  return {
    id: li.id,
    invoiceId: li.invoiceId,
    placementId: li.placementId,
    timesheetId: li.timesheetId,
    interviewId: li.interviewId,
    description: li.description,
    hoursWorked: num(li.hoursWorked),
    rateUsd: num(li.rateUsd),
    amountUsd: num(li.amountUsd) ?? 0,
    createdAt: li.createdAt.toISOString(),
  };
}

export function toInvoiceResponse(
  i: Invoice & { lineItems?: InvoiceLineItem[] },
): InvoiceResponse {
  return {
    id: i.id,
    customerCompanyId: i.customerCompanyId,
    placementId: i.placementId,
    invoiceType: i.invoiceType,
    billingPeriodStart: i.billingPeriodStart.toISOString(),
    billingPeriodEnd: i.billingPeriodEnd.toISOString(),
    subtotalUsd: num(i.subtotalUsd) ?? 0,
    taxUsd: num(i.taxUsd) ?? 0,
    totalUsd: num(i.totalUsd) ?? 0,
    status: i.status,
    sentAt: i.sentAt?.toISOString() ?? null,
    dueDate: i.dueDate?.toISOString() ?? null,
    paidAt: i.paidAt?.toISOString() ?? null,
    stripeInvoiceId: i.stripeInvoiceId,
    stripePaymentIntentId: i.stripePaymentIntentId,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
    lineItems: (i.lineItems ?? []).map(toInvoiceLineItemResponse),
  };
}

export function toPayoutResponse(p: CommissionPayout): CommissionPayoutResponse {
  return {
    id: p.id,
    invoiceId: p.invoiceId,
    placementId: p.placementId,
    commissionRuleId: p.commissionRuleId,
    beneficiaryUserId: p.beneficiaryUserId,
    beneficiaryMsmeId: p.beneficiaryMsmeId,
    slot: p.slot as CommissionPayoutResponse["slot"],
    amountUsd: num(p.amountUsd) ?? 0,
    status: p.status,
    processedAt: p.processedAt?.toISOString() ?? null,
    stripeTransferId: p.stripeTransferId,
    gustoPayrollId: p.gustoPayrollId,
    failureReason: p.failureReason,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
