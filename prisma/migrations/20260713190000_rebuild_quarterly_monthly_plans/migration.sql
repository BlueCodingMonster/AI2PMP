-- CreateEnum
CREATE TYPE "PlanPublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "QuarterlyGoalDomain" AS ENUM ('PRODUCT_ITERATION', 'PRODUCT_DELIVERY', 'PRODUCT_RESEARCH', 'MARKET_SUPPORT', 'OPERATIONS_STABILITY', 'TECHNICAL_INNOVATION', 'AI_ENABLEMENT');

-- CreateEnum
CREATE TYPE "PlanTrackingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAY_RISK', 'DELAYED', 'PAUSED');

-- CreateEnum
CREATE TYPE "PlanRiskLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "QuarterlyRiskStatus" AS ENUM ('NOT_TRIGGERED', 'TRIGGERED', 'HANDLING', 'CLOSED');

-- CreateEnum
CREATE TYPE "ResourceRequestType" AS ENUM ('PEOPLE', 'TECHNOLOGY', 'BUDGET', 'MANAGEMENT_COORDINATION');

-- DropForeignKey
ALTER TABLE "plan_item_stages" DROP CONSTRAINT "plan_item_stages_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "plan_item_stages" DROP CONSTRAINT "plan_item_stages_planItemId_fkey";

-- DropForeignKey
ALTER TABLE "plan_items" DROP CONSTRAINT "plan_items_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "plan_items" DROP CONSTRAINT "plan_items_planId_fkey";

-- DropForeignKey
ALTER TABLE "plan_items" DROP CONSTRAINT "plan_items_productLineTeamId_fkey";

-- DropForeignKey
ALTER TABLE "plan_items" DROP CONSTRAINT "plan_items_productVersionId_fkey";

-- DropForeignKey
ALTER TABLE "plan_items" DROP CONSTRAINT "plan_items_projectId_fkey";

-- DropForeignKey
ALTER TABLE "plan_items" DROP CONSTRAINT "plan_items_relatedPlanItemId_fkey";

-- DropForeignKey
ALTER TABLE "plan_items" DROP CONSTRAINT "plan_items_requirementId_fkey";

-- DropForeignKey
ALTER TABLE "plan_items" DROP CONSTRAINT "plan_items_taskId_fkey";

-- DropForeignKey
ALTER TABLE "plans" DROP CONSTRAINT "plans_createdById_fkey";

-- DropForeignKey
ALTER TABLE "plans" DROP CONSTRAINT "plans_parentPlanId_fkey";

-- DropForeignKey
ALTER TABLE "plans" DROP CONSTRAINT "plans_productLineTeamId_fkey";

-- DropForeignKey
ALTER TABLE "plans" DROP CONSTRAINT "plans_replacementPlanId_fkey";

-- DropForeignKey
ALTER TABLE "plans" DROP CONSTRAINT "plans_sourcePlanId_fkey";

-- DropTable
DROP TABLE "plan_item_stages";

-- DropTable
DROP TABLE "plan_items";

-- DropTable
DROP TABLE "plans";

-- DropEnum
DROP TYPE "ExecutionFlowTemplate";

-- DropEnum
DROP TYPE "IntellectualPropertyType";

-- DropEnum
DROP TYPE "PlanItemStatus";

-- DropEnum
DROP TYPE "PlanStatus";

-- DropEnum
DROP TYPE "PlanType";

-- DropEnum
DROP TYPE "PlanningTreatment";

-- DropEnum
DROP TYPE "SpecialTaskCategory";

-- DropEnum
DROP TYPE "StageGroup";

-- DropEnum
DROP TYPE "WorkItemSource";

-- DropEnum
DROP TYPE "WorkItemType";

