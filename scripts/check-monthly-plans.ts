import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("Checking existing Monthly Plans for 2026-07...");
  const plans = await prisma.monthlyPlan.findMany({
    where: { year: 2026, month: 7 },
    include: {
      productLineTeam: { select: { name: true } },
      productDeliveries: true,
      projectDeliveries: true,
      marketActions: true,
      costOptimizations: true,
      aiProductEnablements: true,
      aiEfficiencies: true,
      risks: true,
      resourceRequests: true
    }
  });

  console.log(`Found ${plans.length} monthly plans:`);
  for (const plan of plans) {
    console.log(`Plan ID: ${plan.id}, Team: ${plan.productLineTeam.name}, Year: ${plan.year}, Month: ${plan.month}`);
    console.log(`  Product Deliveries: ${plan.productDeliveries.length}`);
    console.log(`  Project Deliveries: ${plan.projectDeliveries.length}`);
    console.log(`  Market Actions: ${plan.marketActions.length}`);
    console.log(`  Cost Optimizations: ${plan.costOptimizations.length}`);
    console.log(`  AI Product Enablements: ${plan.aiProductEnablements.length}`);
    console.log(`  AI Efficiencies: ${plan.aiEfficiencies.length}`);
    console.log(`  Risks: ${plan.risks.length}`);
    console.log(`  Resource Requests: ${plan.resourceRequests.length}`);
  }
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
