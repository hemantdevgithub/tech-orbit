-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "UserRoleStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "UserRoleType" AS ENUM ('CUSTOMER', 'CANDIDATE', 'CRM', 'SRM', 'MSME', 'INTERVIEWER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TwoFAKind" AS ENUM ('TOTP', 'SMS');

-- CreateEnum
CREATE TYPE "OutgoingEventStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "identity_user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "has_2fa" BOOLEAN NOT NULL DEFAULT false,
    "google_sub" TEXT,
    "linkedin_sub" TEXT,
    "oauth_profile" TEXT,
    "two_fa_secret" TEXT,
    "two_fa_backup_hash" TEXT,
    "email_verify_token" TEXT,
    "email_verify_token_exp" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_user_role" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_type" "UserRoleType" NOT NULL,
    "status" "UserRoleStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "verification_data" JSONB,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "reject_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_user_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_session" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,

    CONSTRAINT "identity_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_two_fa_challenge" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "TwoFAKind" NOT NULL DEFAULT 'TOTP',
    "used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_two_fa_challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_password_reset_request" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_password_reset_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_outgoing_event" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "correlation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),
    "status" "OutgoingEventStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,

    CONSTRAINT "identity_outgoing_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "identity_user_email_key" ON "identity_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "identity_user_google_sub_key" ON "identity_user"("google_sub");

-- CreateIndex
CREATE UNIQUE INDEX "identity_user_linkedin_sub_key" ON "identity_user"("linkedin_sub");

-- CreateIndex
CREATE INDEX "identity_user_email_idx" ON "identity_user"("email");

-- CreateIndex
CREATE INDEX "identity_user_google_sub_idx" ON "identity_user"("google_sub");

-- CreateIndex
CREATE INDEX "identity_user_linkedin_sub_idx" ON "identity_user"("linkedin_sub");

-- CreateIndex
CREATE UNIQUE INDEX "identity_user_role_user_id_role_type_key" ON "identity_user_role"("user_id", "role_type");

-- CreateIndex
CREATE INDEX "identity_user_role_user_id_idx" ON "identity_user_role"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "identity_session_refresh_token_hash_key" ON "identity_session"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "identity_session_user_id_idx" ON "identity_session"("user_id");

-- CreateIndex
CREATE INDEX "identity_session_refresh_token_hash_idx" ON "identity_session"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "identity_session_expires_at_idx" ON "identity_session"("expires_at");

-- CreateIndex
CREATE INDEX "identity_two_fa_challenge_user_id_idx" ON "identity_two_fa_challenge"("user_id");

-- CreateIndex
CREATE INDEX "identity_two_fa_challenge_expires_at_idx" ON "identity_two_fa_challenge"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "identity_password_reset_request_token_hash_key" ON "identity_password_reset_request"("token_hash");

-- CreateIndex
CREATE INDEX "identity_password_reset_request_user_id_idx" ON "identity_password_reset_request"("user_id");

-- CreateIndex
CREATE INDEX "identity_password_reset_request_token_hash_idx" ON "identity_password_reset_request"("token_hash");

-- CreateIndex
CREATE INDEX "identity_password_reset_request_expires_at_idx" ON "identity_password_reset_request"("expires_at");

-- CreateIndex
CREATE INDEX "identity_outgoing_event_status_created_at_idx" ON "identity_outgoing_event"("status", "created_at");

-- AddForeignKey
ALTER TABLE "identity_user_role" ADD CONSTRAINT "identity_user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_session" ADD CONSTRAINT "identity_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_two_fa_challenge" ADD CONSTRAINT "identity_two_fa_challenge_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_password_reset_request" ADD CONSTRAINT "identity_password_reset_request_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
