-- AlterEnum
ALTER TYPE "matching"."SubmissionStatus" ADD VALUE 'INVITED';

-- AlterTable
ALTER TABLE "matching"."submission" ADD COLUMN     "invite_accepted_at" TIMESTAMP(3),
ADD COLUMN     "invite_declined_at" TIMESTAMP(3),
ADD COLUMN     "invited_at" TIMESTAMP(3),
ADD COLUMN     "invited_by_srm_id" TEXT;

-- CreateIndex
CREATE INDEX "submission_invited_by_srm_id_idx" ON "matching"."submission"("invited_by_srm_id");

