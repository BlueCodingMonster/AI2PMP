"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * 记录任务工时
 */
export async function addTimeLog(
  taskId: string,
  hours: number,
  logDate: string | Date,
  description?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  if (hours <= 0 || hours > 24) {
    return { success: false, error: "单次登记工时必须在 0 到 24 小时之间" };
  }

  try {
    const log = await prisma.timeLog.create({
      data: {
        taskId,
        userId: session.user.id,
        hours: Number(hours),
        description: description?.trim() || null,
        logDate: new Date(logDate),
      },
    });

    revalidatePath(`/tasks/${taskId}`);
    revalidatePath("/reports");
    return { success: true, data: log };
  } catch (error) {
    console.error("[addTimeLog] 登记工时失败:", error);
    return { success: false, error: "登记工时失败" };
  }
}

/**
 * 获取任务的所有工时登记记录
 */
export async function getTimeLogsForTask(taskId: string) {
  try {
    const logs = await prisma.timeLog.findMany({
      where: { taskId },
      orderBy: { logDate: "desc" },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
    return { success: true, data: logs };
  } catch (error) {
    console.error("[getTimeLogsForTask] 获取工时记录失败:", error);
    return { success: false, error: "获取工时记录失败", data: [] };
  }
}

/**
 * 获取报表统计摘要数据
 * 包含：项目工时分布、近7天工时走势、最近10条登账记录
 */
export async function getTimeLogsSummary() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "未登录，无权操作" };
    }

    // 1. 获取最近 10 条登账记录
    const recentLogs = await prisma.timeLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true } },
        task: {
          select: {
            title: true,
            project: { select: { name: true, key: true } },
          },
        },
      },
    });

    // 2. 项目工时分布统计 (按项目分组汇总工时)
    const logsWithProject = await prisma.timeLog.findMany({
      include: {
        task: {
          select: {
            project: { select: { id: true, name: true, key: true } },
          },
        },
      },
    });

    const projectHoursMap: Record<string, { name: string; key: string; hours: number }> = {};
    let totalHours = 0;

    logsWithProject.forEach((log) => {
      const proj = log.task.project;
      totalHours += log.hours;
      if (!projectHoursMap[proj.id]) {
        projectHoursMap[proj.id] = {
          name: proj.name,
          key: proj.key,
          hours: 0,
        };
      }
      projectHoursMap[proj.id].hours += log.hours;
    });

    const projectDistribution = Object.values(projectHoursMap);

    // 3. 近 7 天工时统计走势
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recent7DaysLogs = await prisma.timeLog.findMany({
      where: {
        logDate: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        hours: true,
        logDate: true,
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

    recent7DaysLogs.forEach((log) => {
      const dateStr = formatLocalDate(log.logDate);
      if (dailyHoursMap[dateStr] !== undefined) {
        dailyHoursMap[dateStr] += log.hours;
      }
    });

    // 格式化为数组（按时间正序）
    const dailyTrend = Object.entries(dailyHoursMap)
      .map(([date, hours]) => ({ date, hours }))
      .reverse();

    return {
      success: true,
      data: {
        totalHours,
        projectDistribution,
        dailyTrend,
        recentLogs,
      },
    };
  } catch (error) {
    console.error("[getTimeLogsSummary] 获取报表摘要失败:", error);
    return { success: false, error: "获取报表摘要失败" };
  }
}

// 格式化 YYYY-MM-DD
function formatLocalDate(date: Date) {
  const d = new Date(date);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${m}/${day}`; // 展示格式为 MM/DD
}
