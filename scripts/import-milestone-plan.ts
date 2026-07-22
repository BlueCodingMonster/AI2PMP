import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  QuarterlyGoalDomain,
  PlanTrackingStatus,
  PlanRiskLevel,
  QuarterlyRiskStatus,
  ProductLineRole,
  PlanPublicationStatus
} from "@prisma/client";
import { Pool } from "pg";

type GoalInput = {
  domain: string | null;
  quarterlyGoal: string | null;
  successCriteria: string | null;
  month1Goal: string | null;
  month1Status: string | null;
  month2Goal: string | null;
  month2Status: string | null;
  month3Goal: string | null;
  month3Status: string | null;
  currentCompletion: string | null;
  achievementRate: number;
  quarterlyStatus: string | null;
  keyDependencies: string | null;
  notes: string | null;
};

type RiskInput = {
  riskDescription: string | null;
  affectedMilestone: string | null;
  probability: string | null;
  impact: string | null;
  overallLevel: string | null;
  triggerCondition: string | null;
  responseStrategy: string | null;
  warningPoint: string | null;
  status: string | null;
};

type PlanInput = {
  teamName: string;
  year: number;
  quarter: number;
  goals: GoalInput[];
  risks: RiskInput[];
};

const domainMap: Record<string, QuarterlyGoalDomain> = {
  "产品迭代": QuarterlyGoalDomain.PRODUCT_ITERATION,
  "产品升级": QuarterlyGoalDomain.PRODUCT_ITERATION,
  "新的模块": QuarterlyGoalDomain.PRODUCT_ITERATION,
  "新模块": QuarterlyGoalDomain.PRODUCT_ITERATION,
  "产品交付": QuarterlyGoalDomain.PRODUCT_DELIVERY,
  "产品上线": QuarterlyGoalDomain.PRODUCT_DELIVERY,
  "产品调研": QuarterlyGoalDomain.PRODUCT_RESEARCH,
  "市场支持": QuarterlyGoalDomain.MARKET_SUPPORT,
  "市场支撑": QuarterlyGoalDomain.MARKET_SUPPORT,
  "运维稳定": QuarterlyGoalDomain.OPERATIONS_STABILITY,
  "运维稳定/市场支撑": QuarterlyGoalDomain.OPERATIONS_STABILITY,
  "技术创新": QuarterlyGoalDomain.TECHNICAL_INNOVATION,
  "AI赋能": QuarterlyGoalDomain.AI_ENABLEMENT,
};

const statusMap: Record<string, PlanTrackingStatus> = {
  "未开始": PlanTrackingStatus.NOT_STARTED,
  "⏳未开始": PlanTrackingStatus.NOT_STARTED,
  "进行中": PlanTrackingStatus.IN_PROGRESS,
  "🔄进行中": PlanTrackingStatus.IN_PROGRESS,
  "已完成": PlanTrackingStatus.COMPLETED,
  "✅已完成": PlanTrackingStatus.COMPLETED,
  "延期风险": PlanTrackingStatus.DELAY_RISK,
  "⚠️延期风险": PlanTrackingStatus.DELAY_RISK,
  "已延期": PlanTrackingStatus.DELAYED,
  "❌已延期": PlanTrackingStatus.DELAYED,
  "暂缓": PlanTrackingStatus.PAUSED,
  "⏸暂缓": PlanTrackingStatus.PAUSED,
};

const riskLevelMap: Record<string, PlanRiskLevel> = {
  "高": PlanRiskLevel.HIGH,
  "中": PlanRiskLevel.MEDIUM,
  "低": PlanRiskLevel.LOW,
};

