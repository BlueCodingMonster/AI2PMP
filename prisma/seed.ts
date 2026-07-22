import { PrismaClient, ProjectStatus, ProjectRole, RequirementStatus, RequirementSource, Priority, ProductLineRole } from "@prisma/client";
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

  await prisma.quarterlyPlan.deleteMany({});
  await prisma.monthlyPlan.deleteMany({});
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
      status: ProjectStatus.IMPLEMENTING,
      customerName: "内部研发",
      projectManagerId: admin.id,
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
      status: RequirementStatus.REVIEWED,
      source: RequirementSource.PRODUCT_PLANNING,
      priority: Priority.HIGH,
      productLineTeamId: productLine.id,
      createdById: pm.id,
      reviewedAt: new Date("2026-07-01"),
    },
  });

  const req2 = await prisma.requirement.create({
    data: {
      title: "Kanban 看板交互优化",
      status: RequirementStatus.SCHEDULED,
      source: RequirementSource.INTERNAL_REQUEST,
      priority: Priority.MEDIUM,
      productLineTeamId: productLine.id,
      createdById: pm.id,
    },
  });


  await prisma.requirement.update({
    where: { id: req1.id },
    data: { status: RequirementStatus.SCHEDULED },
  });

  await prisma.requirement.update({
    where: { id: req2.id },
    data: { status: RequirementStatus.REVIEWED, reviewedAt: new Date("2026-07-01") },
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
