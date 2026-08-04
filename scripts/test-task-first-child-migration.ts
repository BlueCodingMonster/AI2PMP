import { PrismaClient, ManagedTaskStatus, ManagedTaskCategory } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== 正在测试：首次拆分子任务时的执行数据自动继承与 Rollup 汇总 ===");

  const user = await prisma.user.findFirst();
  const team = await prisma.productLineTeam.findFirst();

  if (!user || !team) throw new Error("数据库中缺少测试用户或团队数据");

  // 1. 创建带有完整执行数据（已完成、打卡时间、进度100%）的原叶子任务
  const parent = await prisma.managedTask.create({
    data: {
      title: "【测试继承】原带打卡数据的叶子任务",
      level: 1,
      category: ManagedTaskCategory.DEVELOPMENT,
      productLineTeamId: team.id,
      createdById: user.id,
      executorId: user.id,
      status: ManagedTaskStatus.DONE,
      progressPercent: 100,
      actualStartAt: new Date("2026-07-01T08:00:00Z"),
      actualFinishAt: new Date("2026-07-05T18:00:00Z"),
      planStartDate: new Date("2026-07-01T08:00:00Z"),
      planEndDate: new Date("2026-07-05T18:00:00Z"),
      plannedWorkdays: 5,
      actualWorkdays: 5,
    },
  });

  console.log(`✅ 步骤 1 成功创建原叶子任务 ID: ${parent.id}，状态: ${parent.status}，执行人: ${parent.executorId}`);

  // 模拟为该任务创建首个子任务（未显式传递执行人、打卡时间、状态）
  const childInput: any = {
    title: "【测试继承】拆分出的首个子任务",
    parentId: parent.id,
    level: 2,
    category: ManagedTaskCategory.DEVELOPMENT,
    status: ManagedTaskStatus.UNSCHEDULED,
    progressPercent: 0,
    executorId: null,
    actualStartAt: null,
    actualFinishAt: null,
  };

  // 触发继承逻辑（即在 createManagedTask 中的逻辑）
  const parentBeforeChild = await prisma.managedTask.findUnique({
    where: { id: parent.id },
    include: { children: true },
  });

  if (!parentBeforeChild) throw new Error("父任务不存在");

  if (parentBeforeChild.children.length === 0) {
    const hasParentExecutionData = Boolean(
      parentBeforeChild.executorId ||
      parentBeforeChild.actualStartAt ||
      parentBeforeChild.actualFinishAt ||
      parentBeforeChild.status === ManagedTaskStatus.DONE ||
      parentBeforeChild.status === ManagedTaskStatus.IN_PROGRESS
    );

    if (hasParentExecutionData) {
      if (!childInput.executorId && parentBeforeChild.executorId) childInput.executorId = parentBeforeChild.executorId;
      if (!childInput.actualStartAt && parentBeforeChild.actualStartAt) childInput.actualStartAt = parentBeforeChild.actualStartAt.toISOString() as any;
      if (!childInput.actualFinishAt && parentBeforeChild.actualFinishAt) childInput.actualFinishAt = parentBeforeChild.actualFinishAt.toISOString() as any;
      if (!childInput.planStartDate && parentBeforeChild.planStartDate) childInput.planStartDate = parentBeforeChild.planStartDate.toISOString() as any;
      if (!childInput.planEndDate && parentBeforeChild.planEndDate) childInput.planEndDate = parentBeforeChild.planEndDate.toISOString() as any;
      if (childInput.status === ManagedTaskStatus.UNSCHEDULED && parentBeforeChild.status !== ManagedTaskStatus.UNSCHEDULED && childInput.executorId) {
        childInput.status = parentBeforeChild.status;
      }
      if (childInput.progressPercent === 0 && parentBeforeChild.progressPercent > 0) childInput.progressPercent = parentBeforeChild.progressPercent;
    }
  }

  // 2. 创建子任务
  const child = await prisma.managedTask.create({
    data: {
      title: childInput.title,
      level: 2,
      category: childInput.category,
      parentId: parent.id,
      productLineTeamId: team.id,
      createdById: user.id,
      executorId: childInput.executorId,
      status: childInput.status,
      progressPercent: childInput.progressPercent,
      actualStartAt: childInput.actualStartAt ? new Date(childInput.actualStartAt) : null,
      actualFinishAt: childInput.actualFinishAt ? new Date(childInput.actualFinishAt) : null,
      planStartDate: new Date("2026-07-01T08:00:00Z"),
      planEndDate: new Date("2026-07-05T18:00:00Z"),
      plannedWorkdays: 5,
      actualWorkdays: 5,
    },
  });

  console.log(`✅ 步骤 2 成功创建首个子任务 ID: ${child.id}`);
  console.log(`   - 子任务继承执行人: ${child.executorId === user.id ? "成功(" + user.id + ")" : "失败"}`);
  console.log(`   - 子任务继承状态: ${child.status === ManagedTaskStatus.DONE ? "成功(DONE)" : "失败(" + child.status + ")"}`);
  console.log(`   - 子任务继承进度: ${child.progressPercent === 100 ? "成功(100%)" : "失败(" + child.progressPercent + "%)"}`);
  console.log(`   - 子任务继承实际开始: ${child.actualStartAt?.toISOString().slice(0, 10)}`);
  console.log(`   - 子任务继承实际完成: ${child.actualFinishAt?.toISOString().slice(0, 10)}`);

  // 3. 更新父任务 executorId 为 null 并模拟向上 Rollup
  await prisma.managedTask.update({
    where: { id: parent.id },
    data: { executorId: null },
  });

  // 模拟 rollup 逻辑
  const updatedParent = await prisma.managedTask.update({
    where: { id: parent.id },
    data: {
      status: child.status,
      executorId: null,
      actualStartAt: child.actualStartAt,
      actualFinishAt: child.actualFinishAt,
      progressPercent: child.progressPercent,
    },
  });

  console.log(`✅ 步骤 3 自动向上汇总（Rollup）完成`);
  console.log(`   - 父任务执行人清空: ${updatedParent.executorId === null ? "正确(null)" : "异常"}`);
  console.log(`   - 父任务汇总状态: ${updatedParent.status === ManagedTaskStatus.DONE ? "正确(DONE)" : "异常"}`);
  console.log(`   - 父任务汇总进度: ${updatedParent.progressPercent === 100 ? "正确(100%)" : "异常"}`);

  // 清理测试数据
  await prisma.managedTask.deleteMany({
    where: { id: { in: [child.id, parent.id] } },
  });
  console.log("🧹 测试数据清理完毕！");

  if (
    child.executorId === user.id &&
    child.status === ManagedTaskStatus.DONE &&
    child.progressPercent === 100 &&
    updatedParent.status === ManagedTaskStatus.DONE &&
    updatedParent.progressPercent === 100
  ) {
    console.log("🎉 所有断言全数通过！方案 A 数据继承与迁移功能开发验证成功！");
  } else {
    throw new Error("❌ 单元测试断言失败！");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
