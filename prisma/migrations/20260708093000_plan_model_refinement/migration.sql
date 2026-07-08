DO $$
BEGIN
  ALTER TYPE "PlanStatus" ADD VALUE IF NOT EXISTS 'ADJUSTED';
  ALTER TYPE "PlanStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "WorkItemSource" AS ENUM (
    'PLATFORM_RND',
    'LOCAL_DELIVERY',
    'UNPLANNED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ExecutionFlowTemplate" AS ENUM (
    'NONE',
    'INTERNAL_RND',
    'LOCAL_DEPLOYMENT',
    'DATA_MIGRATION',
    'SYSTEM_INTEGRATION',
    'ONSITE_IMPLEMENTATION'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SpecialTaskCategory" AS ENUM (
    'TECH_RESEARCH',
    'SCENARIO_VALIDATION',
    'INTELLECTUAL_PROPERTY'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "IntellectualPropertyType" AS ENUM (
    'PATENT',
    'SOFTWARE_COPYRIGHT',
    'STANDARD'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "StageGroup" AS ENUM (
    'PRODUCT',
    'DEVELOPMENT',
    'TEST_RELEASE',
    'DELIVERY',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "sourcePlanId" TEXT;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "replacementPlanId" TEXT;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "adjustedReason" TEXT;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "voidedReason" TEXT;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "voidedAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plans_sourcePlanId_fkey'
  ) THEN
    ALTER TABLE "plans"
      ADD CONSTRAINT "plans_sourcePlanId_fkey"
      FOREIGN KEY ("sourcePlanId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plans_replacementPlanId_fkey'
  ) THEN
    ALTER TABLE "plans"
      ADD CONSTRAINT "plans_replacementPlanId_fkey"
      FOREIGN KEY ("replacementPlanId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "plans_sourcePlanId_idx" ON "plans"("sourcePlanId");
CREATE INDEX IF NOT EXISTS "plans_replacementPlanId_idx" ON "plans"("replacementPlanId");

ALTER TABLE "plan_items" ADD COLUMN IF NOT EXISTS "source" "WorkItemSource" NOT NULL DEFAULT 'PLATFORM_RND';
ALTER TABLE "plan_items" ADD COLUMN IF NOT EXISTS "executionFlow" "ExecutionFlowTemplate" NOT NULL DEFAULT 'NONE';
ALTER TABLE "plan_items" ADD COLUMN IF NOT EXISTS "versionNameText" TEXT;
ALTER TABLE "plan_items" ADD COLUMN IF NOT EXISTS "specialTaskCategory" "SpecialTaskCategory";
ALTER TABLE "plan_items" ADD COLUMN IF NOT EXISTS "ipType" "IntellectualPropertyType";
ALTER TABLE "plan_items" ADD COLUMN IF NOT EXISTS "specialSerialNo" TEXT;
ALTER TABLE "plan_items" ADD COLUMN IF NOT EXISTS "specialTarget" TEXT;
ALTER TABLE "plan_items" ADD COLUMN IF NOT EXISTS "specialOwnerText" TEXT;
ALTER TABLE "plan_items" ADD COLUMN IF NOT EXISTS "plannedFinishText" TEXT;

CREATE INDEX IF NOT EXISTS "plan_items_source_idx" ON "plan_items"("source");
CREATE INDEX IF NOT EXISTS "plan_items_executionFlow_idx" ON "plan_items"("executionFlow");
CREATE INDEX IF NOT EXISTS "plan_items_specialTaskCategory_idx" ON "plan_items"("specialTaskCategory");
CREATE INDEX IF NOT EXISTS "plan_items_ipType_idx" ON "plan_items"("ipType");

CREATE TABLE IF NOT EXISTS "plan_item_stages" (
  "id" TEXT NOT NULL,
  "planItemId" TEXT NOT NULL,
  "group" "StageGroup" NOT NULL,
  "name" TEXT NOT NULL,
  "isMilestone" BOOLEAN NOT NULL DEFAULT false,
  "status" "PlanItemStatus" NOT NULL DEFAULT 'TODO',
  "plannedTime" TEXT,
  "assigneeId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "plan_item_stages_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plan_item_stages_planItemId_fkey'
  ) THEN
    ALTER TABLE "plan_item_stages"
      ADD CONSTRAINT "plan_item_stages_planItemId_fkey"
      FOREIGN KEY ("planItemId") REFERENCES "plan_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plan_item_stages_assigneeId_fkey'
  ) THEN
    ALTER TABLE "plan_item_stages"
      ADD CONSTRAINT "plan_item_stages_assigneeId_fkey"
      FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "plan_item_stages_planItemId_idx" ON "plan_item_stages"("planItemId");
CREATE INDEX IF NOT EXISTS "plan_item_stages_group_idx" ON "plan_item_stages"("group");
CREATE INDEX IF NOT EXISTS "plan_item_stages_isMilestone_idx" ON "plan_item_stages"("isMilestone");
CREATE INDEX IF NOT EXISTS "plan_item_stages_status_idx" ON "plan_item_stages"("status");
CREATE INDEX IF NOT EXISTS "plan_item_stages_assigneeId_idx" ON "plan_item_stages"("assigneeId");
