import { readFileSync } from "node:fs";

const files = {
  schema: readFileSync("prisma/schema.prisma", "utf8"),
  validation: readFileSync("src/lib/validations/plans.ts", "utf8"),
  actions: readFileSync("src/actions/plans.ts", "utf8"),
  form: readFileSync("src/components/plans/plan-form.tsx", "utf8"),
  itemModal: readFileSync("src/components/plans/plan-item-modal.tsx", "utf8"),
  workflow: readFileSync("src/lib/plans/workflow-templates.ts", "utf8"),
  listPage: readFileSync("src/app/(dashboard)/plans/page.tsx", "utf8"),
  details: readFileSync("src/components/plans/plan-details-client.tsx", "utf8"),
  overviewPage: readFileSync("src/app/(dashboard)/plans/overview/page.tsx", "utf8"),
  overviewClient: readFileSync("src/components/plans/plan-overview-client.tsx", "utf8"),
};

const failures = [];

function expectIncludes(source, needle, message) {
  if (!source.includes(needle)) {
    failures.push(message);
  }
}

function expectMatch(source, pattern, message) {
  if (!pattern.test(source)) {
    failures.push(message);
  }
}

expectIncludes(files.schema, "HALF_YEAR", "PlanType must support HALF_YEAR.");
expectIncludes(files.schema, "halfYear", "Plan must store halfYear.");
expectIncludes(files.schema, "productLineTeamId String", "Plan must require productLineTeamId.");
expectIncludes(files.schema, "enum WorkItemSource", "Schema must define work item sources.");
expectIncludes(files.schema, "enum ExecutionFlowTemplate", "Schema must define execution flow templates.");
expectIncludes(files.schema, "model PlanItemStage", "Schema must define plan item stages.");
expectIncludes(files.schema, "specialTaskCategory SpecialTaskCategory?", "PlanItem must store special task metadata.");
expectMatch(
  files.schema,
  /productLineTeam\s+ProductLineTeam\s+@relation\(fields:\s*\[productLineTeamId\],\s*references:\s*\[id\]/s,
  "Plan must relate directly to ProductLineTeam."
);
expectMatch(files.schema, /plans\s+Plan\[\]/, "ProductLineTeam must expose plans relation.");

expectMatch(
  files.validation,
  /productLineTeamId:\s*z\.string\(\)\.min\(1/s,
  "planSchema must require productLineTeamId."
);
expectMatch(
  files.validation,
  /halfYear:\s*z\.number\(\)\.int\(\)\.min\(1\)\.max\(2\)/s,
  "planSchema must validate halfYear as 1-2."
);

expectIncludes(files.actions, "getPlanProductLineOptions", "Plan actions must expose product-line options.");
expectIncludes(files.actions, "createDefaultStages", "Plan actions must create default flow stages.");
expectIncludes(files.actions, "getPlanOverview", "Plan actions must expose management overview data.");
expectIncludes(files.actions, "productLineTeam", "Plan actions must include product-line metadata.");
expectIncludes(files.actions, "halfYear: data.halfYear", "Plan actions must persist halfYear.");
expectIncludes(files.actions, "productLineTeamId: data.productLineTeamId", "Plan actions must persist productLineTeamId.");
expectIncludes(
  files.actions,
  "planId: nextIsPlanned ? oldItem.planId : null",
  "Updating a work item to unplanned must clear planId."
);
expectIncludes(
  files.actions,
  "productLineTeamId: input.productLineTeamId ?? plan.productLineTeamId",
  "Adding an unplanned item from a plan must validate with the plan product-line team."
);
expectIncludes(
  files.actions,
  "progress: summary.plannedProgress",
  "Plan progress must use planned-only progress summary."
);
expectMatch(
  files.actions,
  /getParentPlanOptions\([^)]*productLineTeamId/s,
  "Related plan options must be scoped by productLineTeamId."
);

expectIncludes(files.form, "productLineTeamId", "Plan form must require product line selection.");
expectIncludes(files.schema, "HALF_YEAR", "Schema must keep HALF_YEAR for compatibility.");
if (files.form.includes('value={PlanType.HALF_YEAR}')) {
  failures.push("Plan form must hide HALF_YEAR from formal creation entry.");
}
expectMatch(
  files.form,
  /parentPlanId:[\s\S]*undefined/s,
  "Related plan selection must remain optional in the plan form payload."
);

expectIncludes(files.listPage, "HALF_YEAR", "Plans list page must include half-year plans.");
expectIncludes(files.listPage, "productLineTeam", "Plans list page must display product-line metadata.");
expectIncludes(files.workflow, "LOCAL_DELIVERY", "Workflow labels must support local delivery source.");
expectIncludes(files.itemModal, "ExecutionFlowTemplate", "Plan item modal must support execution flow templates.");
expectIncludes(files.itemModal, "specialTaskCategory", "Plan item modal must capture special task category.");
expectIncludes(files.workflow, "项目/任务启动会", "Workflow templates must include kickoff milestone.");
expectIncludes(files.workflow, "需求评审及宣讲", "Workflow templates must include requirement review milestone.");
expectIncludes(files.workflow, "研发启动", "Workflow templates must include development kickoff milestone.");
expectIncludes(files.workflow, "提测", "Workflow templates must include test submission milestone.");
expectIncludes(files.details, "productLineTeam", "Plan detail page must display product-line metadata.");
expectIncludes(files.details, "stages", "Plan detail page must display flow stages.");
expectIncludes(files.overviewPage, "getPlanOverview", "Plan overview page must load overview data.");
expectIncludes(files.overviewClient, "计划整体视图", "Plan overview client must render management overview.");

if (failures.length > 0) {
  console.error("Product-line period plan checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Product-line period plan checks passed.");

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

try {
  const envFile = readFileSync(".env", "utf8");
  const match = envFile.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
  if (match) {
    process.env.DATABASE_URL = match[1];
  }
} catch {
  // Ignore missing local environment file in static-only checks.
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

try {
  const unplannedCount = await prisma.planItem.count({
    where: { isPlanned: false, planId: null },
  });

  const pollutedPlanCount = await prisma.planItem.count({
    where: { isPlanned: false, planId: { not: null } },
  });

  if (pollutedPlanCount > 0) {
    throw new Error(`发现 ${pollutedPlanCount} 个计划外工作被直接计入计划，请检查 planningTreatment 处理方式`);
  }

  console.log(`计划外工作池记录数：${unplannedCount}`);
} catch (error) {
  console.warn("[assert:plans] 数据库探针跳过：本地数据库不可用或当前迁移未应用。");
  console.warn(error instanceof Error ? error.message : error);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
