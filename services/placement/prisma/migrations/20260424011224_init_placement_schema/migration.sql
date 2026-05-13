-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "placement";

-- CreateEnum
CREATE TYPE "placement"."EngagementType" AS ENUM ('W2', 'C2C', 'IC_1099');

-- CreateEnum
CREATE TYPE "placement"."PlacementStatus" AS ENUM ('ACTIVE', 'ENDED_COMPLETED', 'ENDED_EARLY', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "placement"."CommissionSlot" AS ENUM ('CRM', 'SRM', 'MSME', 'CANDIDATE_W2', 'INTERVIEWER', 'PLATFORM');

-- CreateEnum
CREATE TYPE "placement"."CommissionCalc" AS ENUM ('PERCENT_OF_BILL', 'FLAT_FEE', 'RESIDUAL');

-- CreateEnum
CREATE TYPE "placement"."OutgoingEventStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "placement"."placement" (
    "id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "customer_company_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "engagement_type" "placement"."EngagementType" NOT NULL,
    "bill_rate_usd" DECIMAL(10,2) NOT NULL,
    "pay_rate_usd" DECIMAL(10,2),
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "actual_end_date" TIMESTAMP(3),
    "status" "placement"."PlacementStatus" NOT NULL DEFAULT 'ACTIVE',
    "end_reason" TEXT,
    "contract_document_id" TEXT,
    "work_order_id" TEXT,
    "rtr_document_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placement"."value_chain" (
    "id" TEXT NOT NULL,
    "placement_id" TEXT NOT NULL,
    "customer_company_id" TEXT NOT NULL,
    "attributed_crm_id" TEXT,
    "attributed_srm_id" TEXT,
    "attributed_msme_id" TEXT,
    "candidate_id" TEXT NOT NULL,
    "interviewer_ids" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "value_chain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placement"."commission_rule" (
    "id" TEXT NOT NULL,
    "placement_id" TEXT NOT NULL,
    "slot" "placement"."CommissionSlot" NOT NULL,
    "beneficiary_user_id" TEXT,
    "beneficiary_msme_id" TEXT,
    "calculation" "placement"."CommissionCalc" NOT NULL,
    "percent_of_bill_rate" DECIMAL(5,4),
    "flat_fee_usd" DECIMAL(10,2),
    "notes" TEXT,
    "interview_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placement"."outgoing_event" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "placement"."OutgoingEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "outgoing_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "placement_submission_id_key" ON "placement"."placement"("submission_id");

-- CreateIndex
CREATE INDEX "placement_customer_company_id_status_idx" ON "placement"."placement"("customer_company_id", "status");

-- CreateIndex
CREATE INDEX "placement_candidate_id_status_idx" ON "placement"."placement"("candidate_id", "status");

-- CreateIndex
CREATE INDEX "placement_requirement_id_idx" ON "placement"."placement"("requirement_id");

-- CreateIndex
CREATE UNIQUE INDEX "value_chain_placement_id_key" ON "placement"."value_chain"("placement_id");

-- CreateIndex
CREATE INDEX "commission_rule_placement_id_idx" ON "placement"."commission_rule"("placement_id");

-- CreateIndex
CREATE INDEX "commission_rule_beneficiary_user_id_idx" ON "placement"."commission_rule"("beneficiary_user_id");

-- CreateIndex
CREATE INDEX "commission_rule_beneficiary_msme_id_idx" ON "placement"."commission_rule"("beneficiary_msme_id");

-- CreateIndex
CREATE INDEX "outgoing_event_status_created_at_idx" ON "placement"."outgoing_event"("status", "created_at");

-- AddForeignKey
ALTER TABLE "placement"."value_chain" ADD CONSTRAINT "value_chain_placement_id_fkey" FOREIGN KEY ("placement_id") REFERENCES "placement"."placement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement"."commission_rule" ADD CONSTRAINT "commission_rule_placement_id_fkey" FOREIGN KEY ("placement_id") REFERENCES "placement"."placement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

