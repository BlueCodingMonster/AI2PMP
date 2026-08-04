import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function clearManagedTasks() {
  console.log("开始清理任务管理数据...");

  const result = await prisma.$transaction(async (tx) => {
    // 1. 删除所有任务状态变更日志
    const deletedLogs = await tx.managedTaskStatusLog.deleteMany({});
    console.log(`已清理任务状态变更日志: ${deletedLogs.count} 条`);

    // 2. 删除所有任务数据
    const deletedTasks = await tx.managedTask.deleteMany({});
    console.log(`已清理管理任务: ${deletedTasks.count} 条`);

    return { logsCount: deletedLogs.count, tasksCount: deletedTasks.count };
  });

  console.log("任务管理数据清理完毕！", result);
}

clearManagedTasks()
  .catch((err) => {
    console.error("清理任务管理数据时出错:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
