ALTER TABLE "requirements" ADD COLUMN "sequenceNo" INTEGER;
ALTER TABLE "requirements" ADD COLUMN "reviewedAt" TIMESTAMP(3);

CREATE SEQUENCE "requirements_sequence_no_seq";
WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS number
  FROM "requirements"
)
UPDATE "requirements" AS requirement
SET "sequenceNo" = numbered.number
FROM numbered
WHERE requirement."id" = numbered."id";

SELECT setval(
  'requirements_sequence_no_seq',
  GREATEST(COALESCE((SELECT MAX("sequenceNo") FROM "requirements"), 0), 1),
  EXISTS (SELECT 1 FROM "requirements")
);
ALTER SEQUENCE "requirements_sequence_no_seq" OWNED BY "requirements"."sequenceNo";
ALTER TABLE "requirements" ALTER COLUMN "sequenceNo" SET DEFAULT nextval('requirements_sequence_no_seq');
ALTER TABLE "requirements" ALTER COLUMN "sequenceNo" SET NOT NULL;
CREATE UNIQUE INDEX "requirements_sequenceNo_key" ON "requirements"("sequenceNo");

CREATE TYPE "RequirementStatus_new" AS ENUM (
  'PENDING_REVIEW', 'UNDER_REVIEW', 'REVIEWED', 'REJECTED', 'SCHEDULED', 'COMPLETED'
);
ALTER TABLE "requirements" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "requirements" ALTER COLUMN "status" TYPE "RequirementStatus_new"
USING (
  CASE "status"::text
    WHEN 'DRAFT' THEN 'PENDING_REVIEW'
    WHEN 'UNDER_REVIEW' THEN 'UNDER_REVIEW'
    WHEN 'APPROVED' THEN 'REVIEWED'
    WHEN 'REJECTED' THEN 'REJECTED'
    WHEN 'PLANNED' THEN 'SCHEDULED'
    WHEN 'IN_PROGRESS' THEN 'SCHEDULED'
    WHEN 'COMPLETED' THEN 'COMPLETED'
    WHEN 'DEFERRED' THEN 'PENDING_REVIEW'
  END
)::"RequirementStatus_new";
DROP TYPE "RequirementStatus";
ALTER TYPE "RequirementStatus_new" RENAME TO "RequirementStatus";
ALTER TABLE "requirements" ALTER COLUMN "status" SET DEFAULT 'PENDING_REVIEW';

CREATE TYPE "RequirementSource_new" AS ENUM (
  'PRODUCT_PLANNING', 'CUSTOMER_FEEDBACK', 'INTERNAL_REQUEST', 'MARKET_REQUEST'
);
ALTER TABLE "requirements" ALTER COLUMN "source" TYPE "RequirementSource_new"
USING (
  CASE "source"::text
    WHEN 'PRODUCT_PLANNING' THEN 'PRODUCT_PLANNING'
    WHEN 'CUSTOMER_FEEDBACK' THEN 'CUSTOMER_FEEDBACK'
    WHEN 'INTERNAL_SUGGESTION' THEN 'INTERNAL_REQUEST'
    WHEN 'MARKET_ANALYSIS' THEN 'MARKET_REQUEST'
    WHEN 'TECH_DEBT' THEN 'INTERNAL_REQUEST'
  END
)::"RequirementSource_new";
DROP TYPE "RequirementSource";
ALTER TYPE "RequirementSource_new" RENAME TO "RequirementSource";

UPDATE "requirements" SET "priority" = 'HIGH' WHERE "priority" = 'URGENT';

ALTER TABLE "requirements" DROP CONSTRAINT IF EXISTS "requirements_projectId_fkey";
ALTER TABLE "requirements" DROP CONSTRAINT IF EXISTS "requirements_assigneeId_fkey";
DROP INDEX IF EXISTS "requirements_projectId_idx";
DROP INDEX IF EXISTS "requirements_assigneeId_idx";
DROP INDEX IF EXISTS "requirements_type_idx";

ALTER TABLE "requirements"
  DROP COLUMN "description",
  DROP COLUMN "type",
  DROP COLUMN "businessValue",
  DROP COLUMN "complexity",
  DROP COLUMN "estimatedDays",
  DROP COLUMN "projectId",
  DROP COLUMN "assigneeId",
  DROP COLUMN "acceptanceCriteria",
  DROP COLUMN "sortOrder";

DROP TYPE "RequirementType";
