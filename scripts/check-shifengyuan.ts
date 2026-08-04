import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const user = await prisma.user.findFirst({ where: { name: { contains: '石丰源' } } });
  console.log('User 石丰源:', user);

  if (!user) {
    console.log('用户 石丰源 未找到！');
    return;
  }

  const executorTasks = await prisma.managedTask.findMany({
    where: { executorId: user.id },
    include: { productLineTeam: true },
  });

  console.log(`\n=== 以石丰源为第一负责人的任务 (共 ${executorTasks.length} 条) ===`);
  executorTasks.forEach((t) => {
    console.log(`- [${t.productLineTeam.name}] ${t.title} | Notes: ${t.notes}`);
  });

  const notesTasks = await prisma.managedTask.findMany({
    where: { notes: { contains: '石丰源' } },
    include: { productLineTeam: true, executor: true },
  });

  console.log(`\n=== 包含石丰源的所有任务 (共 ${notesTasks.length} 条) ===`);
  notesTasks.forEach((t) => {
    console.log(`- [${t.productLineTeam.name}] ${t.title} | 负责人: ${t.executor?.name || '未分配'} | Notes: ${t.notes}`);
  });
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
