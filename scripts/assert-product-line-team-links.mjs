import fs from "node:fs";

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const actions = fs.readFileSync("src/actions/product-lines.ts", "utf8");
const client = fs.readFileSync("src/components/product-lines/team-details-client.tsx", "utf8");
const page = fs.readFileSync("src/app/(dashboard)/product-lines/[teamId]/page.tsx", "utf8");
const failures = [];

if (!schema.includes('@relation("ProductLineTeamProducts")')) failures.push("product-team many-to-many relation missing");
if (!actions.includes("export async function setProductTeamLink")) failures.push("product-team link action missing");
for (const action of ["linkProductsToTeam", "linkProjectsToTeam"]) {
  if (!actions.includes(`export async function ${action}`)) failures.push(`batch action missing ${action}`);
}
if (!page.includes("allProducts={allProducts}")) failures.push("product options are not passed to team details");
for (const label of ["关联产品线", "关联项目", "选择产品线", "取消产品线关联"]) {
  if (!client.includes(label)) failures.push(`team details missing ${label}`);
}
for (const pattern of ["linkProductIds", "linkProjectIds", "type=\"checkbox\"", "可多选"]) {
  if (!client.includes(pattern)) failures.push(`multi-select UI missing ${pattern}`);
}
if (client.indexOf("关联产品线 ({team.products.length})") > client.indexOf("关联项目 ({team.projects.length})")) {
  failures.push("associated products must appear above associated projects");
}
if (client.includes("关联研发项目")) failures.push("legacy associated R&D project label remains");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Product-line team association checks passed.");
