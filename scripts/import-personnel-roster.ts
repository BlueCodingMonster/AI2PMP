import "dotenv/config";
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

type RosterRow = { name: string; username: string; department: string; level: string; position: string };
const roster = JSON.parse(readFileSync(new URL("./personnel-roster.json", import.meta.url), "utf8")) as RosterRow[];
const expectedDepartments = { 仪表平台研发部: 28, 产品规划部: 10, 测试部: 6 };

function validateRoster() {
  if (roster.length !== 45) throw new Error(`人员清单必须为45人，当前${roster.length}人`);
  if (new Set(roster.map((row) => row.name)).size !== 45) throw new Error("人员姓名存在重复");
  if (new Set(roster.map((row) => row.username)).size !== 45) throw new Error("登录名存在重复");
  for (const [department, count] of Object.entries(expectedDepartments)) {
    if (roster.filter((row) => row.department === department).length !== count) throw new Error(`${department}人数不正确`);
  }
  if (roster.filter((row) => row.level === "部门经理").length !== 3) throw new Error("部门经理必须为3人");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  validateRoster();
  let fallbackUser = await prisma.user.findFirst({ where: { username: "liujie" } });
  if (!fallbackUser) {
    fallbackUser = await prisma.user.findFirst({ where: { isAdmin: true } });
  }
  if (!fallbackUser) {
    throw new Error("系统中不存在可作为承载主体的管理员账户，请先运行 seed");
  }
  const password = await bcrypt.hash("123456", 10);

  await prisma.$transaction(async (tx) => {
    const removable = await tx.user.findMany({ where: { id: { not: fallbackUser.id } }, select: { id: true } });
    const ids = removable.map((user) => user.id);
    if (ids.length) {
      await tx.project.updateMany({ where: { createdById: { in: ids } }, data: { createdById: fallbackUser.id } });
      await tx.requirement.updateMany({ where: { createdById: { in: ids } }, data: { createdById: fallbackUser.id } });
      await tx.quarterlyPlan.updateMany({ where: { createdById: { in: ids } }, data: { createdById: fallbackUser.id } });
      await tx.quarterlyPlan.updateMany({ where: { updatedById: { in: ids } }, data: { updatedById: fallbackUser.id } });
      await tx.monthlyPlan.updateMany({ where: { createdById: { in: ids } }, data: { createdById: fallbackUser.id } });
      await tx.monthlyPlan.updateMany({ where: { updatedById: { in: ids } }, data: { updatedById: fallbackUser.id } });
      await tx.projectMember.deleteMany({ where: { userId: { in: ids } } });
    }
    await tx.memberSecondment.deleteMany({});
    await tx.productLineMember.deleteMany({});
    await tx.user.deleteMany({ where: { id: { not: fallbackUser.id } } });
    
    const otherRoster = roster.filter(row => row.username !== fallbackUser.username);
    await tx.user.createMany({ data: otherRoster.map((row) => ({ ...row, password, email: null, phone: null, isAdmin: row.level === "部门经理", isActive: true })) });
    
    const myRosterRow = roster.find(row => row.username === fallbackUser.username);
    if (myRosterRow) {
      await tx.user.update({
        where: { id: fallbackUser.id },
        data: {
          name: myRosterRow.name,
          department: myRosterRow.department,
          level: myRosterRow.level,
          position: myRosterRow.position,
          isAdmin: myRosterRow.level === "部门经理",
        }
      });
    }
  });
  console.log(`人员导入完成：以 ${fallbackUser.name} 为保留主体，导入${roster.length}人`);
}

main().finally(async () => { await prisma.$disconnect(); await pool.end(); });
