ALTER TYPE "audit_status" ADD VALUE IF NOT EXISTS 'confirmed';

ALTER TABLE "inventory_audits"
  ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_audits_idempotency_key_key"
  ON "inventory_audits"("idempotency_key");
