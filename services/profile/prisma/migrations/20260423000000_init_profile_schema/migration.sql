-- CreateEnum
CREATE TYPE "Seniority" AS ENUM ('JUNIOR', 'MID', 'SENIOR', 'STAFF', 'PRINCIPAL', 'PARTNER');

-- CreateEnum
CREATE TYPE "BackgroundCheckStatus" AS ENUM ('NOT_INITIATED', 'INITIATED', 'IN_PROGRESS', 'CLEAR', 'CONSIDER', 'FAILED');

-- CreateEnum
CREATE TYPE "BenchAvailability" AS ENUM ('AVAILABLE', 'ENGAGED', 'NOTICE_PERIOD', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "CompanySizeRange" AS ENUM ('SIZE_1_10', 'SIZE_11_50', 'SIZE_51_200', 'SIZE_201_500', 'SIZE_501_1000', 'SIZE_1001_PLUS');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('TECHNICAL_CODING', 'SYSTEM_DESIGN', 'BEHAVIORAL', 'CASE_STUDY', 'DOMAIN_SPECIFIC');

-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'OUTLOOK');

-- CreateEnum
CREATE TYPE "InterviewerStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MsmeStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "profile_candidate" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "seniority" "Seniority",
    "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "work_auth_status" TEXT,
    "work_auth_expiry" TIMESTAMP(3),
    "available_from" TIMESTAMP(3),
    "rate_min" INTEGER,
    "rate_max" INTEGER,
    "prefer_remote" BOOLEAN NOT NULL DEFAULT false,
    "prefer_hybrid" BOOLEAN NOT NULL DEFAULT false,
    "prefer_onsite" BOOLEAN NOT NULL DEFAULT false,
    "location_preference" TEXT,
    "resume_file_id" TEXT,
    "background_check_status" "BackgroundCheckStatus" NOT NULL DEFAULT 'NOT_INITIATED',
    "background_check_id" TEXT,
    "kyc_verified" BOOLEAN NOT NULL DEFAULT false,
    "kyc_session_id" TEXT,
    "average_rating" DECIMAL(3,2),
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "is_profile_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_msme" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "dba" TEXT,
    "ein_encrypted" JSONB,
    "gstin" TEXT,
    "country_of_incorp" TEXT,
    "website" TEXT,
    "years_in_business" INTEGER,
    "total_employees" INTEGER,
    "current_bench_size" INTEGER NOT NULL DEFAULT 0,
    "w9_file_id" TEXT,
    "primary_contact_name" TEXT,
    "primary_contact_email" TEXT,
    "primary_contact_phone" TEXT,
    "status" "MsmeStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "is_profile_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_msme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_msme_bench_entry" (
    "id" TEXT NOT NULL,
    "msme_id" TEXT NOT NULL,
    "candidate_user_id" TEXT NOT NULL,
    "availability" "BenchAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "expected_rate_min" INTEGER,
    "expected_rate_max" INTEGER,
    "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_msme_bench_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_customer_company" (
    "id" TEXT NOT NULL,
    "primary_user_id" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "dba" TEXT,
    "ein_encrypted" JSONB,
    "industry" TEXT,
    "company_size_range" "CompanySizeRange",
    "website" TEXT,
    "billing_street" TEXT,
    "billing_city" TEXT,
    "billing_state" TEXT,
    "billing_zip" TEXT,
    "billing_country" TEXT,
    "default_net_terms" INTEGER NOT NULL DEFAULT 30,
    "attributed_crm_user_id" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'PENDING',
    "is_profile_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_customer_company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_interviewer" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "display_name" TEXT,
    "headline" TEXT,
    "bio" TEXT,
    "current_role" TEXT,
    "current_company" TEXT,
    "specializations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "seniority_levels_coverable" "Seniority"[] NOT NULL DEFAULT ARRAY[]::"Seniority"[],
    "interview_types" "InterviewType"[] NOT NULL DEFAULT ARRAY[]::"InterviewType"[],
    "per_interview_fee_usd" INTEGER,
    "timezone" TEXT,
    "video_intro_file_id" TEXT,
    "linkedin_verified" BOOLEAN NOT NULL DEFAULT false,
    "calendar_provider" "CalendarProvider",
    "calendar_refresh_token" TEXT,
    "stripe_account_id" TEXT,
    "availability_slots" JSONB NOT NULL DEFAULT '[]',
    "status" "InterviewerStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "is_profile_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_interviewer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profile_candidate_user_id_key" ON "profile_candidate"("user_id");
CREATE INDEX "profile_candidate_user_id_idx" ON "profile_candidate"("user_id");
CREATE INDEX "profile_candidate_seniority_idx" ON "profile_candidate"("seniority");
CREATE INDEX "profile_candidate_background_check_status_idx" ON "profile_candidate"("background_check_status");
CREATE INDEX "profile_candidate_available_from_idx" ON "profile_candidate"("available_from");

CREATE UNIQUE INDEX "profile_msme_owner_user_id_key" ON "profile_msme"("owner_user_id");
CREATE INDEX "profile_msme_owner_user_id_idx" ON "profile_msme"("owner_user_id");
CREATE INDEX "profile_msme_status_idx" ON "profile_msme"("status");

CREATE UNIQUE INDEX "profile_msme_bench_entry_msme_id_candidate_user_id_key" ON "profile_msme_bench_entry"("msme_id", "candidate_user_id");
CREATE INDEX "profile_msme_bench_entry_msme_id_idx" ON "profile_msme_bench_entry"("msme_id");
CREATE INDEX "profile_msme_bench_entry_candidate_user_id_idx" ON "profile_msme_bench_entry"("candidate_user_id");
CREATE INDEX "profile_msme_bench_entry_availability_idx" ON "profile_msme_bench_entry"("availability");

CREATE UNIQUE INDEX "profile_customer_company_primary_user_id_key" ON "profile_customer_company"("primary_user_id");
CREATE INDEX "profile_customer_company_primary_user_id_idx" ON "profile_customer_company"("primary_user_id");
CREATE INDEX "profile_customer_company_status_idx" ON "profile_customer_company"("status");
CREATE INDEX "profile_customer_company_attributed_crm_user_id_idx" ON "profile_customer_company"("attributed_crm_user_id");

CREATE UNIQUE INDEX "profile_interviewer_user_id_key" ON "profile_interviewer"("user_id");
CREATE INDEX "profile_interviewer_user_id_idx" ON "profile_interviewer"("user_id");
CREATE INDEX "profile_interviewer_status_idx" ON "profile_interviewer"("status");

-- AddForeignKey
ALTER TABLE "profile_msme_bench_entry" ADD CONSTRAINT "profile_msme_bench_entry_msme_id_fkey" FOREIGN KEY ("msme_id") REFERENCES "profile_msme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
