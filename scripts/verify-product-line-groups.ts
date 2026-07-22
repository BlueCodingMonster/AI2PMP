import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const expectedNames = ["能源管理建设组", "数字化建设组", "制造业产品组", "智能设备组", "AI与数据资产组", "平台建设组"];
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
const teams = await prisma.productLineTeam.findMany({
  where: { name: { in: expectedNames } },
  orderBy: { name: "asc" },
  include: {
    members: { include: { user: { select: { name: true } } } },
  },
});

if (teams.length !== 6) throw new Error(`数据库中应有6个目标小组，实际${teams.length}个`);
if (teams.some((team) => !team.members.some((member) => member.role === "LEADER"))) throw new Error("存在未配置组长的小组");
if (teams.reduce((sum, team) => sum + team.members.length, 0) !== 44) throw new Error("成员归属数不是44条");

console.log(JSON.stringify(teams.map((team) => ({
  name: team.name,
  leader: team.members.find((member) => member.role === "LEADER")?.user.name,
  members: team.members.length,
})), null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
