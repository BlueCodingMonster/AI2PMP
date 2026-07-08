DO $$
BEGIN
  CREATE TYPE "WorkItemType" AS ENUM (
    'REQUIREMENT',
    'VERSION_GOAL',
    'PROJECT_MATTER',
    'OPERATIONS',
    'MARKET_SUPPORT',
    'RESEARCH',
    'DEFECT_FIX',
    'TEMPORARY'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PlanningTreatment" AS ENUM (
    'NOT_INCLUDED',
    'ADD_TO_CURRENT',
    'MOVE_TO_NEXT',
    'LINK_EXISTING_ITEM'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "plan_items" ALTER COLUMN "planId" DROP NOT NULL;
ALTER TABLE "plan_items" ADD COLUMN IF NOT EXISTS "productLineTeamId" TEXT;
ALTER TABLE "plan_items" ADD COLUMN IF NOT EXISTS "type" "WorkItemType" NOT NULL DEFAULT 'REQUIREMENT';
ALTER TABLE "plan_items" ADD COLUMN IF NOT EXISTS "isPlanned" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "plan_items" ADD COLUMN IF NOT EXISTS "planningTreatment" "PlanningTreatment";
ALTER TABLE "plan_items" ADD COLUMN IF NOT EXISTS "relatedPlanItemId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plan_items_productLineTeamId_fkey'
  ) THEN
    ALTER TABLE "plan_items"
      ADD CONSTRAINT "plan_items_productLineTeamId_fkey"
      FOREIGN KEY ("productLineTeamId") REFERENCES "product_line_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plan_items_relatedPlanItemId_fkey'
  ) THEN
    ALTER TABLE "plan_items"
      ADD CONSTRAINT "plan_items_relatedPlanItemId_fkey"
      FOREIGN KEY ("relatedPlanItemId") REFERENCES "plan_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "plan_items_productLineTeamId_idx" ON "plan_items"("productLineTeamId");
CREATE INDEX IF NOT EXISTS "plan_items_type_idx" ON "plan_items"("type");
CREATE INDEX IF NOT EXISTS "plan_items_isPlanned_idx" ON "plan_items"("isPlanned");
CREATE INDEX IF NOT EXISTS "plan_items_planningTreatment_idx" ON "plan_items"("planningTreatment");
CREATE INDEX IF NOT EXISTS "plan_items_relatedPlanItemId_idx" ON "plan_items"("relatedPlanItemId");
