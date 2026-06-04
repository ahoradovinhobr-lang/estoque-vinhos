CREATE TYPE "wine_color" AS ENUM ('red', 'white', 'rose');

ALTER TABLE "products"
  ADD COLUMN "wine_color" "wine_color",
  ADD COLUMN "grape" TEXT;

CREATE INDEX "products_wineColor_idx" ON "products"("wine_color");
CREATE INDEX "products_grape_idx" ON "products"("grape");
