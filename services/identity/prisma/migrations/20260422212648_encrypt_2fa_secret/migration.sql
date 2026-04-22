-- ONE-SHOT: no real users yet; in prod this would require a backfill script.
-- This migration drops the plaintext two_fa_secret column and adds an encrypted
-- two_fa_secret_encrypted column to store encrypted TOTP secrets as JSON.

ALTER TABLE "identity_user" DROP COLUMN "two_fa_secret";

ALTER TABLE "identity_user" ADD COLUMN "two_fa_secret_encrypted" JSONB;
