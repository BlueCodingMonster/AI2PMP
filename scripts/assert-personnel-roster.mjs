import { existsSync, readFileSync } from "node:fs";

const read = (path) => existsSync(path) ? readFileSync(path, "utf8") : "";
const schema = read("prisma/schema.prisma");
const validation = read("src/lib/validations/team.ts");
const actions = read("src/actions/team.ts");
const modal = read("src/components/team/member-modal.tsx");
const list = read("src/components/team/team-client.tsx");
const importer = read("scripts/import-personnel-roster.ts");
const rosterPath = "scripts/personnel-roster.json";
const failures = [];
const includes = (source, expected, message) => { if (!source.includes(expected)) failures.push(message); };

const userModel = schema.match(/model User \{[\s\S]*?\n\}/)?.[0] ?? "";
for (const field of ["level", "position"]) {
  includes(userModel, `${field} `, `User 缺少 ${field} 字段`);
  includes(validation, `${field}:`, `团队校验缺少 ${field}`);
  includes(actions, `${field}:`, `团队动作缺少 ${field}`);
  includes(modal, field, `成员表单缺少 ${field}`);
  includes(list, `member.${field}`, `成员列表缺少 ${field}`);
}
includes(importer, "prisma.$transaction", "导入脚本必须使用数据库事务");
includes(importer, 'bcrypt.hash("123456"', "导入脚本未设置统一初始密码");

if (!existsSync(rosterPath)) {
  failures.push("缺少人员导入清单 scripts/personnel-roster.json");
} else {
  const roster = JSON.parse(read(rosterPath));
  if (roster.length !== 50) failures.push(`人员清单应为50人，当前${roster.length}人`);
  if (new Set(roster.map((item) => item.username)).size !== roster.length) failures.push("人员登录名不唯一");
  const departments = Object.fromEntries([...new Set(roster.map((item) => item.department))].map((department) => [department, roster.filter((item) => item.department === department).length]));
  for (const [department, count] of [["仪表平台研发部", 32], ["产品规划部", 11], ["测试部", 6]]) {
    if (departments[department] !== count) failures.push(`${department}应为${count}人`);
  }
  if (departments["产品部"] !== 1) failures.push("产品部应为1人");
  if (roster.filter((item) => item.level === "部门经理").length !== 3) failures.push("部门经理应为3人");
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log("人员清单导入契约检查通过");
