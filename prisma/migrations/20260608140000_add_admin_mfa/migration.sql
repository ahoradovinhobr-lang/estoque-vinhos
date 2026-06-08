ALTER TYPE "security_event_type" ADD VALUE IF NOT EXISTS 'mfa_success';
ALTER TYPE "security_event_type" ADD VALUE IF NOT EXISTS 'mfa_failure';
ALTER TYPE "security_event_type" ADD VALUE IF NOT EXISTS 'mfa_enabled';
ALTER TYPE "security_event_type" ADD VALUE IF NOT EXISTS 'mfa_reset';
ALTER TYPE "security_event_type" ADD VALUE IF NOT EXISTS 'recovery_code_used';

ALTER TABLE "users"
ADD COLUMN "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "mfa_secret_encrypted" TEXT,
ADD COLUMN "mfa_pending_secret_encrypted" TEXT,
ADD COLUMN "mfa_pending_secret_created_at" TIMESTAMP(3),
ADD COLUMN "mfa_confirmed_at" TIMESTAMP(3),
ADD COLUMN "mfa_failed_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "mfa_locked_until" TIMESTAMP(3),
ADD COLUMN "mfa_last_used_counter" BIGINT;

CREATE TABLE "mfa_recovery_codes" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "code_hash" TEXT NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mfa_recovery_codes_user_id_used_at_idx"
ON "mfa_recovery_codes"("user_id", "used_at");

ALTER TABLE "mfa_recovery_codes"
ADD CONSTRAINT "mfa_recovery_codes_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
