import { PrismaClient, ManagedTaskStatus } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function deleteSubtree(taskId: string) {
  const children = await prisma.managedTask.findMany({
    where: { parentId: taskId },
    select: { id: true },
  });
  for (const child of children) {
    await deleteSubtree(child.id);
  }
  await prisma.managedTaskStatusLog.deleteMany({
    where: { taskId },
  });
  await prisma.managedTask.delete({
    where: { id: taskId },
  });
}

async function main() {
  console.log("=== 正在测试物理删除带进度/在办/已完成的任务 ===");

  const user = await prisma.user.findFirst();
  const team = await prisma.productLineTeam.findFirst();

  if (!user || !team) throw new Error("缺少测试用户或团队");

  // 创建一个带进度的父任务和子任务
  const parent = await prisma.managedTask.create({
    data: {
      title: "【测试删除】父级任务",
      level: 1,
      productLineTeamId: team.id,
      createdById: user.id,
      status: ManagedTaskStatus.IN_PROGRESS,
      progressPercent: 50,
      actualStartAt: new Date("2026-07-01"),
    },
  });

  const child = await prisma.managedTask.create({
    data: {
      title: "【测试删除】子级任务",
      level: 2,
      parentId: parent.id,
      productLineTeamId: team.id,
      createdById: user.id,
      status: ManagedTaskStatus.DONE,
      progressPercent: 100,
      actualStartAt: new Date("2026-07-01"),
      actualFinishAt: new Date("2026-07-05"),
    },
  });

  console.log(`成功创建测试父任务: ${parent.id}, 测试子任务: ${child.id}`);

  // 执行彻底物理删除 deleteSubtree
  await deleteSubtree(parent.id);

  // 校验数据库
  const checkParent = await prisma.managedTask.findUnique({ where: { id: parent.id } });
  const checkChild = await prisma.managedTask.findUnique({ where: { id: child.id } });

  console.log("父任务在数据库中是否存在:", checkParent !== null ? "存在(异常)" : "不存在(正确已被物理删除)");
  console.log("子任务在数据库中是否存在:", checkChild !== null ? "存在(异常)" : "不存在(正确已被物理删除)");

  if (!checkParent && !checkChild) {
    console.log("✅ 物理彻底删除测试 100% 通过！");
  } else {
    console.error("❌ 物理删除测试失败！");
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
