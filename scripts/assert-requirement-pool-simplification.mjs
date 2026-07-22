import { existsSync, readFileSync } from "node:fs";

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

const files = {
  schema: read("prisma/schema.prisma"),
  validation: read("src/lib/validations/requirements.ts"),
  actions: read("src/actions/requirements.ts"),
  form: read("src/components/requirements/requirement-form.tsx"),
  list: read("src/app/(dashboard)/requirements/page.tsx"),
  detail: read("src/app/(dashboard)/requirements/[requirementId]/page.tsx"),
  newPage: read("src/app/(dashboard)/requirements/new/page.tsx"),
  presentation: read("src/lib/requirements/presentation.ts"),
  requirementComments: read("src/components/requirements/requirement-comments.tsx"),
  rowActions: read("src/components/requirements/requirement-row-actions.tsx"),
};
const requirementModel = files.schema.match(/model Requirement \{[\s\S]*?\n\}/)?.[0] ?? "";
const commentModel = files.schema.match(/model Comment \{[\s\S]*?\n\}/)?.[0] ?? "";

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
expectIncludes(requirementModel, "summary", "Requirement 缺少需求内容简述字段 summary");
for (const removed of ["businessValue", "complexity", "estimatedDays", "acceptanceCriteria", "assigneeId", "projectId", "description", "type"]) {
  expectExcludes(requirementModel, removed, `Requirement 仍包含已删除字段 ${removed}`);
}
expectExcludes(files.schema, "enum RequirementType", "Schema 仍包含已删除需求枚举 RequirementType");
expectIncludes(files.validation, "状态为已评审时必须选择评审通过时间", "缺少已评审日期校验");
expectIncludes(files.validation, "createdAt", "校验层缺少必填创建时间 createdAt");
expectIncludes(files.actions, "sequenceNo", "查询未返回需求流水号");
expectIncludes(files.actions, "reviewedAt", "动作未读写评审通过时间");
expectIncludes(files.actions, "summary: data.summary", "动作未读写需求内容简述");
if ((files.actions.match(/createdAt: new Date\(data\.createdAt\)/g) ?? []).length < 2) {
  failures.push("创建和更新动作必须显式保存创建时间");
}
expectIncludes(files.actions, 'revalidatePath("/requirements")', "动作未刷新需求池列表");
expectIncludes(files.presentation, "XQ", "缺少 XQ 编号格式化");
expectIncludes(files.list, "colSpan={12}", "需求池空状态列数必须为 12");
expectIncludes(files.list, "RequirementRowActions", "需求池操作列未使用直接操作组件");
for (const action of ["查看", "编辑", "删除"]) {
  expectIncludes(files.rowActions, action, `需求池操作列缺少${action}功能`);
}
expectIncludes(files.rowActions, "deleteRequirement", "需求池删除按钮未调用删除动作");
expectIncludes(files.rowActions, "window.confirm", "需求池删除操作缺少二次确认");
expectIncludes(files.form, 'type="datetime-local"', "表单缺少可编辑的日期时间控件");
expectIncludes(files.form, "summary", "表单缺少需求内容简述");
expectIncludes(files.detail, "summary", "详情页未展示需求内容简述");
expectIncludes(files.form, 'mode?: "create" | "edit" | "view"', "需求表单缺少新增、编辑、查看模式");
expectIncludes(files.detail, '<RequirementForm', "需求查看页未复用统一需求表单");
expectIncludes(files.detail, 'mode="view"', "需求查看页未使用只读表单模式");
expectExcludes(files.detail, "RequirementComments", "需求查看页不应显示讨论与备注");
expectExcludes(files.actions, "addRequirementComment", "需求动作中不应保留新增评论功能");
expectExcludes(requirementModel, "comments", "Requirement 不应保留评论关系");
expectExcludes(commentModel, "requirementId", "Comment 不应保留 requirementId 字段");
expectExcludes(commentModel, "requirement Requirement?", "Comment 不应保留需求关系");
if (files.requirementComments) failures.push("需求评论组件文件仍然存在");
expectIncludes(commentModel, "taskId    String?", "不得删除任务评论字段");
expectIncludes(commentModel, "bugId     String?", "不得删除缺陷评论字段");
expectIncludes(files.newPage, "productLineMemberships", "新建页未查询当前用户的固定产品线小组");
expectIncludes(files.newPage, "length === 1", "新建页未限定只有一个小组时才设置默认值");
expectIncludes(files.newPage, "defaultProductLineTeamId", "新建页未向表单传入默认产品线");
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
