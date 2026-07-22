import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const tasks = await prisma.managedTask.findMany({
    select: { id: true, title: true, level: true, parentId: true, planStartDate: true, planEndDate: true, status: true },
    orderBy: [{ sequenceNo: "asc" }],
  });
  tasks.forEach((t) =>
    console.log(
      JSON.stringify({
        id: t.id.slice(0, 8),
        title: t.title,
        level: t.level,
        parentId: t.parentId ? t.parentId.slice(0, 8) : null,
        start: t.planStartDate ? t.planStartDate.toISOString().slice(0, 10) : null,
        end: t.planEndDate ? t.planEndDate.toISOString().slice(0, 10) : null,
        status: t.status,
      })
    )
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
