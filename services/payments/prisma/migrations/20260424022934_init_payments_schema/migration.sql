-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "payments";

-- CreateEnum
CREATE TYPE "payments"."TimesheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'INVOICED');

-- CreateEnum
CREATE TYPE "payments"."InvoiceType" AS ENUM ('WEEKLY_HOURS', 'INTERVIEWER_FEES');

-- CreateEnum
CREATE TYPE "payments"."InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'SETTLED');

-- CreateEnum
CREATE TYPE "payments"."PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SETTLED');

-- CreateEnum
CREATE TYPE "payments"."OutgoingEventStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "payments"."timesheet" (
    "id" TEXT NOT NULL,
    "placement_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "week_start_date" TIMESTAMP(3) NOT NULL,
    "week_end_date" TIMESTAMP(3) NOT NULL,
    "hours_worked" DECIMAL(5,2) NOT NULL,
    "description" TEXT,
    "status" "payments"."TimesheetStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejection_reason" TEXT,
    "invoice_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timesheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments"."invoice" (
    "id" TEXT NOT NULL,
    "customer_company_id" TEXT NOT NULL,
    "placement_id" TEXT,
    "invoice_type" "payments"."InvoiceType" NOT NULL DEFAULT 'WEEKLY_HOURS',
    "billing_period_start" TIMESTAMP(3) NOT NULL,
    "billing_period_end" TIMESTAMP(3) NOT NULL,
    "subtotal_usd" DECIMAL(10,2) NOT NULL,
    "tax_usd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_usd" DECIMAL(10,2) NOT NULL,
    "status" "payments"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "sent_at" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "stripe_invoice_id" TEXT,
    "stripe_payment_intent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments"."invoice_line_item" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "placement_id" TEXT NOT NULL,
    "timesheet_id" TEXT,
    "interview_id" TEXT,
    "description" TEXT NOT NULL,
    "hours_worked" DECIMAL(5,2),
    "rate_usd" DECIMAL(10,2),
    "amount_usd" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_line_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments"."commission_payout" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "placement_id" TEXT NOT NULL,
    "commission_rule_id" TEXT NOT NULL,
    "beneficiary_user_id" TEXT,
    "beneficiary_msme_id" TEXT,
    "slot" TEXT NOT NULL,
    "amount_usd" DECIMAL(10,2) NOT NULL,
    "status" "payments"."PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "processed_at" TIMESTAMP(3),
    "stripe_transfer_id" TEXT,
    "gusto_payroll_id" TEXT,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments"."processed_event" (
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_event_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "payments"."outgoing_event" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "payments"."OutgoingEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "outgoing_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "timesheet_candidate_id_status_idx" ON "payments"."timesheet"("candidate_id", "status");

-- CreateIndex
CREATE INDEX "timesheet_placement_id_status_idx" ON "payments"."timesheet"("placement_id", "status");

-- CreateIndex
CREATE INDEX "timesheet_invoice_id_idx" ON "payments"."timesheet"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "timesheet_placement_id_week_start_date_key" ON "payments"."timesheet"("placement_id", "week_start_date");

-- CreateIndex
CREATE INDEX "invoice_status_due_date_idx" ON "payments"."invoice"("status", "due_date");

-- CreateIndex
CREATE INDEX "invoice_customer_company_id_status_idx" ON "payments"."invoice"("customer_company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_customer_company_id_invoice_type_billing_period_sta_key" ON "payments"."invoice"("customer_company_id", "invoice_type", "billing_period_start", "placement_id");

-- CreateIndex
CREATE INDEX "invoice_line_item_invoice_id_idx" ON "payments"."invoice_line_item"("invoice_id");

-- CreateIndex
CREATE INDEX "commission_payout_beneficiary_user_id_status_idx" ON "payments"."commission_payout"("beneficiary_user_id", "status");

-- CreateIndex
CREATE INDEX "commission_payout_beneficiary_msme_id_status_idx" ON "payments"."commission_payout"("beneficiary_msme_id", "status");

-- CreateIndex
CREATE INDEX "commission_payout_invoice_id_status_idx" ON "payments"."commission_payout"("invoice_id", "status");

-- CreateIndex
CREATE INDEX "outgoing_event_status_created_at_idx" ON "payments"."outgoing_event"("status", "created_at");

-- AddForeignKey
ALTER TABLE "payments"."invoice_line_item" ADD CONSTRAINT "invoice_line_item_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "payments"."invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments"."commission_payout" ADD CONSTRAINT "commission_payout_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "payments"."invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

