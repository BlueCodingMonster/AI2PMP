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

    // 2. Fetch monthly plan details
    const plan = await prisma.monthlyPlan.findUnique({
      where: { id: planId },
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

    if (!plan) {
      return new Response("计划未找到", { status: 404 });
    }

    // 3. Prepare payload for Python exporter
    const leaderName = plan.productLineTeam.members[0]?.user.name ?? "未设置";
    
    const payload = [
      {
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
      }
    ];

    // 4. Write temp JSON payload
    const tempDir = os.tmpdir();
    const tempJsonPath = path.join(tempDir, `monthly-plan-${planId}-${Date.now()}.json`);
    const tempXlsxPath = path.join(tempDir, `monthly-plan-${planId}-${Date.now()}.xlsx`);

    await fs.writeFile(tempJsonPath, JSON.stringify(payload, null, 2), "utf8");

    // 5. Execute Python script to generate Excel file
    const scriptPath = path.join(process.cwd(), "scripts", "export-monthly-plan.py");
    
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
      `导出了产品线小组 [${plan.productLineTeam.name}] 的 ${plan.year}年${plan.month}月项目经营计划 Excel`
    );

    // 9. Return Response
    const filename = encodeURIComponent(
      `技术中心-${plan.productLineTeam.name}-${plan.year}年${plan.month}月项目经营计划.xlsx`
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
    console.error("[MonthlyPlanExportRoute] Error exporting plan:", error);
    return new Response(
      error instanceof Error ? error.message : "导出月度项目经营计划失败",
      { status: 500 }
    );
  }
}
