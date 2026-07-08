import { readFileSync } from "node:fs";

const files = {
  schema: readFileSync("prisma/schema.prisma", "utf8"),
  plansAction: readFileSync("src/actions/plans.ts", "utf8"),
  planValidation: readFileSync("src/lib/validations/plans.ts", "utf8"),
  planModal: readFileSync("src/components/plans/plan-item-modal.tsx", "utf8"),
  planDetails: readFileSync("src/components/plans/plan-details-client.tsx", "utf8"),
};

const failures = [];

function expectIncludes(source, needle, message) {
  if (!source.includes(needle)) failures.push(message);
}

function expectMatch(source, pattern, message) {
  if (!pattern.test(source)) failures.push(message);
}

expectIncludes(files.schema, "enum ProductVersionStatus", "Schema must define ProductVersionStatus.");
expectIncludes(files.schema, "model ProductPlatform", "Schema must define ProductPlatform.");
expectIncludes(files.schema, "model ProductModule", "Schema must define ProductModule.");
expectIncludes(files.schema, "model ProductVersion", "Schema must define ProductVersion.");
expectIncludes(files.schema, "productVersionId String?", "PlanItem must optionally link to ProductVersion.");
expectIncludes(files.schema, "productVersions ProductVersion[]", "ProductLineTeam must expose productVersions or platform productVersions through relations.");

expectMatch(
  files.planValidation,
  /productVersionId:\s*z\.string\(\)\.optional\(\)\.nullable\(\)/,
  "planItemSchema must accept optional productVersionId."
);

expectIncludes(files.plansAction, "getProductVersionOptions", "Plans action must expose product version options.");
expectIncludes(files.plansAction, "productVersionId: data.productVersionId", "Plan item create/update must persist productVersionId.");
expectIncludes(files.plansAction, "productVersion", "Plan detail query must include linked productVersion.");

expectIncludes(files.planModal, "productVersionId", "Plan item modal must allow selecting productVersionId.");
expectIncludes(files.planDetails, "productVersion", "Plan details must display linked productVersion.");

if (failures.length > 0) {
  console.error("Product version plan-link checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Product version plan-link checks passed.");
