import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient, ProductLineRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

type Group = {
  name: string;
  leader: string;
  members: string[];
  positioning: string;
  productLines: string[];
};

const groups = JSON.parse(
  readFileSync(new URL("./product-line-groups.json", import.meta.url), "utf8"),
) as Group[];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function roleFor(position: string | null): ProductLineRole {
  if (position === "产品经理") return ProductLineRole.PM;
  if (position === "前端开发") return ProductLineRole.FRONTEND;
  if (position === "测试经理" || position === "测试专员") return ProductLineRole.TESTER;
  return ProductLineRole.BACKEND;
}

async function main() {
  const names = [...new Set(groups.flatMap((group) => [group.leader, ...group.members]))];
  const users = await prisma.user.findMany({
    where: { name: { in: names }, isActive: true },
    select: { id: true, name: true, position: true },
  });
  const userByName = new Map(users.map((user) => [user.name, user]));
  const missing = names.filter((name) => !userByName.has(name));
  if (missing.length) console.warn(`以下成员尚未进入系统人员清单，本次保留配置但跳过成员关系：${missing.join("、")}`);

  await prisma.$transaction(async (tx) => {
    for (const group of groups) {
      const team = await tx.productLineTeam.upsert({
        where: { name: group.name },
        update: { description: group.positioning },
        create: { name: group.name, description: group.positioning },
      });

      await tx.productLineMember.deleteMany({ where: { teamId: team.id } });
      await tx.productLineMember.createMany({
        data: [group.leader, ...group.members].filter((name) => userByName.has(name)).map((name) => {
          const user = userByName.get(name)!;
          return {
            teamId: team.id,
            userId: user.id,
            role: name === group.leader ? ProductLineRole.LEADER : roleFor(user.position),
          };
        }),
      });

    }
  });

  const importedMemberships = groups.reduce(
    (sum, group) => sum + [group.leader, ...group.members].filter((name) => userByName.has(name)).length,
    0,
  );
  console.log(`产品线小组导入完成：${groups.length}个小组，${importedMemberships}条可用成员归属，${missing.length}名待补人员`);
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
