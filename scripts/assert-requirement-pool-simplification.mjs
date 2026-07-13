import { existsSync, readFileSync } from "node:fs";

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

const files = {
  schema: read("prisma/schema.prisma"),
  validation: read("src/lib/validations/requirements.ts"),
  actions: read("src/actions/requirements.ts"),
  form: read("src/components/requirements/requirement-form.tsx"),
  list: read("src/app/(dashboard)/requirements/page.tsx"),
  detail: read("src/app/(dashboard)/requirements/[requirementId]/page.tsx"),
  presentation: read("src/lib/requirements/presentation.ts"),
};
const requirementModel = files.schema.match(/model Requirement \{[\s\S]*?\n\}/)?.[0] ?? "";

const failures = [];
const expectIncludes = (source, expected, message) => {
  if (!source.includes(expected)) failures.push(message);
};
const expectExcludes = (source, expected, message) => {
  if (source.includes(expected)) failures.push(message);
};

for (const status of ["PENDING_REVIEW", "UNDER_REVIEW", "REVIEWED", "REJECTED", "SCHEDULED", "COMPLETED"]) {
  expectIncludes(files.schema, status, `缺少需求状态 ${status}`);
}
for (const source of ["PRODUCT_PLANNING", "CUSTOMER_FEEDBACK", "INTERNAL_REQUEST", "MARKET_REQUEST"]) {
  expectIncludes(files.schema, source, `缺少需求来源 ${source}`);
}
for (const field of ["sequenceNo", "reviewedAt", "productLineTeamId", "proposer", "proposedAt", "createdById", "createdAt"]) {
  expectIncludes(requirementModel, field, `Requirement 缺少字段 ${field}`);
}
for (const removed of ["businessValue", "complexity", "estimatedDays", "acceptanceCriteria", "assigneeId", "projectId", "description", "type"]) {
  expectExcludes(requirementModel, removed, `Requirement 仍包含已删除字段 ${removed}`);
}
expectExcludes(files.schema, "enum RequirementType", "Schema 仍包含已删除需求枚举 RequirementType");
expectIncludes(files.validation, "状态为已评审时必须选择评审通过时间", "缺少已评审日期校验");
expectIncludes(files.actions, "sequenceNo", "查询未返回需求流水号");
expectIncludes(files.actions, "reviewedAt", "动作未读写评审通过时间");
expectIncludes(files.actions, 'revalidatePath("/requirements")', "动作未刷新需求池列表");
expectIncludes(files.presentation, "XQ", "缺少 XQ 编号格式化");
expectIncludes(files.list, "colSpan={12}", "需求池空状态列数必须为 12");
for (const removed of ["businessValue", "complexity", "estimatedDays", "acceptanceCriteria", "assigneeId", "projectId", "RequirementType"]) {
  expectExcludes(files.form, removed, `表单仍包含旧字段 ${removed}`);
  expectExcludes(files.list, removed, `列表仍包含旧字段 ${removed}`);
  expectExcludes(files.detail, removed, `详情仍包含旧字段 ${removed}`);
}

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log("需求池精简契约检查通过");
