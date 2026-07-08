import { PrismaClient, ProjectStatus, ProjectRole, RequirementStatus, RequirementType, RequirementSource, Priority, PlanType, PlanStatus, PlanItemStatus, TaskStatus, TaskType, ProductLineRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("开始执行数据库 seed...");

  await prisma.comment.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.timeLog.deleteMany({});
  await prisma.bug.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.planItem.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.requirement.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.memberSecondment.deleteMany({});
  await prisma.productLineMember.deleteMany({});
  await prisma.productLineTeam.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHashAdmin = await bcrypt.hash("admin123", 10);
  const passwordHashPm = await bcrypt.hash("pm123", 10);
  const passwordHashDev = await bcrypt.hash("dev123", 10);
  const passwordHashTester = await bcrypt.hash("tester123", 10);

  const admin = await prisma.user.create({
    data: {
      username: "admin",
      email: null,
      name: "管理员",
      password: passwordHashAdmin,
      department: "研发管理部",
      isAdmin: true,
    },
  });

  const pm = await prisma.user.create({
    data: {
      username: "pm",
      email: null,
      name: "产品经理-张华",
      password: passwordHashPm,
      department: "产品部",
    },
  });

  const dev = await prisma.user.create({
    data: {
      username: "dev",
      email: null,
      name: "研发工程师-李明",
      password: passwordHashDev,
      department: "研发部",
    },
  });

  const tester = await prisma.user.create({
    data: {
      username: "tester",
      email: null,
      name: "测试工程师-王芳",
      password: passwordHashTester,
      department: "质量保障部",
    },
  });

  const productLine = await prisma.productLineTeam.create({
    data: {
      name: "AI2PmP 产品线",
      description: "研发项目管理系统产品线",
    },
  });

  await prisma.productLineMember.createMany({
    data: [
      { teamId: productLine.id, userId: pm.id, role: ProductLineRole.PM },
      { teamId: productLine.id, userId: dev.id, role: ProductLineRole.BACKEND },
      { teamId: productLine.id, userId: tester.id, role: ProductLineRole.TESTER },
    ],
  });

  const project = await prisma.project.create({
    data: {
      name: "研发项目管理系统 (AI2PmP)",
      key: "AI2P",
      description: "公司内部使用的研发项目管理系统，支持需求池、计划、任务和项目跟踪。",
      status: ProjectStatus.ACTIVE,
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-12-31"),
      createdById: admin.id,
      productLineTeamId: productLine.id,
    },
  });

  await prisma.projectMember.createMany({
    data: [
      { projectId: project.id, userId: admin.id, role: ProjectRole.OWNER },
      { projectId: project.id, userId: pm.id, role: ProjectRole.ADMIN },
      { projectId: project.id, userId: dev.id, role: ProjectRole.DEVELOPER },
      { projectId: project.id, userId: tester.id, role: ProjectRole.TESTER },
    ],
  });

  const req1 = await prisma.requirement.create({
    data: {
      title: "多周期计划管理模块开发",
      description: "支持产品线下年度、半年、季度、月度计划，并允许计划项选择性关联需求。",
      status: RequirementStatus.APPROVED,
      type: RequirementType.FUNCTIONAL,
      source: RequirementSource.PRODUCT_PLANNING,
      priority: Priority.HIGH,
      businessValue: 9,
      complexity: 7,
      estimatedDays: 10,
      projectId: project.id,
      productLineTeamId: productLine.id,
      assigneeId: pm.id,
      createdById: pm.id,
      acceptanceCriteria: "1. 计划必须归属产品线\n2. 支持年度、半年、季度、月度计划\n3. 计划之间可关联但不强制\n4. 计划项可不关联需求",
    },
  });

  const req2 = await prisma.requirement.create({
    data: {
      title: "Kanban 看板交互优化",
      description: "优化任务拖拽排序和状态流转体验。",
      status: RequirementStatus.APPROVED,
      type: RequirementType.ENHANCEMENT,
      source: RequirementSource.INTERNAL_SUGGESTION,
      priority: Priority.MEDIUM,
      businessValue: 8,
      complexity: 5,
      estimatedDays: 5,
      projectId: project.id,
      productLineTeamId: productLine.id,
      assigneeId: dev.id,
      createdById: pm.id,
    },
  });

  const annualPlan = await prisma.plan.create({
    data: {
      title: "2026 年度产品研发总计划",
      description: "AI2PmP 产品线 2026 年度研发规划。",
      type: PlanType.ANNUAL,
      status: PlanStatus.IN_PROGRESS,
      year: 2026,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      goals: "1. 发布核心平台 2.0 版本\n2. 完成需求池到执行闭环\n3. 研发效率提升 20%",
      productLineTeamId: productLine.id,
      createdById: admin.id,
    },
  });

  const halfYearPlan = await prisma.plan.create({
    data: {
      title: "2026 下半年产品研发计划",
      description: "聚焦下半年重点版本和产品线交付。",
      type: PlanType.HALF_YEAR,
      status: PlanStatus.IN_PROGRESS,
      year: 2026,
      halfYear: 2,
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-12-31"),
      parentPlanId: annualPlan.id,
      goals: "1. 完成下半年重点版本交付\n2. 推动需求池到计划执行闭环",
      productLineTeamId: productLine.id,
      createdById: pm.id,
    },
  });

  const quarterlyPlan = await prisma.plan.create({
    data: {
      title: "2026 Q3 研发攻坚计划",
      description: "聚焦需求池系统和计划管理子系统上线。",
      type: PlanType.QUARTERLY,
      status: PlanStatus.IN_PROGRESS,
      year: 2026,
      quarter: 3,
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-09-30"),
      parentPlanId: halfYearPlan.id,
      goals: "1. 需求池模块上线\n2. 计划看板与任务系统闭环",
      productLineTeamId: productLine.id,
      createdById: pm.id,
    },
  });

  const monthlyPlan = await prisma.plan.create({
    data: {
      title: "2026 年 7 月研发迭代计划",
      description: "7 月份冲刺，完成计划、需求、任务的基本看板。",
      type: PlanType.MONTHLY,
      status: PlanStatus.IN_PROGRESS,
      year: 2026,
      quarter: 3,
      month: 7,
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-07-31"),
      parentPlanId: quarterlyPlan.id,
      goals: "1. 完成计划模型和页面\n2. 完成登录注册和基础看板",
      productLineTeamId: productLine.id,
      createdById: pm.id,
    },
  });

  const item1 = await prisma.planItem.create({
    data: {
      planId: monthlyPlan.id,
      title: "计划管理核心逻辑实现",
      description: "实现产品线周期计划和计划目标项管理。",
      requirementId: req1.id,
      projectId: project.id,
      assigneeId: dev.id,
      status: PlanItemStatus.IN_PROGRESS,
      progress: 30,
      sortOrder: 1,
    },
  });

  await prisma.planItem.create({
    data: {
      planId: monthlyPlan.id,
      title: "研发管理例会和风险跟踪",
      description: "不关联需求池，作为产品线管理目标跟踪。",
      projectId: project.id,
      assigneeId: pm.id,
      status: PlanItemStatus.TODO,
      progress: 0,
      sortOrder: 2,
    },
  });

  await prisma.task.create({
    data: {
      title: "实现计划管理页面",
      description: "完成计划列表、表单、详情页和计划目标项弹窗。",
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      type: TaskType.FEATURE,
      projectId: project.id,
      requirementId: req1.id,
      assigneeId: dev.id,
      createdById: pm.id,
      startDate: new Date("2026-07-01"),
      dueDate: new Date("2026-07-15"),
      estimatedHours: 40,
      planItems: {
        connect: { id: item1.id },
      },
    },
  });

  await prisma.requirement.update({
    where: { id: req1.id },
    data: { status: RequirementStatus.PLANNED },
  });

  await prisma.requirement.update({
    where: { id: req2.id },
    data: { status: RequirementStatus.APPROVED },
  });

  console.log("Seed 完成。默认账号：admin/admin123，pm/pm123，dev/dev123，tester/tester123");
}

main()
  .catch((error) => {
    console.error("Seed 执行失败:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
