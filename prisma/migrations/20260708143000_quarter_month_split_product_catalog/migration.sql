ALTER TABLE "plan_items"
  ADD COLUMN IF NOT EXISTS "plannedMonths" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

CREATE INDEX IF NOT EXISTS "plan_items_plannedMonths_idx"
  ON "plan_items" USING GIN ("plannedMonths");
