-- CreateEnum
CREATE TYPE "matching"."MsmeAssignmentStatus" AS ENUM ('ACTIVE', 'SUBMITTED', 'DECLINED', 'EXPIRED');

-- CreateTable
CREATE TABLE "matching"."requirement_msme_assignment" (
    "id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "msme_primary_user_id" TEXT NOT NULL,
    "assigned_by_srm_id" TEXT NOT NULL,
    "note" TEXT,
    "status" "matching"."MsmeAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "declined_at" TIMESTAMP(3),
    "decline_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requirement_msme_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "requirement_msme_assignment_msme_primary_user_id_status_idx" ON "matching"."requirement_msme_assignment"("msme_primary_user_id", "status");

-- CreateIndex
CREATE INDEX "requirement_msme_assignment_assigned_by_srm_id_idx" ON "matching"."requirement_msme_assignment"("assigned_by_srm_id");

-- CreateIndex
CREATE UNIQUE INDEX "requirement_msme_assignment_requirement_id_msme_primary_use_key" ON "matching"."requirement_msme_assignment"("requirement_id", "msme_primary_user_id");

