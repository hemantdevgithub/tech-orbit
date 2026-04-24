import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { z } from "zod";

import {
  CommissionPayoutListResponseSchema,
  CommissionPayoutResponseSchema,
  ErrorResponse,
  GenerateWeeklyInvoicesRequestSchema,
  InvoiceFilterSchema,
  InvoiceListResponseSchema,
  InvoiceResponseSchema,
  PayoutFilterSchema,
  RejectTimesheetSchema,
  SubmitTimesheetRequestSchema,
  TimesheetFilterSchema,
  TimesheetListResponseSchema,
  TimesheetResponseSchema,
  UpdateTimesheetSchema,
} from "@techorbit/types";

extendZodWithOpenApi(z);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, "../openapi.yaml");

const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

const security = [{ bearerAuth: [] }];

const ErrorRef = registry.register("ErrorResponse", ErrorResponse);
const SubmitTimesheetRef = registry.register("SubmitTimesheetRequest", SubmitTimesheetRequestSchema);
const UpdateTimesheetRef = registry.register("UpdateTimesheet", UpdateTimesheetSchema);
const RejectTimesheetRef = registry.register("RejectTimesheet", RejectTimesheetSchema);
const TimesheetResponseRef = registry.register("TimesheetResponse", TimesheetResponseSchema);
const TimesheetListResponseRef = registry.register("TimesheetListResponse", TimesheetListResponseSchema);
const InvoiceResponseRef = registry.register("InvoiceResponse", InvoiceResponseSchema);
const InvoiceListResponseRef = registry.register("InvoiceListResponse", InvoiceListResponseSchema);
const CommissionPayoutResponseRef = registry.register("CommissionPayoutResponse", CommissionPayoutResponseSchema);
const CommissionPayoutListResponseRef = registry.register("CommissionPayoutListResponse", CommissionPayoutListResponseSchema);
const GenerateWeeklyInvoicesRef = registry.register("GenerateWeeklyInvoicesRequest", GenerateWeeklyInvoicesRequestSchema);

const json = (s: ReturnType<OpenAPIRegistry["register"]>) => ({
  content: { "application/json": { schema: s } },
});
const err = (d: string) => ({ description: d, ...json(ErrorRef) });

// ─── Timesheets ──────────────────────────────────────────────────────────────

