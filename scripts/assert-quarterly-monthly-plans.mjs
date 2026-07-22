import { existsSync, readFileSync } from "node:fs";

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const files = {
  schema: read("prisma/schema.prisma"),
  quarterlyValidation: read("src/lib/validations/quarterly-plans.ts"),
  monthlyValidation: read("src/lib/validations/monthly-plans.ts"),
  permissions: read("src/lib/plans/permissions.ts"),
  dictionaries: read("src/lib/plans/dictionaries.ts"),
  quarterlyActions: read("src/actions/quarterly-plans.ts"),
  monthlyActions: read("src/actions/monthly-plans.ts"),
  listPage: read("src/app/(dashboard)/plans/page.tsx"),
  navigation: read("src/components/layout/dashboard-layout-client.tsx"),
  quarterlyForm: read("src/components/plans/quarterly-plan-form.tsx"),
};

const failures = [];
const includes = (source, value, message) => {
  if (!source.includes(value)) failures.push(message);
};
const excludes = (source, value, message) => {
  if (source.includes(value)) failures.push(message);
};

for (const model of [
  "QuarterlyPlan",
  "QuarterlyGoal",
  "QuarterlyRisk",
  "MonthlyPlan",
  "MonthlyProductDelivery",
  "MonthlyProjectDelivery",
  "MonthlyMarketAction",
  "MonthlyCostOptimization",
  "MonthlyAiProductEnablement",
  "MonthlyAiEfficiency",
  "MonthlyRisk",
  "MonthlyResourceRequest",
]) {
  includes(files.schema, `model ${model} {`, `Prisma 缺少模型 ${model}`);
}

for (const oldModel of ["model Plan {", "model PlanItem {", "model PlanItemStage {"]) {
  excludes(files.schema, oldModel, `Prisma 仍包含旧模型 ${oldModel}`);
}
for (const oldEnum of ["enum PlanType {", "enum PlanItemStatus {"]) {
  excludes(files.schema, oldEnum, `Prisma 仍包含旧枚举 ${oldEnum}`);
}

const quarterlyModel = files.schema.match(/model QuarterlyPlan \{[\s\S]*?\n\}/)?.[0] ?? "";
const monthlyModel = files.schema.match(/model MonthlyPlan \{[\s\S]*?\n\}/)?.[0] ?? "";
excludes(quarterlyModel, "monthlyPlan", "季度计划不能关联月度计划");
excludes(monthlyModel, "quarterlyPlan", "月度计划不能关联季度计划");
includes(quarterlyModel, "@@unique([productLineTeamId, year, quarter])", "季度计划缺少周期唯一约束");
includes(monthlyModel, "@@unique([productLineTeamId, year, month])", "月度计划缺少周期唯一约束");

includes(files.dictionaries, "quarterlyGoalDomainLabels", "缺少季度目标域集中字典");
includes(files.permissions, "ProductLineRole.LEADER", "计划权限未限定产品线组长");
includes(files.quarterlyValidation, "quarterlyPublishSchema", "缺少季度发布校验");
excludes(files.quarterlyValidation, '["quarterlyStatus", goal.quarterlyStatus]', "季度状态不应作为发布必填字段");
includes(files.quarterlyForm, '"达成率", "季度状态"', "达成率和季度状态表头不应标记为必填");
includes(files.monthlyValidation, "monthlyPublishSchema", "缺少月度发布校验");
includes(files.quarterlyActions, "publishQuarterlyPlan", "缺少季度发布动作");
includes(files.monthlyActions, "publishMonthlyPlan", "缺少月度发布动作");
includes(files.listPage, "quarterly", "计划列表缺少季度页签");
includes(files.listPage, "monthly", "计划列表缺少月度页签");

for (const route of [
  "src/app/(dashboard)/plans/quarterly/new/page.tsx",
  "src/app/(dashboard)/plans/quarterly/[planId]/page.tsx",
  "src/app/(dashboard)/plans/quarterly/[planId]/edit/page.tsx",
  "src/app/(dashboard)/plans/monthly/new/page.tsx",
  "src/app/(dashboard)/plans/monthly/[planId]/page.tsx",
  "src/app/(dashboard)/plans/monthly/[planId]/edit/page.tsx",
]) {
  if (!existsSync(route)) failures.push(`缺少路由 ${route}`);
}

excludes(files.navigation, "计划总览", "导航仍包含计划总览");
excludes(files.navigation, "计划外工作", "导航仍包含计划外工作");

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("季度与月度计划模块契约检查通过");
