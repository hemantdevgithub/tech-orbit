-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "requirement";

-- CreateEnum
CREATE TYPE "requirement"."RequirementStatus" AS ENUM ('DRAFT', 'OPEN', 'INTERVIEWING', 'OFFER_EXTENDED', 'PLACED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "requirement"."LocationType" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE');

-- CreateEnum
CREATE TYPE "requirement"."Seniority" AS ENUM ('JUNIOR', 'MID', 'SENIOR', 'STAFF', 'PRINCIPAL', 'PARTNER');

-- CreateEnum
CREATE TYPE "requirement"."WorkAuthStatus" AS ENUM ('US_CITIZEN', 'GREEN_CARD', 'H1B', 'L1', 'OPT', 'CPT', 'TN', 'OTHER');

-- CreateEnum
CREATE TYPE "requirement"."CrmAttributionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "requirement"."OutgoingEventStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "requirement"."requirement" (
    "id" TEXT NOT NULL,
    "customer_company_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "attributed_crm_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tech_stack" TEXT[],
    "seniority" "requirement"."Seniority" NOT NULL,
    "location_type" "requirement"."LocationType" NOT NULL,
    "location_city" TEXT,
    "location_state" TEXT,
    "bill_rate_min_usd" DECIMAL(10,2) NOT NULL,
    "bill_rate_max_usd" DECIMAL(10,2) NOT NULL,
    "duration_weeks" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "openings" INTEGER NOT NULL DEFAULT 1,
    "work_auth_prefs" "requirement"."WorkAuthStatus"[],
    "required_interviews" INTEGER NOT NULL DEFAULT 2,
    "blind_posting" BOOLEAN NOT NULL DEFAULT false,
    "status" "requirement"."RequirementStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "closed_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement"."crm_attribution_request" (
    "id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "customer_company_id" TEXT NOT NULL,
    "crm_user_id" TEXT NOT NULL,
    "status" "requirement"."CrmAttributionStatus" NOT NULL DEFAULT 'PENDING',
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_attribution_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement"."outgoing_event" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "requirement"."OutgoingEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "outgoing_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "requirement_status_published_at_idx" ON "requirement"."requirement"("status", "published_at");

-- CreateIndex
CREATE INDEX "requirement_customer_company_id_idx" ON "requirement"."requirement"("customer_company_id");

-- CreateIndex
CREATE INDEX "requirement_created_by_user_id_idx" ON "requirement"."requirement"("created_by_user_id");

-- CreateIndex
CREATE INDEX "requirement_attributed_crm_id_idx" ON "requirement"."requirement"("attributed_crm_id");

-- CreateIndex
CREATE INDEX "crm_attribution_request_status_crm_user_id_idx" ON "requirement"."crm_attribution_request"("status", "crm_user_id");

-- CreateIndex
CREATE INDEX "crm_attribution_request_customer_company_id_status_idx" ON "requirement"."crm_attribution_request"("customer_company_id", "status");

-- CreateIndex
CREATE INDEX "crm_attribution_request_requirement_id_idx" ON "requirement"."crm_attribution_request"("requirement_id");

-- CreateIndex
CREATE INDEX "outgoing_event_status_created_at_idx" ON "requirement"."outgoing_event"("status", "created_at");

-- AddForeignKey
ALTER TABLE "requirement"."crm_attribution_request" ADD CONSTRAINT "crm_attribution_request_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirement"."requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

