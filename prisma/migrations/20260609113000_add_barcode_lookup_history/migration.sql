CREATE TYPE "barcode_lookup_status" AS ENUM ('found', 'not_found', 'ambiguous');

CREATE TYPE "barcode_lookup_source" AS ENUM ('input', 'camera', 'direct_url', 'api');

CREATE TABLE "barcode_lookups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "barcode" TEXT NOT NULL,
    "status" "barcode_lookup_status" NOT NULL,
    "source" "barcode_lookup_source" NOT NULL DEFAULT 'direct_url',
    "matched_product_id" UUID,
    "matched_product_count" INTEGER NOT NULL DEFAULT 0,
    "user_id" UUID,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barcode_lookups_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "barcode_lookups"
ADD CONSTRAINT "barcode_lookups_matched_product_id_fkey"
FOREIGN KEY ("matched_product_id") REFERENCES "products"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "barcode_lookups"
ADD CONSTRAINT "barcode_lookups_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "barcode_lookups_barcode_created_at_idx"
ON "barcode_lookups"("barcode", "created_at");

CREATE INDEX "barcode_lookups_status_created_at_idx"
ON "barcode_lookups"("status", "created_at");

CREATE INDEX "barcode_lookups_matched_product_id_created_at_idx"
ON "barcode_lookups"("matched_product_id", "created_at");

CREATE INDEX "barcode_lookups_user_id_created_at_idx"
ON "barcode_lookups"("user_id", "created_at");
