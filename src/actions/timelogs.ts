"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ManagedTaskStatus } from "@prisma/client";

/**
 * 格式化本地日期 (YYYY-MM-DD)
 */
function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 获取报表统计数据 (由原项目工时报表改版为 WBS 任务开发工时报表)
 * 包含：团队WBS工时分布、近7天任务完工工时走势、最近10条状态变更日志
 */
export async function getTimeLogsSummary() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "未登录，无权操作" };
    }

    // 1. 获取最近 10 条任务状态变更记录 (作为登账/动态记录)
    const recentLogs = await prisma.managedTaskStatusLog.findMany({
      take: 10,
      orderBy: { changedAt: "desc" },
      include: {
        changedBy: { select: { name: true } },
        task: {
          select: {
            title: true,
            actualWorkdays: true,
            productLineTeam: { select: { name: true } },
          },
        },
      },
    });

    // 2. 团队 WBS 工时（人天）分布统计
    // 汇总结算所有状态为 DONE 的叶子任务的实际工作人天 (actualWorkdays)
    const completedTasks = await prisma.managedTask.findMany({
      where: {
        status: ManagedTaskStatus.DONE,
        children: { none: {} }, // 仅统计叶子任务
      },
      include: {
        productLineTeam: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const teamHoursMap: Record<string, { name: string; key: string; hours: number }> = {};
    let totalWorkdays = 0;

    completedTasks.forEach((task) => {
      const team = task.productLineTeam;
      const workdays = task.actualWorkdays || 0;
      totalWorkdays += workdays;

      if (!teamHoursMap[team.id]) {
        teamHoursMap[team.id] = {
          name: team.name,
          key: team.id,
          hours: 0,
        };
      }
      teamHoursMap[team.id].hours += workdays;
    });

    // 为兼容 ReportsClient UI (其需要 hours 字段)，我们将 WBS 实际工作日 (人天) 返回为 hours
    const projectDistribution = Object.values(teamHoursMap);

    // 3. 近 7 天任务完工工时（人天）走势
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recent7DaysStatusLogs = await prisma.managedTaskStatusLog.findMany({
      where: {
        toStatus: ManagedTaskStatus.DONE,
        changedAt: {
          gte: sevenDaysAgo,
        },
      },
      include: {
        task: {
          select: {
            actualWorkdays: true,
          },
        },
      },
    });

    // 初始化 7 天映射
    const dailyHoursMap: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = formatLocalDate(date);
      dailyHoursMap[dateStr] = 0;
    }

    recent7DaysStatusLogs.forEach((log) => {
      const dateStr = formatLocalDate(log.changedAt);
      if (dailyHoursMap[dateStr] !== undefined) {
        dailyHoursMap[dateStr] += log.task.actualWorkdays || 0;
      }
    });

    // 格式化为数组（按时间正序）
    const dailyTrend = Object.entries(dailyHoursMap)
      .map(([date, hours]) => ({ date, hours }))
      .reverse();

    // 数据格式适配前端报表组件
    const formattedRecentLogs = recentLogs.map((log) => ({
      id: log.id,
      hours: log.task.actualWorkdays || 0,
      logDate: log.changedAt,
      description: `将任务状态由 [${log.fromStatus || "未知"}] 变更为 [${log.toStatus}]${log.note ? ` (${log.note})` : ""}`,
      user: { name: log.changedBy.name },
      task: {
        title: log.task.title,
        project: {
          name: log.task.productLineTeam.name,
          key: "WBS",
        },
      },
    }));

    return {
      success: true,
      data: {
        totalHours: totalWorkdays, // 实际总人天数，映射为前端 UI 的工时数
        projectDistribution,
        dailyTrend,
        recentLogs: formattedRecentLogs,
      },
    };
  } catch (error) {
    console.error("[getTimeLogsSummary] 获取报表摘要失败:", error);
    return { success: false, error: "获取报表摘要失败", data: null };
  }
}
