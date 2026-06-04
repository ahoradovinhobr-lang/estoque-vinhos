CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "user_role" AS ENUM ('admin', 'estoque', 'consulta');
CREATE TYPE "record_status" AS ENUM ('active', 'inactive');
CREATE TYPE "product_type" AS ENUM ('wine', 'sparkling');
CREATE TYPE "location_type" AS ENUM ('shelf', 'wooden_cellar', 'display', 'other');
CREATE TYPE "movement_type" AS ENUM ('entry', 'exit', 'transfer', 'adjustment', 'inventory', 'loss', 'reversal');
CREATE TYPE "movement_status" AS ENUM ('active', 'reversed');
CREATE TYPE "audit_status" AS ENUM ('pending', 'adjusted', 'ignored');
CREATE TYPE "import_status" AS ENUM ('draft', 'validated', 'imported', 'failed');

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" "user_role" NOT NULL DEFAULT 'consulta',
  "status" "record_status" NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "suppliers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "document" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "notes" TEXT,
  "status" "record_status" NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_families" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "normalized_name" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "type" "product_type" NOT NULL,
  "supplier_id" UUID,
  "supplier_key" TEXT NOT NULL DEFAULT 'sem_fornecedor',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_families_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "products" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_family_id" UUID NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "product_type" NOT NULL,
  "country" TEXT,
  "supplier_id" UUID,
  "vintage" TEXT,
  "barcode" TEXT,
  "notes" TEXT,
  "status" "record_status" NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "storage_locations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" "location_type" NOT NULL,
  "description" TEXT,
  "status" "record_status" NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "storage_locations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_balances" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "storage_location_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_balances_quantity_non_negative" CHECK ("quantity" >= 0)
);

CREATE TABLE "import_batches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "file_name" TEXT NOT NULL,
  "file_hash" TEXT NOT NULL,
  "status" "import_status" NOT NULL DEFAULT 'draft',
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "valid_rows" INTEGER NOT NULL DEFAULT 0,
  "error_rows" INTEGER NOT NULL DEFAULT 0,
  "user_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_audits" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "storage_location_id" UUID NOT NULL,
  "expected_quantity" INTEGER NOT NULL,
  "counted_quantity" INTEGER NOT NULL,
  "difference" INTEGER NOT NULL,
  "status" "audit_status" NOT NULL DEFAULT 'pending',
  "notes" TEXT,
  "user_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_audits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_audits_counted_quantity_non_negative" CHECK ("counted_quantity" >= 0)
);

CREATE TABLE "stock_movements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "movement_type" "movement_type" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "source_location_id" UUID,
  "destination_location_id" UUID,
  "affected_location_id" UUID,
  "supplier_id" UUID,
  "inventory_audit_id" UUID,
  "import_batch_id" UUID,
  "idempotency_key" TEXT,
  "reason" TEXT,
  "notes" TEXT,
  "user_id" UUID NOT NULL,
  "status" "movement_status" NOT NULL DEFAULT 'active',
  "reversed_movement_id" UUID,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_movements_quantity_positive" CHECK ("quantity" > 0)
);

CREATE TABLE "stock_movement_lines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "stock_movement_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "storage_location_id" UUID NOT NULL,
  "quantity_before" INTEGER NOT NULL,
  "quantity_delta" INTEGER NOT NULL,
  "quantity_after" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_movement_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_movement_lines_after_matches_delta" CHECK ("quantity_after" = "quantity_before" + "quantity_delta"),
  CONSTRAINT "stock_movement_lines_after_non_negative" CHECK ("quantity_after" >= 0)
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");

CREATE UNIQUE INDEX "product_families_unique_identity" ON "product_families"("normalized_name", "type", "supplier_key");
CREATE INDEX "product_families_displayName_idx" ON "product_families"("display_name");

CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
CREATE INDEX "products_name_idx" ON "products"("name");
CREATE INDEX "products_barcode_idx" ON "products"("barcode");
CREATE INDEX "products_productFamilyId_barcode_idx" ON "products"("product_family_id", "barcode");

