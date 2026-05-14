-- Sprint 12 — SRM portfolio (two-sided handshake)

-- CreateEnum
CREATE TYPE "PortfolioMembershipStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PortfolioInitiator" AS ENUM ('SRM', 'MEMBER');

-- CreateEnum
CREATE TYPE "PortfolioMemberType" AS ENUM ('CANDIDATE', 'MSME');

-- CreateTable
CREATE TABLE "srm_portfolio_membership" (
    "id" TEXT NOT NULL,
    "srm_user_id" TEXT NOT NULL,
    "member_user_id" TEXT NOT NULL,
    "member_type" "PortfolioMemberType" NOT NULL,
    "status" "PortfolioMembershipStatus" NOT NULL DEFAULT 'PENDING',
    "initiated_by" "PortfolioInitiator" NOT NULL,
    "initiated_by_user_id" TEXT NOT NULL,
    "approved_at" TIMESTAMP(3),
    "approved_by_user_id" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejected_by_user_id" TEXT,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "srm_portfolio_membership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "srm_portfolio_membership_srm_user_id_status_idx" ON "srm_portfolio_membership"("srm_user_id", "status");

-- CreateIndex
CREATE INDEX "srm_portfolio_membership_member_user_id_status_idx" ON "srm_portfolio_membership"("member_user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "srm_portfolio_membership_srm_user_id_member_user_id_member__key" ON "srm_portfolio_membership"("srm_user_id", "member_user_id", "member_type");
