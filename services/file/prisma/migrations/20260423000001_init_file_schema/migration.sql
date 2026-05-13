-- CreateEnum
CREATE TYPE "FilePurpose" AS ENUM ('RESUME', 'CONTRACT', 'W9', 'VIDEO_INTRO', 'PROFILE_PHOTO');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'CONFIRMED', 'VIRUS_DETECTED', 'DELETED');

-- CreateTable
CREATE TABLE "file_record" (
    "id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "purpose" "FilePurpose" NOT NULL,
    "s3_key" TEXT,
    "local_path" TEXT,
    "status" "FileStatus" NOT NULL DEFAULT 'PENDING',
    "virus_scan_result" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "file_record_uploaded_by_idx" ON "file_record"("uploaded_by");

-- CreateIndex
CREATE INDEX "file_record_status_idx" ON "file_record"("status");

-- CreateIndex
CREATE INDEX "file_record_purpose_idx" ON "file_record"("purpose");
