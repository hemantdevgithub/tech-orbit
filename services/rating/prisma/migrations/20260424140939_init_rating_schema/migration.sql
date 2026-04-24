-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "rating";

-- CreateEnum
CREATE TYPE "rating"."RaterRole" AS ENUM ('CUSTOMER', 'CANDIDATE');

-- CreateEnum
CREATE TYPE "rating"."OutgoingEventStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "rating"."rating" (
    "id" TEXT NOT NULL,
    "placement_id" TEXT NOT NULL,
    "rated_user_id" TEXT NOT NULL,
    "rater_user_id" TEXT NOT NULL,
    "rater_role" "rating"."RaterRole" NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "technical_score" INTEGER,
    "communication_score" INTEGER,
    "professionalism_score" INTEGER,
    "feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rating"."outgoing_event" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "rating"."OutgoingEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "outgoing_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rating_rated_user_id_idx" ON "rating"."rating"("rated_user_id");

-- CreateIndex
CREATE INDEX "rating_placement_id_idx" ON "rating"."rating"("placement_id");

-- CreateIndex
CREATE UNIQUE INDEX "rating_placement_id_rater_user_id_key" ON "rating"."rating"("placement_id", "rater_user_id");

-- CreateIndex
CREATE INDEX "outgoing_event_status_created_at_idx" ON "rating"."outgoing_event"("status", "created_at");

