import { readFileSync } from "node:fs";

const source = readFileSync("src/app/(dashboard)/requirements/page.tsx", "utf8");

const headerMatches = [...source.matchAll(/<th[^>]*>([^<]+)<\/th>/g)];
const headers = headerMatches.map((match) => match[1].trim());

const expectedHeaders = [
  "需求标题",
  "状态",
  "类型",
  "来源",
  "优先级",
  "价值/复杂度",
  "产品线",
  "提出方",
  "负责人",
  "创建时间",
  "操作",
];

if (JSON.stringify(headers) !== JSON.stringify(expectedHeaders)) {
  console.error("需求池表格表头顺序不正确。");
  console.error("实际:", headers.join(" | "));
  console.error("期望:", expectedHeaders.join(" | "));
  process.exit(1);
}
