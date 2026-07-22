-- Make products and versions a global catalog independent of product-line teams.
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_productLineTeamId_fkey";
DROP INDEX IF EXISTS "products_productLineTeamId_name_key";
DROP INDEX IF EXISTS "products_productLineTeamId_idx";

ALTER TABLE "product_versions" DROP CONSTRAINT IF EXISTS "product_versions_productLineTeamId_fkey";
DROP INDEX IF EXISTS "product_versions_productLineTeamId_idx";

ALTER TABLE "products" DROP COLUMN "productLineTeamId";
ALTER TABLE "product_versions" DROP COLUMN "productLineTeamId";

CREATE UNIQUE INDEX "products_name_key" ON "products"("name");
