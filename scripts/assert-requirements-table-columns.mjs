import { readFileSync } from "node:fs";

const source = readFileSync("src/app/(dashboard)/requirements/page.tsx", "utf8");

const headerMatches = [...source.matchAll(/<th[^>]*>([^<]+)<\/th>/g)];
const headers = headerMatches.map((match) => match[1].trim());

const expectedHeaders = [
  "需求编号",
  "需求名称",
  "归属产品线",
  "优先级",
  "需求来源",
  "客户名称或需求方",
  "提出时间",
  "创建时间",
  "创建人",
  "需求状态",
  "评审通过时间",
  "操作",
];

if (JSON.stringify(headers) !== JSON.stringify(expectedHeaders)) {
  console.error("需求池表格表头顺序不正确。");
  console.error("实际:", headers.join(" | "));
  console.error("期望:", expectedHeaders.join(" | "));
  process.exit(1);
}
