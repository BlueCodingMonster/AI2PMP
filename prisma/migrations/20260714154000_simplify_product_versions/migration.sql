-- Simplify product catalog from Product -> Module -> Version to Product -> Version.
ALTER TABLE "product_platforms" RENAME TO "products";

ALTER TABLE "product_versions" ADD COLUMN "productId" TEXT;

UPDATE "product_versions" AS version
SET "productId" = module."productPlatformId"
FROM "product_modules" AS module
WHERE version."productModuleId" = module."id";

ALTER TABLE "product_versions" ALTER COLUMN "productId" SET NOT NULL;

ALTER TABLE "product_versions" DROP CONSTRAINT IF EXISTS "product_versions_productModuleId_fkey";
DROP INDEX IF EXISTS "product_versions_productModuleId_version_key";
DROP INDEX IF EXISTS "product_versions_productModuleId_idx";

ALTER TABLE "product_versions" DROP COLUMN "productModuleId";

ALTER TABLE "product_versions"
  ADD CONSTRAINT "product_versions_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "product_versions_productId_version_key" ON "product_versions"("productId", "version");
CREATE INDEX "product_versions_productId_idx" ON "product_versions"("productId");

DROP TABLE "product_modules";
