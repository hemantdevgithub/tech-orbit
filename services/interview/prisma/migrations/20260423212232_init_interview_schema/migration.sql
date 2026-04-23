-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "interview";

-- CreateEnum
CREATE TYPE "interview"."InterviewerRole" AS ENUM ('PLATFORM_INTERVIEWER', 'CUSTOMER_INTERNAL');

-- CreateEnum
CREATE TYPE "interview"."InterviewStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "interview"."Recommendation" AS ENUM ('STRONG_YES', 'YES', 'WEAK_YES', 'WEAK_NO', 'NO', 'STRONG_NO');

-- CreateEnum
CREATE TYPE "interview"."OutgoingEventStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "interview"."interview" (
    "id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "scheduled_by_user_id" TEXT NOT NULL,
    "interviewer_user_id" TEXT,
    "conducted_by_role" "interview"."InterviewerRole" NOT NULL,
    "scheduled_start" TIMESTAMP(3) NOT NULL,
    "scheduled_end" TIMESTAMP(3) NOT NULL,
    "video_provider_id" TEXT,
    "video_room_url" TEXT,
    "video_recording_url" TEXT,
    "status" "interview"."InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "cancel_reason" TEXT,
    "interviewer_fee_usd" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview"."scorecard" (
    "id" TEXT NOT NULL,
    "interview_id" TEXT NOT NULL,
    "recommendation" "interview"."Recommendation" NOT NULL,
    "technical_score" INTEGER,
    "communication_score" INTEGER,
    "problem_solving_score" INTEGER,
    "cultural_fit_score" INTEGER,
    "freeform_feedback" TEXT NOT NULL,
    "red_flags" TEXT,
    "would_hire_again" BOOLEAN,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_by" TEXT NOT NULL,

    CONSTRAINT "scorecard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview"."processed_event" (
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_event_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "interview"."outgoing_event" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "interview"."OutgoingEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "outgoing_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interview_scheduled_start_idx" ON "interview"."interview"("scheduled_start");

-- CreateIndex
CREATE INDEX "interview_candidate_id_idx" ON "interview"."interview"("candidate_id");

-- CreateIndex
CREATE INDEX "interview_interviewer_user_id_idx" ON "interview"."interview"("interviewer_user_id");

-- CreateIndex
CREATE INDEX "interview_requirement_id_idx" ON "interview"."interview"("requirement_id");

-- CreateIndex
CREATE INDEX "interview_submission_id_idx" ON "interview"."interview"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "scorecard_interview_id_key" ON "interview"."scorecard"("interview_id");

-- CreateIndex
CREATE INDEX "outgoing_event_status_created_at_idx" ON "interview"."outgoing_event"("status", "created_at");

-- AddForeignKey
ALTER TABLE "interview"."scorecard" ADD CONSTRAINT "scorecard_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interview"."interview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

