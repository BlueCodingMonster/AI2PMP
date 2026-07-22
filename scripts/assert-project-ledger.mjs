import fs from "node:fs";

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const manager = fs.readFileSync("src/components/projects/project-ledger-manager.tsx", "utf8");
const actions = fs.readFileSync("src/actions/projects.ts", "utf8");
const failures = [];

for (const field of ["customerName", "customerContact", "customerPhone", "projectManagerId", "marketManager", "salesManager", "contractAmount", "contractSignedAt", "warrantyMonths", "warrantyExpiresAt", "acceptanceDate"]) {
  if (!schema.includes(field)) failures.push(`Project missing ${field}`);
}
for (const status of ["CONTRACT_SIGNED", "IMPLEMENTING", "ACCEPTANCE", "ARCHIVED"]) {
  if (!schema.includes(status)) failures.push(`ProjectStatus missing ${status}`);
}
if (!schema.includes("model ProjectVersion")) failures.push("ProjectVersion model missing");
for (const action of ["createProjectVersion", "updateProjectVersion", "deleteProjectVersion"]) {
  if (!actions.includes(`export async function ${action}`)) failures.push(`${action} missing`);
}
for (const label of ["质保到期日", "合同金额", "项目负责人", "项目版本", "项目列表"]) {
  if (!manager.includes(label)) failures.push(`project page missing ${label}`);
}
for (const action of ["编辑项目 ${item.name}", "删除项目 ${item.name}"]) {
  if (!manager.includes(action)) failures.push(`project list missing ${action}`);
}
if (manager.includes("任务") || manager.includes("缺陷") || manager.includes("产品线小组")) failures.push("project ledger exposes cross-module associations");
if (manager.includes("const Field =")) failures.push("project form recreates input component during render and will lose focus");
if (!manager.includes("function FormField(")) failures.push("project form is missing a stable input component");
if (!manager.includes("warrantyExpired") || !manager.includes("质保已过期")) failures.push("project list is missing expired warranty highlighting");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Project ledger checks passed.");
