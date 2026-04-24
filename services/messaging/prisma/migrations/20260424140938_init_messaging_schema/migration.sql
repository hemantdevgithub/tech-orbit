-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "messaging";

-- CreateEnum
CREATE TYPE "messaging"."ThreadContextType" AS ENUM ('REQUIREMENT', 'SUBMISSION', 'INTERVIEW', 'PLACEMENT', 'GENERAL');

-- CreateEnum
CREATE TYPE "messaging"."OutgoingEventStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "messaging"."thread" (
    "id" TEXT NOT NULL,
    "context_type" "messaging"."ThreadContextType" NOT NULL,
    "context_id" TEXT NOT NULL,
    "participant_ids" TEXT[],
    "subject" TEXT,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messaging"."message" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "sender_user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "read_by" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messaging"."outgoing_event" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "messaging"."OutgoingEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "outgoing_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "thread_context_type_context_id_idx" ON "messaging"."thread"("context_type", "context_id");

-- CreateIndex
CREATE INDEX "thread_last_message_at_idx" ON "messaging"."thread"("last_message_at");

-- CreateIndex
CREATE INDEX "message_thread_id_created_at_idx" ON "messaging"."message"("thread_id", "created_at");

-- CreateIndex
CREATE INDEX "outgoing_event_status_created_at_idx" ON "messaging"."outgoing_event"("status", "created_at");

-- AddForeignKey
ALTER TABLE "messaging"."message" ADD CONSTRAINT "message_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "messaging"."thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

