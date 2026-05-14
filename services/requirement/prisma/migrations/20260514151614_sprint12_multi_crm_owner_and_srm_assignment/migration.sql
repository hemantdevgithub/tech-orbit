-- AlterTable
ALTER TABLE "requirement"."requirement" ADD COLUMN     "assigned_srm_at" TIMESTAMP(3),
ADD COLUMN     "assigned_srm_by_crm_id" TEXT,
ADD COLUMN     "assigned_srm_id" TEXT;

-- CreateTable
CREATE TABLE "requirement"."requirement_crm_owner" (
    "id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "crm_user_id" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "commission_share" DECIMAL(5,4) NOT NULL DEFAULT 0,

    CONSTRAINT "requirement_crm_owner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "requirement_crm_owner_crm_user_id_idx" ON "requirement"."requirement_crm_owner"("crm_user_id");

-- CreateIndex
CREATE INDEX "requirement_crm_owner_requirement_id_idx" ON "requirement"."requirement_crm_owner"("requirement_id");

-- CreateIndex
CREATE UNIQUE INDEX "requirement_crm_owner_requirement_id_crm_user_id_key" ON "requirement"."requirement_crm_owner"("requirement_id", "crm_user_id");

-- CreateIndex
CREATE INDEX "requirement_assigned_srm_id_idx" ON "requirement"."requirement"("assigned_srm_id");

-- AddForeignKey
ALTER TABLE "requirement"."requirement_crm_owner" ADD CONSTRAINT "requirement_crm_owner_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirement"."requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

