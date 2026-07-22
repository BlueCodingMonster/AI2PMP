import { readFileSync } from "node:fs";

const groups = JSON.parse(readFileSync("scripts/product-line-groups.json", "utf8"));
const importer = readFileSync("scripts/import-product-line-groups.ts", "utf8");
const failures = [];

if (groups.length !== 6) failures.push("必须配置6个产品线小组");
if (new Set(groups.map((group) => group.name)).size !== 6) failures.push("产品线小组名称必须唯一");
if (new Set(groups.map((group) => group.leader)).size !== 6) failures.push("6个小组必须分别配置组长");
if (groups.reduce((sum, group) => sum + group.members.length + 1, 0) !== 44) failures.push("成员归属总数必须为44条");
if (groups.reduce((sum, group) => sum + group.productLines.length, 0) !== 17) failures.push("覆盖产品线总数必须为17条");
if (!importer.includes("ProductLineRole.LEADER")) failures.push("导入脚本必须把组长设为LEADER");
if (importer.includes("tx.product.")) failures.push("产品线小组导入脚本不得维护全局产品目录");
if (!importer.includes("尚未进入系统人员清单")) failures.push("导入前必须校验人员是否存在");

if (failures.length) {
  console.error("产品线小组配置校验失败：");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("产品线小组配置校验通过。");
