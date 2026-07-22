import { PrismaClient } from "@prisma/client";
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
  console.log("查询数据库中的产品线团队...");
  const teams = await prisma.productLineTeam.findMany({
    select: { id: true, name: true, description: true }
  });
  console.log("\nProduct Line Teams:");
  teams.forEach(t => console.log(`ID: ${t.id}, Name: ${t.name}`));

  console.log("\n查询数据库中的用户...");
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, department: true, isAdmin: true }
  });
  console.log("\nUsers:");
  users.forEach(u => console.log(`ID: ${u.id}, Username: ${u.username}, Name: ${u.name}, Department: ${u.department}, Admin: ${u.isAdmin}`));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
