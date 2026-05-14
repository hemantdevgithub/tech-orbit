-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "notification"."NotificationType" ADD VALUE 'REQUIREMENT_ASSIGNED';
ALTER TYPE "notification"."NotificationType" ADD VALUE 'SUBMISSION_INVITED';
ALTER TYPE "notification"."NotificationType" ADD VALUE 'SUBMISSION_INVITE_ACCEPTED';
ALTER TYPE "notification"."NotificationType" ADD VALUE 'SUBMISSION_INVITE_DECLINED';
ALTER TYPE "notification"."NotificationType" ADD VALUE 'PORTFOLIO_INVITATION';
ALTER TYPE "notification"."NotificationType" ADD VALUE 'PORTFOLIO_REQUEST';
ALTER TYPE "notification"."NotificationType" ADD VALUE 'PORTFOLIO_APPROVED';
ALTER TYPE "notification"."NotificationType" ADD VALUE 'MSME_ASSIGNMENT';

