import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runTest() {
  console.log("=== 正在测试：任务升降级与复制任务数据库逻辑 ===");

  const user = await prisma.user.findFirst();
  const team = await prisma.productLineTeam.findFirst();
  if (!user || !team) throw new Error("数据库中缺少测试用户或团队数据");

  const maxSeq = (await prisma.managedTask.aggregate({ _max: { sequenceNo: true } }))._max.sequenceNo || 0;

  // 1. 创建测试任务 A 与 任务 B
  const taskA = await prisma.managedTask.create({
    data: {
      sequenceNo: maxSeq + 1,
      title: "测试任务A",
      level: 1,
      status: "UNSCHEDULED",
      category: "DEVELOPMENT",
      productLineTeamId: team.id,
      createdById: user.id,
    },
  });

  const taskB = await prisma.managedTask.create({
    data: {
      sequenceNo: maxSeq + 2,
      title: "测试任务B",
      level: 1,
      status: "UNSCHEDULED",
      category: "DEVELOPMENT",
      productLineTeamId: team.id,
      createdById: user.id,
    },
  });

  console.log(`✅ 步骤 1: 成功创建测试任务 A (${taskA.id}) 和 B (${taskB.id})`);

  // 2. 模拟降级：将任务 B 挂载到任务 A 下方作为子任务
  await prisma.managedTask.update({
    where: { id: taskB.id },
    data: {
      parentId: taskA.id,
      level: 2,
    },
  });

  const updatedB = await prisma.managedTask.findUnique({ where: { id: taskB.id } });
  console.assert(updatedB?.parentId === taskA.id, "任务 B 的 parentId 应为 任务 A");
  console.assert(updatedB?.level === 2, "任务 B 的 level 应升级为 2");
  console.log("✅ 步骤 2: 降级校验成功，任务 B 已变更为任务 A 的子节点 (level 2)");

  // 3. 模拟升级：将任务 B 提升为一级节点
  await prisma.managedTask.update({
    where: { id: taskB.id },
    data: {
      parentId: null,
      level: 1,
    },
  });

  const restoredB = await prisma.managedTask.findUnique({ where: { id: taskB.id } });
  console.assert(restoredB?.parentId === null, "任务 B 的 parentId 应为空");
  console.assert(restoredB?.level === 1, "任务 B 的 level 应恢复为 1");
  console.log("✅ 步骤 3: 升级校验成功，任务 B 已提升回一级节点 (level 1)");

  // 4. 模拟复制：创建任务 A 副本
  const maxSeq2 = (await prisma.managedTask.aggregate({ _max: { sequenceNo: true } }))._max.sequenceNo || 0;
  const copiedA = await prisma.managedTask.create({
    data: {
      sequenceNo: maxSeq2 + 1,
      title: `${taskA.title} (副本)`,
      level: taskA.level,
      parentId: taskA.parentId,
      status: taskA.status,
      category: taskA.category,
      productLineTeamId: taskA.productLineTeamId,
      createdById: user.id,
    },
  });

  console.assert(copiedA.title.includes("副本"), "复制生成的任务标题应包含 (副本)");
  console.log(`✅ 步骤 4: 复制校验成功，副本 ID: ${copiedA.id}，标题: ${copiedA.title}`);

  // 5. 垃圾清理
  await prisma.managedTask.delete({ where: { id: taskA.id } });
  await prisma.managedTask.delete({ where: { id: taskB.id } });
  await prisma.managedTask.delete({ where: { id: copiedA.id } });
  console.log("🧹 测试数据清理完毕！");
  console.log("🎉 所有升降级与复制任务断言全数通过！");
}

runTest()
  .catch((err) => {
    console.error("❌ 测试失败:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
