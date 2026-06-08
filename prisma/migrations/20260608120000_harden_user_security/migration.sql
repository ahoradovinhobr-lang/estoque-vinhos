ALTER TABLE "users"
ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "password_changed_at" TIMESTAMP(3),
ADD COLUMN "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "locked_until" TIMESTAMP(3),
ADD COLUMN "last_login_at" TIMESTAMP(3),
ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 0;
