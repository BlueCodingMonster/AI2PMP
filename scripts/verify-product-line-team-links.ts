import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const teams = await prisma.productLineTeam.findMany({
    include: { products: { select: { id: true } }, projects: { select: { id: true } } },
  });
  const products = await prisma.product.count();
  console.log(JSON.stringify({
    teams: teams.length,
    products,
    productLinks: teams.reduce((sum, team) => sum + team.products.length, 0),
    projectLinks: teams.reduce((sum, team) => sum + team.projects.length, 0),
    sampleTeamId: teams[0]?.id ?? null,
  }));
}

main().finally(async () => { await prisma.$disconnect(); await pool.end(); });
