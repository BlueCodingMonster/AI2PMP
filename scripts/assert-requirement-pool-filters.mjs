import { readFileSync } from "node:fs";

const page = readFileSync("src/app/(dashboard)/requirements/page.tsx", "utf8");
const actions = readFileSync("src/actions/requirements.ts", "utf8");
const failures = [];

const expectIncludes = (source, expected, message) => {
  if (!source.includes(expected)) failures.push(message);
};
const expectExcludes = (source, expected, message) => {
  if (source.includes(expected)) failures.push(message);
};

expectIncludes(page, 'name="filtered" value="1"', "筛选表单缺少显式筛选标识");
expectIncludes(page, "params.status !== undefined", "已有 URL 筛选条件未被识别");
expectIncludes(page, 'name="productLineTeamId"', "缺少产品线多选字段");
expectIncludes(page, 'type="checkbox" name="status"', "状态筛选未使用多选复选框");
expectExcludes(page, '<option value="">全部状态</option>', "状态筛选仍保留全部状态单选项");
expectIncludes(page, "productLineMemberships", "未获取当前登录人的产品线小组");
expectIncludes(page, "RequirementStatus.COMPLETED", "缺少默认排除已完成状态的逻辑");
for (const field of ['name="dateType"', 'name="dateFrom"', 'name="dateTo"']) {
  expectIncludes(page, field, `缺少日期范围筛选字段 ${field}`);
}
for (const dateType of ["proposedAt", "createdAt", "reviewedAt"]) {
  expectIncludes(page, dateType, `缺少时间维度 ${dateType}`);
}
expectIncludes(page, "firstDayOfCurrentMonth", "缺少当前月首日默认值");
expectIncludes(page, 'name="source"', "缺少需求来源筛选");
expectIncludes(page, 'name="pageSize"', "缺少每页条数选择");
for (const action of ["首页", "上一页", "下一页", "末页"]) {
  expectIncludes(page, action, `分页缺少${action}操作`);
}
expectIncludes(actions, "statuses?: RequirementStatus[]", "服务端查询未支持多状态");
expectIncludes(actions, "productLineTeamIds?: string[]", "服务端查询未支持多产品线");
expectIncludes(actions, "source?: RequirementSource", "服务端查询未支持需求来源");
expectIncludes(actions, 'dateType?: "proposedAt" | "createdAt" | "reviewedAt"', "服务端查询未支持三种时间维度");
expectIncludes(actions, "where[dateType]", "服务端未按所选时间维度过滤");
expectIncludes(actions, "createdBy: { is: { name:", "关键字搜索未包含创建人");
expectIncludes(actions, "prisma.requirement.count", "服务端分页未查询总数");
expectIncludes(actions, "skip: (page - 1) * pageSize", "服务端分页缺少 skip");
expectIncludes(actions, "take: pageSize", "服务端分页缺少 take");

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("需求池多选与时间筛选契约检查通过");