-- CreateTable
CREATE TABLE "quarterly_plans" (
    "id" TEXT NOT NULL,
    "productLineTeamId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "status" "PlanPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quarterly_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quarterly_goals" (
    "id" TEXT NOT NULL,
    "quarterlyPlanId" TEXT NOT NULL,
    "domain" "QuarterlyGoalDomain",
    "quarterlyGoal" TEXT,
    "successCriteria" TEXT,
    "month1Goal" TEXT,
    "month1Status" "PlanTrackingStatus",
    "month2Goal" TEXT,
    "month2Status" "PlanTrackingStatus",
    "month3Goal" TEXT,
    "month3Status" "PlanTrackingStatus",
    "currentCompletion" TEXT,
    "achievementRate" INTEGER NOT NULL DEFAULT 0,
    "quarterlyStatus" "PlanTrackingStatus",
    "keyDependencies" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quarterly_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quarterly_risks" (
    "id" TEXT NOT NULL,
    "quarterlyPlanId" TEXT NOT NULL,
    "riskDescription" TEXT,
    "affectedMilestone" TEXT,
    "probability" "PlanRiskLevel",
    "impact" "PlanRiskLevel",
    "overallLevel" "PlanRiskLevel",
    "triggerCondition" TEXT,
    "responseStrategy" TEXT,
    "warningPoint" TEXT,
    "status" "QuarterlyRiskStatus",
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quarterly_risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_plans" (
    "id" TEXT NOT NULL,
    "productLineTeamId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "PlanPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_product_deliveries" (
    "id" TEXT NOT NULL,
    "monthlyPlanId" TEXT NOT NULL,
    "moduleVersion" TEXT,
    "deliveryContent" TEXT,
    "plannedCompletionDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_product_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_project_deliveries" (
    "id" TEXT NOT NULL,
    "monthlyPlanId" TEXT NOT NULL,
    "projectName" TEXT,
    "deliveryContent" TEXT,
    "plannedCompletionDate" TIMESTAMP(3),
    "customerName" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_project_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_market_actions" (
    "id" TEXT NOT NULL,
    "monthlyPlanId" TEXT NOT NULL,
    "productOrProject" TEXT,
    "marketAction" TEXT,
    "outputResult" TEXT,
    "plannedCompletionDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_market_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_cost_optimizations" (
    "id" TEXT NOT NULL,
    "monthlyPlanId" TEXT NOT NULL,
    "optimizationItem" TEXT,
    "currentProblem" TEXT,
    "optimizationMeasure" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_cost_optimizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_ai_product_enablements" (
    "id" TEXT NOT NULL,
    "monthlyPlanId" TEXT NOT NULL,
    "item" TEXT,
    "outputResult" TEXT,
    "plannedCompletionDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_ai_product_enablements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_ai_efficiencies" (
    "id" TEXT NOT NULL,
    "monthlyPlanId" TEXT NOT NULL,
    "item" TEXT,
    "outputResult" TEXT,
    "plannedCompletionDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_ai_efficiencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_risks" (
    "id" TEXT NOT NULL,
    "monthlyPlanId" TEXT NOT NULL,
    "riskItem" TEXT,
    "riskLevel" "PlanRiskLevel",
    "impactScope" TEXT,
    "responseMeasure" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_resource_requests" (
    "id" TEXT NOT NULL,
    "monthlyPlanId" TEXT NOT NULL,
    "requestType" "ResourceRequestType",
    "content" TEXT,
    "urgency" "PlanRiskLevel",
    "supportDepartment" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_resource_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quarterly_plans_status_idx" ON "quarterly_plans"("status");

-- CreateIndex
CREATE INDEX "quarterly_plans_year_quarter_idx" ON "quarterly_plans"("year", "quarter");

-- CreateIndex
CREATE UNIQUE INDEX "quarterly_plans_productLineTeamId_year_quarter_key" ON "quarterly_plans"("productLineTeamId", "year", "quarter");

-- CreateIndex
CREATE INDEX "quarterly_goals_quarterlyPlanId_sortOrder_idx" ON "quarterly_goals"("quarterlyPlanId", "sortOrder");

-- CreateIndex
CREATE INDEX "quarterly_risks_quarterlyPlanId_sortOrder_idx" ON "quarterly_risks"("quarterlyPlanId", "sortOrder");

-- CreateIndex
CREATE INDEX "monthly_plans_status_idx" ON "monthly_plans"("status");

-- CreateIndex
CREATE INDEX "monthly_plans_year_month_idx" ON "monthly_plans"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_plans_productLineTeamId_year_month_key" ON "monthly_plans"("productLineTeamId", "year", "month");

-- CreateIndex
CREATE INDEX "monthly_product_deliveries_monthlyPlanId_sortOrder_idx" ON "monthly_product_deliveries"("monthlyPlanId", "sortOrder");

-- CreateIndex
CREATE INDEX "monthly_project_deliveries_monthlyPlanId_sortOrder_idx" ON "monthly_project_deliveries"("monthlyPlanId", "sortOrder");

-- CreateIndex
CREATE INDEX "monthly_market_actions_monthlyPlanId_sortOrder_idx" ON "monthly_market_actions"("monthlyPlanId", "sortOrder");

-- CreateIndex
CREATE INDEX "monthly_cost_optimizations_monthlyPlanId_sortOrder_idx" ON "monthly_cost_optimizations"("monthlyPlanId", "sortOrder");

-- CreateIndex
CREATE INDEX "monthly_ai_product_enablements_monthlyPlanId_sortOrder_idx" ON "monthly_ai_product_enablements"("monthlyPlanId", "sortOrder");

-- CreateIndex
CREATE INDEX "monthly_ai_efficiencies_monthlyPlanId_sortOrder_idx" ON "monthly_ai_efficiencies"("monthlyPlanId", "sortOrder");

-- CreateIndex
CREATE INDEX "monthly_risks_monthlyPlanId_sortOrder_idx" ON "monthly_risks"("monthlyPlanId", "sortOrder");

-- CreateIndex
CREATE INDEX "monthly_resource_requests_monthlyPlanId_sortOrder_idx" ON "monthly_resource_requests"("monthlyPlanId", "sortOrder");

-- AddForeignKey
ALTER TABLE "quarterly_plans" ADD CONSTRAINT "quarterly_plans_productLineTeamId_fkey" FOREIGN KEY ("productLineTeamId") REFERENCES "product_line_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quarterly_plans" ADD CONSTRAINT "quarterly_plans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quarterly_plans" ADD CONSTRAINT "quarterly_plans_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quarterly_goals" ADD CONSTRAINT "quarterly_goals_quarterlyPlanId_fkey" FOREIGN KEY ("quarterlyPlanId") REFERENCES "quarterly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quarterly_risks" ADD CONSTRAINT "quarterly_risks_quarterlyPlanId_fkey" FOREIGN KEY ("quarterlyPlanId") REFERENCES "quarterly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_plans" ADD CONSTRAINT "monthly_plans_productLineTeamId_fkey" FOREIGN KEY ("productLineTeamId") REFERENCES "product_line_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_plans" ADD CONSTRAINT "monthly_plans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_plans" ADD CONSTRAINT "monthly_plans_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_product_deliveries" ADD CONSTRAINT "monthly_product_deliveries_monthlyPlanId_fkey" FOREIGN KEY ("monthlyPlanId") REFERENCES "monthly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_project_deliveries" ADD CONSTRAINT "monthly_project_deliveries_monthlyPlanId_fkey" FOREIGN KEY ("monthlyPlanId") REFERENCES "monthly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_market_actions" ADD CONSTRAINT "monthly_market_actions_monthlyPlanId_fkey" FOREIGN KEY ("monthlyPlanId") REFERENCES "monthly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_cost_optimizations" ADD CONSTRAINT "monthly_cost_optimizations_monthlyPlanId_fkey" FOREIGN KEY ("monthlyPlanId") REFERENCES "monthly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_ai_product_enablements" ADD CONSTRAINT "monthly_ai_product_enablements_monthlyPlanId_fkey" FOREIGN KEY ("monthlyPlanId") REFERENCES "monthly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_ai_efficiencies" ADD CONSTRAINT "monthly_ai_efficiencies_monthlyPlanId_fkey" FOREIGN KEY ("monthlyPlanId") REFERENCES "monthly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_risks" ADD CONSTRAINT "monthly_risks_monthlyPlanId_fkey" FOREIGN KEY ("monthlyPlanId") REFERENCES "monthly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_resource_requests" ADD CONSTRAINT "monthly_resource_requests_monthlyPlanId_fkey" FOREIGN KEY ("monthlyPlanId") REFERENCES "monthly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