CREATE UNIQUE INDEX "storage_locations_code_key" ON "storage_locations"("code");
CREATE INDEX "storage_locations_name_idx" ON "storage_locations"("name");

CREATE UNIQUE INDEX "inventory_balances_product_location_unique" ON "inventory_balances"("product_id", "storage_location_id");
CREATE INDEX "inventory_balances_storageLocationId_idx" ON "inventory_balances"("storage_location_id");

CREATE UNIQUE INDEX "import_batches_file_hash_key" ON "import_batches"("file_hash");
CREATE INDEX "import_batches_status_idx" ON "import_batches"("status");

CREATE INDEX "inventory_audits_status_idx" ON "inventory_audits"("status");
CREATE INDEX "inventory_audits_productId_storageLocationId_idx" ON "inventory_audits"("product_id", "storage_location_id");

CREATE UNIQUE INDEX "stock_movements_inventory_audit_id_key" ON "stock_movements"("inventory_audit_id");
CREATE UNIQUE INDEX "stock_movements_idempotency_key_key" ON "stock_movements"("idempotency_key");
CREATE UNIQUE INDEX "stock_movements_reversed_movement_id_key" ON "stock_movements"("reversed_movement_id");
CREATE INDEX "stock_movements_productId_createdAt_idx" ON "stock_movements"("product_id", "created_at");
CREATE INDEX "stock_movements_movementType_idx" ON "stock_movements"("movement_type");
CREATE INDEX "stock_movements_status_idx" ON "stock_movements"("status");
CREATE INDEX "stock_movements_sourceLocationId_idx" ON "stock_movements"("source_location_id");
CREATE INDEX "stock_movements_destinationLocationId_idx" ON "stock_movements"("destination_location_id");
CREATE INDEX "stock_movements_affectedLocationId_idx" ON "stock_movements"("affected_location_id");

CREATE UNIQUE INDEX "stock_movement_lines_movement_location_unique" ON "stock_movement_lines"("stock_movement_id", "storage_location_id");
CREATE INDEX "stock_movement_lines_productId_idx" ON "stock_movement_lines"("product_id");
CREATE INDEX "stock_movement_lines_storageLocationId_idx" ON "stock_movement_lines"("storage_location_id");

ALTER TABLE "product_families"
  ADD CONSTRAINT "product_families_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "products"
  ADD CONSTRAINT "products_product_family_id_fkey"
  FOREIGN KEY ("product_family_id") REFERENCES "product_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "products"
  ADD CONSTRAINT "products_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inventory_balances"
  ADD CONSTRAINT "inventory_balances_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_balances"
  ADD CONSTRAINT "inventory_balances_storage_location_id_fkey"
  FOREIGN KEY ("storage_location_id") REFERENCES "storage_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "import_batches"
  ADD CONSTRAINT "import_batches_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_audits"
  ADD CONSTRAINT "inventory_audits_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_audits"
  ADD CONSTRAINT "inventory_audits_storage_location_id_fkey"
  FOREIGN KEY ("storage_location_id") REFERENCES "storage_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_audits"
  ADD CONSTRAINT "inventory_audits_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_source_location_id_fkey"
  FOREIGN KEY ("source_location_id") REFERENCES "storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_destination_location_id_fkey"
  FOREIGN KEY ("destination_location_id") REFERENCES "storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_affected_location_id_fkey"
  FOREIGN KEY ("affected_location_id") REFERENCES "storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_inventory_audit_id_fkey"
  FOREIGN KEY ("inventory_audit_id") REFERENCES "inventory_audits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_import_batch_id_fkey"
  FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_reversed_movement_id_fkey"
  FOREIGN KEY ("reversed_movement_id") REFERENCES "stock_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_movement_lines"
  ADD CONSTRAINT "stock_movement_lines_stock_movement_id_fkey"
  FOREIGN KEY ("stock_movement_id") REFERENCES "stock_movements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_movement_lines"
  ADD CONSTRAINT "stock_movement_lines_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_movement_lines"
  ADD CONSTRAINT "stock_movement_lines_storage_location_id_fkey"
  FOREIGN KEY ("storage_location_id") REFERENCES "storage_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