const riskStatusMap: Record<string, QuarterlyRiskStatus> = {
  "未触发": QuarterlyRiskStatus.NOT_TRIGGERED,
  "⏳未触发": QuarterlyRiskStatus.NOT_TRIGGERED,
  "已触发": QuarterlyRiskStatus.TRIGGERED,
  "处理中": QuarterlyRiskStatus.HANDLING,
  "已关闭": QuarterlyRiskStatus.CLOSED,
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const shouldWrite = process.argv.includes("--write");

function clean(val: string | null): string | null {
  if (!val) return null;
  const s = val.trim();
  if (s === "" || s === "/" || s === "-") return null;
  return s;
}

function mapStatus(val: string | null): PlanTrackingStatus | null {
  const cleaned = clean(val);
  if (!cleaned) return null;
  return statusMap[cleaned] ?? null;
}

function mapRiskLevel(val: string | null): PlanRiskLevel | null {
  const cleaned = clean(val);
  if (!cleaned) return null;
  return riskLevelMap[cleaned] ?? null;
}

function mapRiskStatus(val: string | null): QuarterlyRiskStatus | null {
  const cleaned = clean(val);
  if (!cleaned) return null;
  return riskStatusMap[cleaned] ?? null;
}

async function main() {
  const jsonPath = path.join(process.cwd(), "scripts", "milestone-plan.json");
  const plansData = JSON.parse(await fs.readFile(jsonPath, "utf8")) as PlanInput[];

  console.log(`Loaded ${plansData.length} plan sheets from JSON.`);

  // Load teams and users for lookup
  const [teams, adminUser] = await Promise.all([
    prisma.productLineTeam.findMany({
      include: {
        members: {
          where: { role: ProductLineRole.LEADER },
          select: { userId: true }
        }
      }
    }),
    prisma.user.findFirst({ where: { isAdmin: true } })
  ]);

  if (!adminUser) {
    throw new Error("Could not find any administrator user in database.");
  }

  const teamByName = new Map(teams.map((t) => [t.name, t]));

  const preparedPlans = plansData.map((plan) => {
    const team = teamByName.get(plan.teamName);
    if (!team) {
      throw new Error(`Team not found in database: "${plan.teamName}"`);
    }

    // Determine owner (leader) of the team
    const leaderMember = team.members[0];
    const ownerId = leaderMember?.userId ?? adminUser.id;

    const goals = plan.goals.map((g) => {
      const domainName = clean(g.domain);
      const domain = domainName ? (domainMap[domainName] ?? null) : null;
      
      return {
        domain,
        quarterlyGoal: clean(g.quarterlyGoal),
        successCriteria: clean(g.successCriteria),
        month1Goal: clean(g.month1Goal),
        month1Status: mapStatus(g.month1Status),
        month2Goal: clean(g.month2Goal),
        month2Status: mapStatus(g.month2Status),
        month3Goal: clean(g.month3Goal),
        month3Status: mapStatus(g.month3Status),
        currentCompletion: clean(g.currentCompletion),
        achievementRate: g.achievementRate ?? 0,
        quarterlyStatus: mapStatus(g.quarterlyStatus),
        keyDependencies: clean(g.keyDependencies),
        notes: clean(g.notes),
      };
    });

    const risks = plan.risks.map((r) => {
      return {
        riskDescription: clean(r.riskDescription),
        affectedMilestone: clean(r.affectedMilestone),
        probability: mapRiskLevel(r.probability),
        impact: mapRiskLevel(r.impact),
        overallLevel: mapRiskLevel(r.overallLevel),
        triggerCondition: clean(r.triggerCondition),
        responseStrategy: clean(r.responseStrategy),
        warningPoint: clean(r.warningPoint),
        status: mapRiskStatus(r.status),
      };
    });

    return {
      teamId: team.id,
      teamName: team.name,
      year: plan.year,
      quarter: plan.quarter,
      ownerId,
      goals,
      risks
    };
  });

  console.log("\nPrepared plans summary (Dry-Run):");
  for (const p of preparedPlans) {
    console.log(`- Team: ${p.teamName}, Year: ${p.year}, Quarter: ${p.quarter}, Owner ID: ${p.ownerId}`);
    console.log(`  Goals: ${p.goals.length}`);
    for (const g of p.goals) {
      console.log(`    * [${g.domain ?? "UNKNOWN"}] ${g.quarterlyGoal?.substring(0, 40)}...`);
    }
    console.log(`  Risks: ${p.risks.length}`);
    for (const r of p.risks) {
      console.log(`    * [Level: ${r.overallLevel ?? "NONE"}] ${r.riskDescription?.substring(0, 40)}...`);
    }
  }

  if (!shouldWrite) {
    console.log("\nThis is a dry-run. Run with '--write' to apply changes to database.");
    return;
  }

  console.log("\nApplying changes to database...");
  await prisma.$transaction(async (tx) => {
    for (const p of preparedPlans) {
      // Upsert the QuarterlyPlan
      const plan = await tx.quarterlyPlan.upsert({
        where: {
          productLineTeamId_year_quarter: {
            productLineTeamId: p.teamId,
            year: p.year,
            quarter: p.quarter
          }
        },
        update: {
          updatedById: p.ownerId,
          status: PlanPublicationStatus.PUBLISHED,
          publishedAt: new Date()
        },
        create: {
          productLineTeamId: p.teamId,
          year: p.year,
          quarter: p.quarter,
          createdById: p.ownerId,
          updatedById: p.ownerId,
          status: PlanPublicationStatus.PUBLISHED,
          publishedAt: new Date()
        }
      });

      // Clear existing goals and risks
      await tx.quarterlyGoal.deleteMany({ where: { quarterlyPlanId: plan.id } });
      await tx.quarterlyRisk.deleteMany({ where: { quarterlyPlanId: plan.id } });

      // Create new goals
      if (p.goals.length > 0) {
        await tx.quarterlyGoal.createMany({
          data: p.goals.map((g, idx) => ({
            quarterlyPlanId: plan.id,
            domain: g.domain,
            quarterlyGoal: g.quarterlyGoal,
            successCriteria: g.successCriteria,
            month1Goal: g.month1Goal,
            month1Status: g.month1Status,
            month2Goal: g.month2Goal,
            month2Status: g.month2Status,
            month3Goal: g.month3Goal,
            month3Status: g.month3Status,
            currentCompletion: g.currentCompletion,
            achievementRate: g.achievementRate,
            quarterlyStatus: g.quarterlyStatus,
            keyDependencies: g.keyDependencies,
            notes: g.notes,
            sortOrder: idx
          }))
        });
      }

      // Create new risks
      if (p.risks.length > 0) {
        await tx.quarterlyRisk.createMany({
          data: p.risks.map((r, idx) => ({
            quarterlyPlanId: plan.id,
            riskDescription: r.riskDescription,
            affectedMilestone: r.affectedMilestone,
            probability: r.probability,
            impact: r.impact,
            overallLevel: r.overallLevel,
            triggerCondition: r.triggerCondition,
            responseStrategy: r.responseStrategy,
            warningPoint: r.warningPoint,
            status: r.status,
            sortOrder: idx
          }))
        });
      }
    }
  });

  console.log("\nDatabase import completed successfully.");
}

main()
  .catch((err) => {
    console.error("Error during import:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
