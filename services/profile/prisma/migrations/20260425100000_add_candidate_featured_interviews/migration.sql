-- AlterTable
ALTER TABLE "profile_candidate" ADD COLUMN "featured_interview_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
