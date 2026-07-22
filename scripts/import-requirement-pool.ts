import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  Priority,
  RequirementSource,
  RequirementStatus,
} from "@prisma/client";
import { Pool } from "pg";

type SourceRow = {
  需求编号: string | null;
  需求名称: string | null;
  归属产品线: string | null;
  优先级: string | null;
  需求来源: string | null;
  客户名称或需求方: string | null;
  提出时间: string | null;
  创建人: string | null;
  需求状态: string | null;
  评审通过时间: string | null;
};

const statusMap: Record<string, RequirementStatus> = {
  待评审: RequirementStatus.PENDING_REVIEW,
  评审中: RequirementStatus.UNDER_REVIEW,
  已评审: RequirementStatus.REVIEWED,
  已驳回: RequirementStatus.REJECTED,
  已排期: RequirementStatus.SCHEDULED,
  已完成: RequirementStatus.COMPLETED,
};

const sourceMap: Record<string, RequirementSource> = {
  产品规划: RequirementSource.PRODUCT_PLANNING,
  客户反馈: RequirementSource.CUSTOMER_FEEDBACK,
  公司内部需求: RequirementSource.INTERNAL_REQUEST,
  市场需求: RequirementSource.MARKET_REQUEST,
};

const priorityMap: Record<string, Priority> = {
  紧急: Priority.URGENT,
  高: Priority.HIGH,
  中: Priority.MEDIUM,
  低: Priority.LOW,
};

const productLineAliases: Record<string, string> = {
  制造建设组: "制造业产品组",
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const shouldWrite = process.argv.includes("--write");

function required(value: string | null, field: string, rowNumber: number) {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`第 ${rowNumber} 行“${field}”为空`);
  return normalized;
}

function parseDate(value: string | null) {
  if (!value?.trim()) return null;
  const parsed = new Date(`${value.trim()}T00:00:00+08:00`);
  if (Number.isNaN(parsed.getTime())) throw new Error(`无法识别日期：${value}`);
  return parsed;
}

function sourceKey(row: SourceRow) {
  const code = row.需求编号?.trim();
  return code ? `code:${code}` : `title:${required(row.需求名称, "需求名称", 0)}`;
}

async function main() {
  const sourcePath = path.join(process.cwd(), "scripts", "requirement-pool.json");
  const rows = JSON.parse(await fs.readFile(sourcePath, "utf8")) as SourceRow[];
  const [teams, users, existingRequirements] = await Promise.all([
    prisma.productLineTeam.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.requirement.findMany({ select: { id: true, title: true, summary: true } }),
  ]);

  const teamByName = new Map(teams.map((team) => [team.name, team]));
  const userByName = new Map(users.map((user) => [user.name, user]));
  const existingByKey = new Map<string, (typeof existingRequirements)[number]>();
  for (const item of existingRequirements) {
    const code = item.summary?.match(/原需求编号：([^\n]+)/)?.[1]?.trim();
    existingByKey.set(code && code !== "未提供" ? `code:${code}` : `title:${item.title}`, item);
  }

  const seen = new Set<string>();
  const prepared = rows.map((row, index) => {
    const rowNumber = index + 2;
    const title = required(row.需求名称, "需求名称", rowNumber);
    const creatorName = required(row.创建人, "创建人", rowNumber);
    const statusLabel = required(row.需求状态, "需求状态", rowNumber);
    const sourceLabel = required(row.需求来源, "需求来源", rowNumber);
    const priorityLabel = required(row.优先级, "优先级", rowNumber);
    const fullProductLines = required(row.归属产品线, "归属产品线", rowNumber);
    const primarySourceTeam = fullProductLines.split(/[,，]/)[0].trim();
    const primaryTeamName = productLineAliases[primarySourceTeam] ?? primarySourceTeam;
    const creator = userByName.get(creatorName);
    const team = teamByName.get(primaryTeamName);
    const status = statusMap[statusLabel];
    const source = sourceMap[sourceLabel];
    const priority = priorityMap[priorityLabel];
    const key = sourceKey(row);

    if (seen.has(key)) throw new Error(`第 ${rowNumber} 行存在重复导入标识：${key}`);
    seen.add(key);
    if (!creator) throw new Error(`第 ${rowNumber} 行未找到有效创建人：${creatorName}`);
    if (!team) throw new Error(`第 ${rowNumber} 行未找到产品线小组：${primaryTeamName}`);
    if (!status) throw new Error(`第 ${rowNumber} 行状态无法映射：${statusLabel}`);
    if (!source) throw new Error(`第 ${rowNumber} 行来源无法映射：${sourceLabel}`);
    if (!priority) throw new Error(`第 ${rowNumber} 行优先级无法映射：${priorityLabel}`);
    if (title.length > 100) throw new Error(`第 ${rowNumber} 行需求名称超过 100 个字符`);

    const originalCode = row.需求编号?.trim() || "未提供";
    const summaryLines = ["导入来源：doc/需求池.xlsx", `原需求编号：${originalCode}`];
    if (fullProductLines.split(/[,，]/).length > 1) {
      summaryLines.push(`完整归属产品线：${fullProductLines}`);
    }

    return {
      key,
      data: {
        title,
        summary: summaryLines.join("\n"),
        status,
        source,
        priority,
        productLineTeamId: team.id,
        proposer: row.客户名称或需求方?.trim() || null,
        proposedAt: parseDate(row.提出时间),
        reviewedAt: parseDate(row.评审通过时间),
        createdById: creator.id,
      },
    };
  });

  const createCount = prepared.filter((item) => !existingByKey.has(item.key)).length;
  const updateCount = prepared.length - createCount;
  const multiProductLineCount = rows.filter((row) => (row.归属产品线 ?? "").split(/[,，]/).length > 1).length;

  if (!shouldWrite) {
    console.log(JSON.stringify({ mode: "dry-run", total: prepared.length, createCount, updateCount, multiProductLineCount }, null, 2));
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const item of prepared) {
      const existing = existingByKey.get(item.key);
      if (existing) {
        await tx.requirement.update({ where: { id: existing.id }, data: item.data });
      } else {
        await tx.requirement.create({ data: item.data });
      }
    }
  });

  console.log(JSON.stringify({ mode: "write", total: prepared.length, createCount, updateCount, multiProductLineCount }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
