import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

type DeliveryRow = { moduleVersion?: string; deliveryContent?: string; plannedCompletionDate?: string };
type ProjectRow = { projectName?: string; deliveryContent?: string; plannedCompletionDate?: string; customerName?: string };
type MarketRow = { productOrProject?: string; marketAction?: string; outputResult?: string; plannedCompletionDate?: string };
type CostRow = { optimizationItem?: string; currentProblem?: string; optimizationMeasure?: string };
type AiRow = { item?: string; outputResult?: string; plannedCompletionDate?: string };
type RiskRow = { riskItem?: string; riskLevel?: any; impactScope?: string; responseMeasure?: string };
type ResourceRow = { requestType?: any; content?: string; urgency?: any; supportDepartment?: string };

type MonthlyPlanSheet = {
  teamName: string;
  year: number;
  month: number;
  productDeliveries: DeliveryRow[];
  projectDeliveries: ProjectRow[];
  marketActions: MarketRow[];
  costOptimizations: CostRow[];
  aiProductEnablements: AiRow[];
  aiEfficiencies: AiRow[];
  risks: RiskRow[];
  resourceRequests: ResourceRow[];
};

const jsonPath = new URL("./monthly-plan.json", import.meta.url);
const monthlyPlans = JSON.parse(readFileSync(jsonPath, "utf8")) as MonthlyPlanSheet[];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const write = process.argv.includes("--write");
  
  // Find fallback user
  let fallbackUser = await prisma.user.findFirst({ where: { username: "liujie" } });
  if (!fallbackUser) {
    fallbackUser = await prisma.user.findFirst({ where: { isAdmin: true } });
  }
  if (!fallbackUser) {
    throw new Error("No user found in the system. Run seed first.");
  }

  // Get all teams
  const teams = await prisma.productLineTeam.findMany({
    include: {
      members: {
        where: { role: "LEADER" }
      }
    }
  });

  console.log(`Loaded ${monthlyPlans.length} plan sheets from JSON.\n`);

  if (!write) {
    console.log("Prepared monthly plans summary (Dry-Run):");
  } else {
    console.log("Applying changes to database...");
  }

  for (const sheet of monthlyPlans) {
    const team = teams.find((t) => t.name === sheet.teamName);
    if (!team) {
      console.warn(`  Warning: Team '${sheet.teamName}' not found in database. Skipping.`);
      continue;
    }

    const leaderId = team.members[0]?.userId || fallbackUser.id;

    console.log(`- Team: ${sheet.teamName}, Year: ${sheet.year}, Month: ${sheet.month}, Owner ID: ${leaderId}`);
    console.log(`  Product Deliveries: ${sheet.productDeliveries.length}`);
    console.log(`  Project Deliveries: ${sheet.projectDeliveries.length}`);
    console.log(`  Market Actions: ${sheet.marketActions.length}`);
    console.log(`  Cost Optimizations: ${sheet.costOptimizations.length}`);
    console.log(`  AI Product Enablements: ${sheet.aiProductEnablements.length}`);
    console.log(`  AI Efficiencies: ${sheet.aiEfficiencies.length}`);
    console.log(`  Risks: ${sheet.risks.length}`);
    console.log(`  Resource Requests: ${sheet.resourceRequests.length}`);

    if (write) {
      await prisma.$transaction(async (tx) => {
        // Delete existing monthly plan for the team, year, and month
        await tx.monthlyPlan.deleteMany({
          where: {
            productLineTeamId: team.id,
            year: sheet.year,
            month: sheet.month
          }
        });

        // Create new monthly plan
        await tx.monthlyPlan.create({
          data: {
            productLineTeamId: team.id,
            year: sheet.year,
            month: sheet.month,
            status: "PUBLISHED", // Set to PUBLISHED directly so it's live
            createdById: leaderId,
            updatedById: leaderId,
            publishedAt: new Date(),
            productDeliveries: {
              create: sheet.productDeliveries.map((d, idx) => ({
                moduleVersion: d.moduleVersion,
                deliveryContent: d.deliveryContent,
                plannedCompletionDate: d.plannedCompletionDate ? new Date(d.plannedCompletionDate) : null,
                sortOrder: idx
              }))
            },
            projectDeliveries: {
              create: sheet.projectDeliveries.map((d, idx) => ({
                projectName: d.projectName,
                deliveryContent: d.deliveryContent,
                plannedCompletionDate: d.plannedCompletionDate ? new Date(d.plannedCompletionDate) : null,
                customerName: d.customerName,
                sortOrder: idx
              }))
            },
            marketActions: {
              create: sheet.marketActions.map((d, idx) => ({
                productOrProject: d.productOrProject,
                marketAction: d.marketAction,
                outputResult: d.outputResult,
                plannedCompletionDate: d.plannedCompletionDate ? new Date(d.plannedCompletionDate) : null,
                sortOrder: idx
              }))
            },
            costOptimizations: {
              create: sheet.costOptimizations.map((d, idx) => ({
                optimizationItem: d.optimizationItem,
                currentProblem: d.currentProblem,
                optimizationMeasure: d.optimizationMeasure,
                sortOrder: idx
              }))
            },
            aiProductEnablements: {
              create: sheet.aiProductEnablements.map((d, idx) => ({
                item: d.item,
                outputResult: d.outputResult,
                plannedCompletionDate: d.plannedCompletionDate ? new Date(d.plannedCompletionDate) : null,
                sortOrder: idx
              }))
            },
            aiEfficiencies: {
              create: sheet.aiEfficiencies.map((d, idx) => ({
                item: d.item,
                outputResult: d.outputResult,
                plannedCompletionDate: d.plannedCompletionDate ? new Date(d.plannedCompletionDate) : null,
                sortOrder: idx
              }))
            },
            risks: {
              create: sheet.risks.map((d, idx) => ({
                riskItem: d.riskItem,
                riskLevel: d.riskLevel,
                impactScope: d.impactScope,
                responseMeasure: d.responseMeasure,
                sortOrder: idx
              }))
            },
            resourceRequests: {
              create: sheet.resourceRequests.map((d, idx) => ({
                requestType: d.requestType,
                content: d.content,
                urgency: d.urgency,
                supportDepartment: d.supportDepartment,
                sortOrder: idx
              }))
            }
          }
        });
      });
    }
  }

  if (!write) {
    console.log("\nThis is a dry-run. Run with '--write' to apply changes to database.");
  } else {
    console.log("\nDatabase import completed successfully.");
  }
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
