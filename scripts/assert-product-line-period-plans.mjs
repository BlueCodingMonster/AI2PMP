import { readFileSync } from "node:fs";

const files = {
  schema: readFileSync("prisma/schema.prisma", "utf8"),
  validation: readFileSync("src/lib/validations/plans.ts", "utf8"),
  actions: readFileSync("src/actions/plans.ts", "utf8"),
  form: readFileSync("src/components/plans/plan-form.tsx", "utf8"),
  listPage: readFileSync("src/app/(dashboard)/plans/page.tsx", "utf8"),
  details: readFileSync("src/components/plans/plan-details-client.tsx", "utf8"),
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
expectIncludes(files.actions, "productLineTeam", "Plan actions must include product-line metadata.");
expectIncludes(files.actions, "halfYear: data.halfYear", "Plan actions must persist halfYear.");
expectIncludes(files.actions, "productLineTeamId: data.productLineTeamId", "Plan actions must persist productLineTeamId.");
expectMatch(
  files.actions,
  /getParentPlanOptions\([^)]*productLineTeamId/s,
  "Related plan options must be scoped by productLineTeamId."
);

expectIncludes(files.form, "PlanType.HALF_YEAR", "Plan form must offer half-year plans.");
expectIncludes(files.form, "productLineTeamId", "Plan form must require product line selection.");
expectIncludes(files.form, "halfYear", "Plan form must expose half-year selection.");
expectMatch(
  files.form,
  /parentPlanId:[\s\S]*undefined/s,
  "Related plan selection must remain optional in the plan form payload."
);

expectIncludes(files.listPage, "HALF_YEAR", "Plans list page must include half-year plans.");
expectIncludes(files.listPage, "productLineTeam", "Plans list page must display product-line metadata.");
expectIncludes(files.details, "productLineTeam", "Plan detail page must display product-line metadata.");

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
} catch (e) {
  // Ignore
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
await prisma.$disconnect();
await pool.end();
