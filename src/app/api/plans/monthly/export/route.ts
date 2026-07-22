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

    // 2. Parse year and month query parameters
    const url = new URL(request.url);
    const yearStr = url.searchParams.get("year");
    const monthStr = url.searchParams.get("month");

    if (!yearStr || !monthStr) {
      return new Response("缺少必要的周期参数 (year, month)", { status: 400 });
    }

    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    if (isNaN(year) || isNaN(month)) {
      return new Response("无效的周期参数", { status: 400 });
    }

    const teamIdParam = url.searchParams.get("productLineTeamId");
    const filterTeamIds = teamIdParam ? teamIdParam.split(",").filter(Boolean) : undefined;

    // 3. Fetch all monthly plans for specified year & month
    const plans = await prisma.monthlyPlan.findMany({
      where: {
        year,
        month,
        ...(filterTeamIds && filterTeamIds.length > 0 ? { productLineTeamId: { in: filterTeamIds } } : {})
      },
      include: {
        productLineTeam: {
          include: {
            members: {
              where: { role: "LEADER" },
              include: { user: { select: { name: true } } }
            }
          }
        },
        productDeliveries: { orderBy: { sortOrder: "asc" } },
        projectDeliveries: { orderBy: { sortOrder: "asc" } },
        marketActions: { orderBy: { sortOrder: "asc" } },
        costOptimizations: { orderBy: { sortOrder: "asc" } },
        aiProductEnablements: { orderBy: { sortOrder: "asc" } },
        aiEfficiencies: { orderBy: { sortOrder: "asc" } },
        risks: { orderBy: { sortOrder: "asc" } },
        resourceRequests: { orderBy: { sortOrder: "asc" } }
      }
    });

    if (plans.length === 0) {
      return new Response(`未找到 ${year}年${month}月 的月度项目经营计划数据`, { status: 404 });
    }

    // 4. Prepare payload for Python exporter
    const payload = plans.map((plan) => {
      const leaderName = plan.productLineTeam.members[0]?.user.name ?? "未设置";
      return {
        teamName: plan.productLineTeam.name,
        leaderName,
        year: plan.year,
        month: plan.month,
        productDeliveries: plan.productDeliveries.map(d => ({
          moduleVersion: d.moduleVersion,
          deliveryContent: d.deliveryContent,
          plannedCompletionDate: d.plannedCompletionDate
        })),
        projectDeliveries: plan.projectDeliveries.map(d => ({
          projectName: d.projectName,
          deliveryContent: d.deliveryContent,
          plannedCompletionDate: d.plannedCompletionDate,
          customerName: d.customerName
        })),
        marketActions: plan.marketActions.map(d => ({
          productOrProject: d.productOrProject,
          marketAction: d.marketAction,
          outputResult: d.outputResult,
          plannedCompletionDate: d.plannedCompletionDate
        })),
        costOptimizations: plan.costOptimizations.map(d => ({
          optimizationItem: d.optimizationItem,
          currentProblem: d.currentProblem,
          optimizationMeasure: d.optimizationMeasure
        })),
        aiProductEnablements: plan.aiProductEnablements.map(d => ({
          item: d.item,
          outputResult: d.outputResult,
          plannedCompletionDate: d.plannedCompletionDate
        })),
        aiEfficiencies: plan.aiEfficiencies.map(d => ({
          item: d.item,
          outputResult: d.outputResult,
          plannedCompletionDate: d.plannedCompletionDate
        })),
        risks: plan.risks.map(d => ({
          riskItem: d.riskItem,
          riskLevel: d.riskLevel,
          impactScope: d.impactScope,
          responseMeasure: d.responseMeasure
        })),
        resourceRequests: plan.resourceRequests.map(d => ({
          requestType: d.requestType,
          content: d.content,
          urgency: d.urgency,
          supportDepartment: d.supportDepartment
        }))
      };
    });

    // 5. Write temp JSON payload
    const tempDir = os.tmpdir();
    const tempJsonPath = path.join(tempDir, `monthly-batch-${year}-${month}-${Date.now()}.json`);
    const tempXlsxPath = path.join(tempDir, `monthly-batch-${year}-${month}-${Date.now()}.xlsx`);

    await fs.writeFile(tempJsonPath, JSON.stringify(payload, null, 2), "utf8");

    // 6. Execute Python script to generate Excel file
    const scriptPath = path.join(process.cwd(), "scripts", "export-monthly-plan.py");
    
    await execFilePromise("python", [scriptPath, tempJsonPath, tempXlsxPath]);

    // 7. Read output file buffer
    const fileBuffer = await fs.readFile(tempXlsxPath);

    // 8. Cleanup temp files
    await fs.unlink(tempJsonPath).catch(() => {});
    await fs.unlink(tempXlsxPath).catch(() => {});

    // 9. Record audit log
    await recordAuditLog(
      "EXPORT",
      "PLAN",
      `批量导出了全部小组的 ${year}年${month}月月度项目经营计划 Excel`
    );

    // 10. Return Response
    const filename = encodeURIComponent(
      `技术中心月度（${month}月）项目经营计划.xlsx`
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
    console.error("[MonthlyBatchExportRoute] Error exporting plans:", error);
    return new Response(
      error instanceof Error ? error.message : "批量导出月度项目经营计划失败",
      { status: 500 }
    );
  }
}
