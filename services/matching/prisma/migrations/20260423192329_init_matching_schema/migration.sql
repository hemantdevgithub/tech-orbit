-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "matching";

-- CreateEnum
CREATE TYPE "matching"."SubmitterRole" AS ENUM ('CANDIDATE_SELF', 'SRM', 'MSME');

-- CreateEnum
CREATE TYPE "matching"."SubmissionStatus" AS ENUM ('SUBMITTED', 'SCREENING', 'INTERVIEWING', 'OFFER', 'PLACED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "matching"."OutgoingEventStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "matching"."submission" (
    "id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "submitted_by_user_id" TEXT NOT NULL,
    "submitter_role" "matching"."SubmitterRole" NOT NULL,
    "attributed_srm_id" TEXT,
    "attributed_msme_id" TEXT,
    "status" "matching"."SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "match_score" INTEGER,
    "cover_note" TEXT,
    "proposed_bill_rate" DECIMAL(10,2),
    "withdrawn_at" TIMESTAMP(3),
    "withdrawn_reason" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matching"."matching_signal" (
    "id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "skill_overlap" INTEGER NOT NULL,
    "seniority_match" BOOLEAN NOT NULL,
    "location_match" BOOLEAN NOT NULL,
    "work_auth_match" BOOLEAN NOT NULL,
    "candidate_rating" DECIMAL(3,2) NOT NULL,
    "match_score" INTEGER NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matching_signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matching"."processed_event" (
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_event_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "matching"."outgoing_event" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "matching"."OutgoingEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "outgoing_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submission_status_created_at_idx" ON "matching"."submission"("status", "created_at");

-- CreateIndex
CREATE INDEX "submission_requirement_id_status_idx" ON "matching"."submission"("requirement_id", "status");

-- CreateIndex
CREATE INDEX "submission_candidate_id_idx" ON "matching"."submission"("candidate_id");

-- CreateIndex
CREATE INDEX "submission_attributed_srm_id_idx" ON "matching"."submission"("attributed_srm_id");

-- CreateIndex
CREATE INDEX "submission_attributed_msme_id_idx" ON "matching"."submission"("attributed_msme_id");

-- CreateIndex
CREATE UNIQUE INDEX "submission_requirement_id_candidate_id_key" ON "matching"."submission"("requirement_id", "candidate_id");

-- CreateIndex
CREATE INDEX "matching_signal_requirement_id_match_score_idx" ON "matching"."matching_signal"("requirement_id", "match_score");

-- CreateIndex
CREATE INDEX "matching_signal_candidate_id_idx" ON "matching"."matching_signal"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "matching_signal_requirement_id_candidate_id_key" ON "matching"."matching_signal"("requirement_id", "candidate_id");

-- CreateIndex
CREATE INDEX "outgoing_event_status_created_at_idx" ON "matching"."outgoing_event"("status", "created_at");

