-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notification";

-- CreateEnum
CREATE TYPE "notification"."NotificationType" AS ENUM ('REQUIREMENT_PUBLISHED', 'SUBMISSION_RECEIVED', 'INTERVIEW_SCHEDULED', 'TIMESHEET_SUBMITTED', 'TIMESHEET_APPROVED', 'INVOICE_GENERATED', 'PAYOUT_COMPLETED', 'MESSAGE_RECEIVED', 'RATING_RECEIVED');

-- CreateTable
CREATE TABLE "notification"."notification" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "notification"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link_url" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification"."notification_preference" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification"."processed_event" (
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_event_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE INDEX "notification_user_id_created_at_idx" ON "notification"."notification"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notification_user_id_read_at_idx" ON "notification"."notification"("user_id", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preference_user_id_key" ON "notification"."notification_preference"("user_id");