registry.registerPath({
  method: "post", path: "/api/v1/timesheets", tags: ["Timesheets"],
  summary: "Submit a timesheet for a placement week (CANDIDATE on ACTIVE placement)", security,
  description:
    "Candidate submits weekly hours for an ACTIVE placement. Week starts Monday; hours are 0–168. " +
    "Creates in SUBMITTED status. Idempotent per (placementId, weekStartDate) — resubmit on a " +
    "REJECTED row transitions back to SUBMITTED.",
  request: { body: json(SubmitTimesheetRef) },
  responses: {
    201: { description: "Submitted", ...json(TimesheetResponseRef) },
    400: err("Validation error (e.g. week in future, hours out of range)"),
    401: err("Unauthorized"),
    403: err("Forbidden — caller is not the candidate on this placement"),
    409: err("Placement not ACTIVE, or week already INVOICED"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/timesheets", tags: ["Timesheets"],
  summary: "List timesheets with filters (candidate=own, customer=placements they own)", security,
  request: { query: TimesheetFilterSchema },
  responses: {
    200: { description: "Paginated list", ...json(TimesheetListResponseRef) },
    401: err("Unauthorized"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/timesheets/{id}", tags: ["Timesheets"],
  summary: "Get a single timesheet", security,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Timesheet", ...json(TimesheetResponseRef) },
    401: err("Unauthorized"),
    403: err("Forbidden — caller is neither candidate nor customer on the placement"),
    404: err("Not found"),
  },
});

registry.registerPath({
  method: "patch", path: "/api/v1/timesheets/{id}", tags: ["Timesheets"],
  summary: "Update a DRAFT or REJECTED timesheet (candidate only)", security,
  description: "Resubmits when called on a REJECTED row (transitions back to SUBMITTED).",
  request: { params: z.object({ id: z.string().uuid() }), body: json(UpdateTimesheetRef) },
  responses: {
    200: { description: "Updated", ...json(TimesheetResponseRef) },
    400: err("Validation error"),
    401: err("Unauthorized"),
    403: err("Forbidden — not the candidate"),
    404: err("Not found"),
    409: err("Not in DRAFT or REJECTED status"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/timesheets/{id}/approve", tags: ["Timesheets"],
  summary: "Approve a SUBMITTED timesheet (CUSTOMER only)", security,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Approved", ...json(TimesheetResponseRef) },
    401: err("Unauthorized"),
    403: err("Forbidden — not the customer on this placement"),
    404: err("Not found"),
    409: err("Not in SUBMITTED status"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/timesheets/{id}/reject", tags: ["Timesheets"],
  summary: "Reject a SUBMITTED timesheet with reason (CUSTOMER only)", security,
  request: { params: z.object({ id: z.string().uuid() }), body: json(RejectTimesheetRef) },
  responses: {
    200: { description: "Rejected", ...json(TimesheetResponseRef) },
    400: err("Validation error"),
    401: err("Unauthorized"),
    403: err("Forbidden — not the customer"),
    404: err("Not found"),
    409: err("Not in SUBMITTED status"),
  },
});

// ─── Invoices ────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get", path: "/api/v1/invoices", tags: ["Invoices"],
  summary: "List invoices (customer=own invoices, admin=all)", security,
  request: { query: InvoiceFilterSchema },
  responses: {
    200: { description: "Paginated list", ...json(InvoiceListResponseRef) },
    401: err("Unauthorized"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/invoices/{id}", tags: ["Invoices"],
  summary: "Get invoice with line items", security,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Invoice", ...json(InvoiceResponseRef) },
    401: err("Unauthorized"),
    403: err("Forbidden — not the customer on this invoice"),
    404: err("Not found"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/invoices/{id}/mark-paid", tags: ["Invoices"],
  summary: "Mark invoice as paid (ADMIN only — Stripe webhook replacement for v1)", security,
  description:
    "Transitions SENT → PAID, sets paidAt, and kicks off payout processing (PENDING → PROCESSING → COMPLETED).",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Paid", ...json(InvoiceResponseRef) },
    401: err("Unauthorized"),
    403: err("Forbidden — admin required"),
    404: err("Not found"),
    409: err("Not in SENT status"),
  },
});

// ─── Payouts ─────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get", path: "/api/v1/payouts", tags: ["Payouts"],
  summary: "List commission payouts (scoped to beneficiary)", security,
  request: { query: PayoutFilterSchema },
  responses: {
    200: { description: "Paginated list", ...json(CommissionPayoutListResponseRef) },
    401: err("Unauthorized"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/payouts/{id}", tags: ["Payouts"],
  summary: "Get a single payout", security,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Payout", ...json(CommissionPayoutResponseRef) },
    401: err("Unauthorized"),
    403: err("Forbidden — caller is not the beneficiary"),
    404: err("Not found"),
  },
});

// ─── Internal (SERVICE role) ─────────────────────────────────────────────────

registry.registerPath({
  method: "post", path: "/api/v1/internal/invoices/generate-weekly", tags: ["Internal"],
  summary: "Generate WEEKLY_HOURS invoices for a billing window (SERVICE role)",
  description:
    "Called by the weekly cron (Mon 00:01 UTC) or by admin scripts. Idempotent on " +
    "(customerCompanyId, invoiceType, billingPeriodStart).",
  security,
  request: { body: json(GenerateWeeklyInvoicesRef) },
  responses: {
    202: { description: "Generation accepted" },
    401: err("Unauthorized"),
    403: err("Forbidden — SERVICE role required"),
  },
});

// ─── Health ──────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get", path: "/health", tags: ["System"],
  summary: "Health check",
  responses: {
    200: {
      description: "Healthy",
      content: { "application/json": { schema: z.object({ status: z.literal("ok"), service: z.string(), version: z.string() }).openapi("HealthResponse") } },
    },
  },
});

// ─── Generate ────────────────────────────────────────────────────────────────

const generator = new OpenApiGeneratorV3(registry.definitions);
const document = generator.generateDocument({
  openapi: "3.0.3",
  info: {
    title: "Techorbit Payments Service",
    version: "0.1.0",
    description:
      "Timesheet submission/approval, weekly invoice generation, Stripe + Gusto payout processing, " +
      "and interviewer-fees invoicing for the Techorbit staffing marketplace.",
  },
  servers: [{ url: "http://localhost:3009", description: "Local dev" }],
});

const serializable = JSON.parse(JSON.stringify(document));
writeFileSync(OUTPUT_PATH, stringify(serializable));
// eslint-disable-next-line no-console
console.log(`wrote ${OUTPUT_PATH}`);
