import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true },
  });

  const teams = await prisma.productLineTeam.findMany({
    select: {
      id: true,
      name: true,
      members: { select: { userId: true, user: { select: { name: true } } } },
    },
  });

  console.log("=== 数据库全部活跃用户 (Count:", users.length, ") ===");
  users.forEach((u) => console.log(` - ID: ${u.id}, 姓名: ${u.name}`));

  console.log("\n=== 数据库全部产品线团队 ===");
  teams.forEach((t) => {
    console.log(`团队: ${t.name} (ID: ${t.id}) 包含成员 Count: ${t.members.length}:`);
    t.members.forEach((m) => console.log(`   * ${m.user?.name} (userId: ${m.userId})`));
  });
}

check().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
