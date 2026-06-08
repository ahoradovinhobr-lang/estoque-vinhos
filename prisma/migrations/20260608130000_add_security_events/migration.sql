CREATE TYPE "security_event_type" AS ENUM (
  'login_success',
  'login_failure',
  'login_lockout',
  'logout',
  'password_change',
  'password_reset',
  'user_created',
  'user_inactivated',
  'user_reactivated'
);

CREATE TABLE "security_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_type" "security_event_type" NOT NULL,
  "actor_user_id" UUID,
  "subject_user_id" UUID,
  "email" TEXT,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "security_events_event_type_created_at_idx" ON "security_events"("event_type", "created_at");
CREATE INDEX "security_events_actor_user_id_created_at_idx" ON "security_events"("actor_user_id", "created_at");
CREATE INDEX "security_events_subject_user_id_created_at_idx" ON "security_events"("subject_user_id", "created_at");
CREATE INDEX "security_events_email_created_at_idx" ON "security_events"("email", "created_at");

ALTER TABLE "security_events"
ADD CONSTRAINT "security_events_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "security_events"
ADD CONSTRAINT "security_events_subject_user_id_fkey"
FOREIGN KEY ("subject_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
