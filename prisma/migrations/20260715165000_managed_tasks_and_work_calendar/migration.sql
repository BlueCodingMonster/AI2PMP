CREATE TYPE "ManagedTaskCategory" AS ENUM ('DEVELOPMENT', 'OTHER');
CREATE TYPE "ManagedTaskStatus" AS ENUM ('UNSCHEDULED', 'TODO', 'IN_PROGRESS', 'PAUSED', 'DONE', 'CANCELLED');
CREATE TYPE "ManagedTaskVersionType" AS ENUM ('PRODUCT', 'PROJECT');
CREATE TYPE "ManagedTaskMonthlyItemType" AS ENUM ('PRODUCT_DELIVERY', 'PROJECT_DELIVERY', 'MARKET_ACTION', 'COST_OPTIMIZATION', 'AI_PRODUCT_ENABLEMENT', 'AI_EFFICIENCY', 'RISK', 'RESOURCE_REQUEST');
CREATE TYPE "ManagedTaskSdlcNode" AS ENUM ('REQUIREMENT_ANALYSIS', 'SOLUTION_DESIGN', 'DEVELOPMENT', 'INTEGRATION', 'TESTING', 'RELEASE', 'ACCEPTANCE', 'OPERATION_OBSERVATION', 'OTHER');
CREATE TYPE "WorkCalendarStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TYPE "WorkCalendarDayType" AS ENUM ('REGULAR_WORKDAY', 'REGULAR_WEEKEND', 'LEGAL_HOLIDAY', 'ADJUSTED_WORKDAY', 'SPECIAL_REST_DAY', 'SPECIAL_WORKDAY');

CREATE TABLE "managed_tasks" (
    "id" TEXT NOT NULL,
    "sequenceNo" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL,
    "parentId" TEXT,
    "category" "ManagedTaskCategory",
    "sdlcNode" "ManagedTaskSdlcNode",
    "status" "ManagedTaskStatus" NOT NULL DEFAULT 'UNSCHEDULED',
    "planStartDate" TIMESTAMP(3),
    "planEndDate" TIMESTAMP(3),
    "plannedWorkdays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "actualStartAt" TIMESTAMP(3),
    "actualFinishAt" TIMESTAMP(3),
    "executorId" TEXT,
    "productLineTeamId" TEXT NOT NULL,
    "monthlyPlanId" TEXT,
    "monthlyItemType" "ManagedTaskMonthlyItemType",
    "monthlyItemId" TEXT,
    "versionType" "ManagedTaskVersionType",
    "productVersionId" TEXT,
    "projectVersionId" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "managed_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "managed_task_work_logs" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "content" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "managed_task_work_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "managed_task_status_logs" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fromStatus" "ManagedTaskStatus",
    "toStatus" "ManagedTaskStatus" NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    CONSTRAINT "managed_task_status_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "work_calendar_years" (
    "id" TEXT NOT NULL,
    "productLineTeamId" TEXT,
    "year" INTEGER NOT NULL,
    "status" "WorkCalendarStatus" NOT NULL DEFAULT 'DRAFT',
    "standardHours" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "work_calendar_years_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "work_calendar_days" (
    "id" TEXT NOT NULL,
    "calendarYearId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "WorkCalendarDayType" NOT NULL,
    "standardHours" DOUBLE PRECISION,
    "label" TEXT,
    "notes" TEXT,
    CONSTRAINT "work_calendar_days_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "managed_tasks_sequenceNo_key" ON "managed_tasks"("sequenceNo");
CREATE INDEX "managed_tasks_parentId_idx" ON "managed_tasks"("parentId");
CREATE INDEX "managed_tasks_level_idx" ON "managed_tasks"("level");
CREATE INDEX "managed_tasks_category_idx" ON "managed_tasks"("category");
CREATE INDEX "managed_tasks_status_idx" ON "managed_tasks"("status");
CREATE INDEX "managed_tasks_executorId_idx" ON "managed_tasks"("executorId");
CREATE INDEX "managed_tasks_productLineTeamId_idx" ON "managed_tasks"("productLineTeamId");
CREATE INDEX "managed_tasks_monthlyPlanId_idx" ON "managed_tasks"("monthlyPlanId");
CREATE INDEX "managed_tasks_productVersionId_idx" ON "managed_tasks"("productVersionId");
CREATE INDEX "managed_tasks_projectVersionId_idx" ON "managed_tasks"("projectVersionId");
CREATE INDEX "managed_tasks_planStartDate_planEndDate_idx" ON "managed_tasks"("planStartDate", "planEndDate");

CREATE INDEX "managed_task_work_logs_taskId_idx" ON "managed_task_work_logs"("taskId");
CREATE INDEX "managed_task_work_logs_userId_idx" ON "managed_task_work_logs"("userId");
CREATE INDEX "managed_task_work_logs_workDate_idx" ON "managed_task_work_logs"("workDate");

CREATE INDEX "managed_task_status_logs_taskId_idx" ON "managed_task_status_logs"("taskId");
CREATE INDEX "managed_task_status_logs_changedById_idx" ON "managed_task_status_logs"("changedById");
CREATE INDEX "managed_task_status_logs_changedAt_idx" ON "managed_task_status_logs"("changedAt");

CREATE UNIQUE INDEX "work_calendar_years_productLineTeamId_year_key" ON "work_calendar_years"("productLineTeamId", "year");
CREATE INDEX "work_calendar_years_year_idx" ON "work_calendar_years"("year");
CREATE INDEX "work_calendar_years_status_idx" ON "work_calendar_years"("status");

CREATE UNIQUE INDEX "work_calendar_days_calendarYearId_date_key" ON "work_calendar_days"("calendarYearId", "date");
CREATE INDEX "work_calendar_days_date_idx" ON "work_calendar_days"("date");
CREATE INDEX "work_calendar_days_type_idx" ON "work_calendar_days"("type");

ALTER TABLE "managed_tasks" ADD CONSTRAINT "managed_tasks_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "managed_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "managed_tasks" ADD CONSTRAINT "managed_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "managed_tasks" ADD CONSTRAINT "managed_tasks_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "managed_tasks" ADD CONSTRAINT "managed_tasks_productLineTeamId_fkey" FOREIGN KEY ("productLineTeamId") REFERENCES "product_line_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "managed_tasks" ADD CONSTRAINT "managed_tasks_monthlyPlanId_fkey" FOREIGN KEY ("monthlyPlanId") REFERENCES "monthly_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "managed_tasks" ADD CONSTRAINT "managed_tasks_productVersionId_fkey" FOREIGN KEY ("productVersionId") REFERENCES "product_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "managed_tasks" ADD CONSTRAINT "managed_tasks_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "project_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "managed_task_work_logs" ADD CONSTRAINT "managed_task_work_logs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "managed_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "managed_task_work_logs" ADD CONSTRAINT "managed_task_work_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "managed_task_status_logs" ADD CONSTRAINT "managed_task_status_logs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "managed_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "managed_task_status_logs" ADD CONSTRAINT "managed_task_status_logs_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_calendar_years" ADD CONSTRAINT "work_calendar_years_productLineTeamId_fkey" FOREIGN KEY ("productLineTeamId") REFERENCES "product_line_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_calendar_days" ADD CONSTRAINT "work_calendar_days_calendarYearId_fkey" FOREIGN KEY ("calendarYearId") REFERENCES "work_calendar_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;
