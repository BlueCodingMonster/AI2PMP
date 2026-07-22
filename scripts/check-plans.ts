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
  console.log("Checking existing Quarterly Plans...");
  const plans = await prisma.quarterlyPlan.findMany({
    include: {
      productLineTeam: true,
      goals: true,
      risks: true,
    }
  });
  console.log(`Found ${plans.length} plans:`);
  for (const p of plans) {
    console.log(`Plan ID: ${p.id}, Team: ${p.productLineTeam.name}, Year: ${p.year}, Quarter: ${p.quarter}`);
    console.log(`  Goals: ${p.goals.length}, Risks: ${p.risks.length}`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
