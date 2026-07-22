import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/actions/audit-logs";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFilePromise = promisify(execFile);

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ planId: string }> }
) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("未登录，无权访问", { status: 401 });
    }

    const { planId } = await props.params;

    // 2. Fetch quarterly plan details
    const plan = await prisma.quarterlyPlan.findUnique({
      where: { id: planId },
      include: {
        productLineTeam: {
          include: {
            products: { select: { name: true } },
            members: {
              where: { role: "LEADER" },
              include: { user: { select: { name: true } } }
            }
          }
        },
        goals: { orderBy: { sortOrder: "asc" } },
        risks: { orderBy: { sortOrder: "asc" } }
      }
    });

    if (!plan) {
      return new Response("计划未找到", { status: 404 });
    }

    // 3. Prepare payload for Python exporter
    const leaderName = plan.productLineTeam.members[0]?.user.name ?? "未设置";
    const products = plan.productLineTeam.products.map((p) => p.name);
    
    const payload = {
      teamName: plan.productLineTeam.name,
      leaderName,
      products,
      year: plan.year,
      quarter: plan.quarter,
      goals: plan.goals.map((g) => ({
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
        notes: g.notes
      })),
      risks: plan.risks.map((r) => ({
        riskDescription: r.riskDescription,
        affectedMilestone: r.affectedMilestone,
        probability: r.probability,
        impact: r.impact,
        overallLevel: r.overallLevel,
        triggerCondition: r.triggerCondition,
        responseStrategy: r.responseStrategy,
        warningPoint: r.warningPoint,
        status: r.status
      }))
    };

    // 4. Write temp JSON payload
    const tempDir = os.tmpdir();
    const tempJsonPath = path.join(tempDir, `plan-${planId}-${Date.now()}.json`);
    const tempXlsxPath = path.join(tempDir, `plan-${planId}-${Date.now()}.xlsx`);

    await fs.writeFile(tempJsonPath, JSON.stringify(payload, null, 2), "utf8");

    // 5. Execute Python script to generate Excel file
    // Note: We use process.cwd() to target the script path in project root
    const scriptPath = path.join(process.cwd(), "scripts", "export-milestone-plan.py");
    
    await execFilePromise("python", [scriptPath, tempJsonPath, tempXlsxPath]);

    // 6. Read output file buffer
    const fileBuffer = await fs.readFile(tempXlsxPath);

    // 7. Cleanup temp files
    await fs.unlink(tempJsonPath).catch(() => {});
    await fs.unlink(tempXlsxPath).catch(() => {});

    // 8. Record audit log
    await recordAuditLog(
      "EXPORT",
      "PLAN",
      `导出了产品线小组 [${plan.productLineTeam.name}] 的 ${plan.year}年Q${plan.quarter} 季度里程碑计划 Excel`
    );

    // 9. Return Response
    const filename = encodeURIComponent(
      `技术中心-${plan.productLineTeam.name}-${plan.year}年Q${plan.quarter}季度里程碑计划.xlsx`
    );

    return new Response(fileBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
        "Cache-Control": "no-store, max-age=0"
      }
    });
  } catch (error) {
    console.error("[QuarterlyPlanExportRoute] Error exporting plan:", error);
    return new Response(
      error instanceof Error ? error.message : "导出季度里程碑计划失败",
      { status: 500 }
    );
  }
}
