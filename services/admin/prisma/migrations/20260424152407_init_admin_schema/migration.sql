-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "admin";

-- CreateEnum
CREATE TYPE "admin"."ApplicationRole" AS ENUM ('CRM', 'SRM', 'MSME', 'INTERVIEWER');

-- CreateEnum
CREATE TYPE "admin"."ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "admin"."DisputeType" AS ENUM ('TIMESHEET', 'COMMISSION', 'PAYMENT', 'CONDUCT', 'OTHER');

-- CreateEnum
CREATE TYPE "admin"."DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "admin"."OutgoingEventStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "admin"."role_application" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "requested_role" "admin"."ApplicationRole" NOT NULL,
    "status" "admin"."ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "application_data" JSONB NOT NULL,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."dispute" (
    "id" TEXT NOT NULL,
    "type" "admin"."DisputeType" NOT NULL,
    "context_type" TEXT NOT NULL,
    "context_id" TEXT NOT NULL,
    "raised_by" TEXT NOT NULL,
    "respondent" TEXT,
    "description" TEXT NOT NULL,
    "status" "admin"."DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."dispute_note" (
    "id" TEXT NOT NULL,
    "dispute_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."audit_log" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" TEXT NOT NULL,
    "target_id" TEXT,
    "target_type" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."outgoing_event" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "admin"."OutgoingEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "outgoing_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "role_application_status_created_at_idx" ON "admin"."role_application"("status", "created_at");

-- CreateIndex
CREATE INDEX "role_application_user_id_idx" ON "admin"."role_application"("user_id");

-- CreateIndex
CREATE INDEX "role_application_requested_role_status_idx" ON "admin"."role_application"("requested_role", "status");

-- CreateIndex
CREATE INDEX "dispute_status_created_at_idx" ON "admin"."dispute"("status", "created_at");

-- CreateIndex
CREATE INDEX "dispute_raised_by_idx" ON "admin"."dispute"("raised_by");

-- CreateIndex
CREATE INDEX "dispute_respondent_idx" ON "admin"."dispute"("respondent");

-- CreateIndex
CREATE INDEX "dispute_context_type_context_id_idx" ON "admin"."dispute"("context_type", "context_id");

-- CreateIndex
CREATE INDEX "dispute_note_dispute_id_created_at_idx" ON "admin"."dispute_note"("dispute_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_performed_by_created_at_idx" ON "admin"."audit_log"("performed_by", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_target_id_idx" ON "admin"."audit_log"("target_id");

-- CreateIndex
CREATE INDEX "audit_log_action_created_at_idx" ON "admin"."audit_log"("action", "created_at");

-- CreateIndex
CREATE INDEX "outgoing_event_status_created_at_idx" ON "admin"."outgoing_event"("status", "created_at");

-- AddForeignKey
ALTER TABLE "admin"."dispute_note" ADD CONSTRAINT "dispute_note_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "admin"."dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

