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

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("未登录，无权访问", { status: 401 });
    }

    // 2. Parse query parameters
    const url = new URL(request.url);
    const yearStr = url.searchParams.get("year");
    const quarterStr = url.searchParams.get("quarter");
    const teamIdParam = url.searchParams.get("productLineTeamId");

    if (!yearStr || !quarterStr) {
      return new Response("缺少必要的周期参数 (year, quarter)", { status: 400 });
    }

    const year = parseInt(yearStr);
    const quarter = parseInt(quarterStr);

    if (isNaN(year) || isNaN(quarter)) {
      return new Response("无效的周期参数", { status: 400 });
    }

    const filterTeamIds = teamIdParam ? teamIdParam.split(",").filter(Boolean) : undefined;

    // 3. Fetch quarterly plans
    const plans = await prisma.quarterlyPlan.findMany({
      where: {
        year,
        quarter,
        ...(filterTeamIds && filterTeamIds.length > 0 ? { productLineTeamId: { in: filterTeamIds } } : {})
      },
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

    if (plans.length === 0) {
      return new Response("没有找到符合条件的季度计划", { status: 404 });
    }

    // 4. Prepare payload for Python exporter
    const payload = plans.map(plan => {
      const leaderName = plan.productLineTeam.members[0]?.user.name ?? "未设置";
      const products = plan.productLineTeam.products.map((p) => p.name);
      return {
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
    });

    // 5. Write temp JSON payload
    const tempDir = os.tmpdir();
    const tempJsonPath = path.join(tempDir, `quarterly-plans-${year}-Q${quarter}-${Date.now()}.json`);
    const tempXlsxPath = path.join(tempDir, `quarterly-plans-${year}-Q${quarter}-${Date.now()}.xlsx`);

    await fs.writeFile(tempJsonPath, JSON.stringify(payload, null, 2), "utf8");

    // 6. Execute Python script to generate Excel file
    const scriptPath = path.join(process.cwd(), "scripts", "export-milestone-plan.py");
    await execFilePromise("python", [scriptPath, tempJsonPath, tempXlsxPath]);

    // 7. Read output file buffer
    const fileBuffer = await fs.readFile(tempXlsxPath);

    // 8. Clean up temp files
    await fs.unlink(tempJsonPath).catch(() => {});
    await fs.unlink(tempXlsxPath).catch(() => {});

    // 9. Record audit log
    await recordAuditLog(
      "EXPORT",
      "PLAN",
      `批量导出了 ${plans.length} 个小组的 ${year}年Q${quarter} 季度里程碑计划 Excel`
    );

    // 10. Return Excel file
    const filename = encodeURIComponent(`技术中心Q${quarter}季度里程碑计划.xlsx`);
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
        "Cache-Control": "no-store, max-age=0"
      }
    });

  } catch (error) {
    console.error("[QuarterlyPlanBatchExport]", error);
    return new Response("导出失败", { status: 500 });
  }
}
