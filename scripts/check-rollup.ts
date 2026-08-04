import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const level1Tasks = await prisma.managedTask.findMany({
    where: { level: 1 },
    include: { children: true },
    take: 10,
  });

  for (const p of level1Tasks) {
    const startStr = p.planStartDate ? p.planStartDate.toISOString().slice(0, 10) : "无";
    const endStr = p.planEndDate ? p.planEndDate.toISOString().slice(0, 10) : "无";
    console.log(`Parent: [${p.title}] | Start: ${startStr} | End: ${endStr} | 子任务数: ${p.children.length}`);
    p.children.slice(0, 3).forEach((c) => {
      const cStart = c.planStartDate ? c.planStartDate.toISOString().slice(0, 10) : "无";
      const cEnd = c.planEndDate ? c.planEndDate.toISOString().slice(0, 10) : "无";
      console.log(`   Child: [${c.title}] | Start: ${cStart} | End: ${cEnd}`);
    });
  }
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
