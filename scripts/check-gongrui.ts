import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const usersWithGong = await prisma.user.findMany({
    where: { name: { contains: "巩" } },
  });
  console.log("=== 数据库中姓氏为【巩】的用户 ===");
  console.log(usersWithGong);

  const ruiUser = await prisma.user.findFirst({ where: { name: { contains: "巩蕊" } } });
  const miaoUser = await prisma.user.findFirst({ where: { name: { contains: "巩淼" } } });

  if (ruiUser) {
    const ruiTasks = await prisma.managedTask.findMany({
      where: { executorId: ruiUser.id },
      include: { productLineTeam: true },
    });
    console.log(`\n=== 巩蕊 的主负责人任务 (共 ${ruiTasks.length} 条) ===`);
    ruiTasks.forEach((t) => console.log(`- [${t.productLineTeam.name}] ${t.title}`));
  } else {
    console.log("\n⚠️ 数据库中没有找到名为【巩蕊】的用户！");
  }

  if (miaoUser) {
    const miaoTasks = await prisma.managedTask.findMany({
      where: { executorId: miaoUser.id },
      include: { productLineTeam: true },
    });
    console.log(`\n=== 巩淼 的主负责人任务 (共 ${miaoTasks.length} 条) ===`);
    miaoTasks.forEach((t) => console.log(`- [${t.productLineTeam.name}] ${t.title}`));
  }
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
