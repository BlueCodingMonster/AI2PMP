"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ManagedTaskStatus } from "@prisma/client";

export type DimensionType = "week" | "month";

export interface MemberWorkhoursFilter {
  dimension: DimensionType;
  year: number;
  periodValue: number | "all"; // 周序号 (1..53) 或 月份 (1..12)，或 "all"
  teamId?: string;
  search?: string;
}

export interface Level1TaskDetail {
  id: string;
  sequenceNo: number;
  title: string;
  status: ManagedTaskStatus;
  sdlcNode: string | null;
  productLineTeamName: string;
  planStartDate: Date | null;
  planEndDate: Date | null;
  actualStartAt: Date | null;
  actualFinishAt: Date | null;
  progressPercent: number;
  // 该人员在此一级任务树下的个人计划与实际工时
  userPlannedWorkdays: number;
  userPlannedHours: number;
  userActualWorkdays: number;
  userActualHours: number;
  // 属于该人员直接执行的子任务清单（可选展开）
  subtasks: {
    id: string;
    sequenceNo: number;
    title: string;
    level: number;
    status: ManagedTaskStatus;
    plannedWorkdays: number;
    actualWorkdays: number;
  }[];
}

export interface MemberWorkhoursSummaryItem {
  user: {
    id: string;
    name: string;
    username: string;
    department: string | null;
    position: string | null;
    avatar: string | null;
  };
  teams: string[]; // 参与的项目/团队名称
  plannedWorkdays: number;
  plannedHours: number;
  actualWorkdays: number;
  actualHours: number;
  varianceHours: number; // 实际 - 计划
  variancePercent: number; // 偏差百分比 %
  level1TaskCount: number;
  level1Tasks: Level1TaskDetail[];
}

/**
 * 计算 ISO 周的起始与结束时间 (周一 00:00:00 ~ 周日 23:59:59)
 */
function getWeekDateRange(year: number, weekNumber: number) {
  const simple = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = simple.getUTCDay() || 7;
  simple.setUTCDate(simple.getUTCDate() - dayOfWeek + 1);
  const weekStart = new Date(simple);
  weekStart.setUTCDate(simple.getUTCDate() + (weekNumber - 1) * 7);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  return { startDate: weekStart, endDate: weekEnd };
}

/**
 * 计算月份的起始与结束时间 (1号 00:00:00 ~ 月末 23:59:59)
 */
function getMonthDateRange(year: number, monthNumber: number) {
  const startDate = new Date(Date.UTC(year, monthNumber - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59, 999));
  return { startDate, endDate };
}

/**
 * 获取某日期的 ISO 周序号
 */
export async function getISOWeekNumberServer(date: Date): Promise<{ year: number; week: number }> {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const week = 1 + Math.round((firstThursday - target.valueOf()) / 604800000);
  return { year: target.getFullYear(), week };
}

/**
 * 获取人员工时统计列表与明细
 */
export async function getMemberWorkhoursStats(filter: MemberWorkhoursFilter) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "未登录，无权操作" };
    }

    const { dimension, year, periodValue, teamId, search } = filter;

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (periodValue !== "all") {
      if (dimension === "week") {
        const range = getWeekDateRange(year, Number(periodValue));
        startDate = range.startDate;
        endDate = range.endDate;
      } else {
        const range = getMonthDateRange(year, Number(periodValue));
        startDate = range.startDate;
        endDate = range.endDate;
      }
    }

    // 1. 查询所有符合条件的用户
    const userWhere: any = {
      isActive: true,
    };

    if (search && search.trim()) {
      userWhere.OR = [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { username: { contains: search.trim(), mode: "insensitive" } },
        { department: { contains: search.trim(), mode: "insensitive" } },
        { position: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        username: true,
        department: true,
        position: true,
        avatar: true,
      },
      orderBy: { name: "asc" },
    });

    // 2. 查询系统中的任务列表（用于关联和向上追溯一级任务）
    const taskWhere: any = {};
    if (teamId && teamId !== "all") {
      taskWhere.productLineTeamId = teamId;
    }

    // 如果指定了日期范围，拉取在该范围内的任务
    if (startDate && endDate) {
      taskWhere.OR = [
        {
          // 计划时间重叠
          planStartDate: { lte: endDate },
          planEndDate: { gte: startDate },
        },
        {
          // 实际时间重叠
          actualStartAt: { lte: endDate },
          actualFinishAt: { gte: startDate },
        },
        {
          // 只有单边日期落在范围内的备选
          AND: [
            { planStartDate: null },
            { planEndDate: null },
            { createdAt: { gte: startDate, lte: endDate } },
          ],
        },
      ];
    }

    const allTasks = await prisma.managedTask.findMany({
      where: taskWhere,
      include: {
        executor: {
          select: { id: true, name: true, username: true },
        },
        productLineTeam: {
          select: { id: true, name: true },
        },
        parent: {
          select: { id: true, title: true, level: true, parentId: true },
        },
      },
    });

    // 3. 构建任务 ID 映射字典与一级任务追溯表
    const taskMap = new Map<string, typeof allTasks[0]>();
    allTasks.forEach((t) => taskMap.set(t.id, t));

    // 全量或团队对应的一级任务记录
    const level1Tasks = await prisma.managedTask.findMany({
      where: {
        level: 1,
        ...(teamId && teamId !== "all" ? { productLineTeamId: teamId } : {}),
      },
      include: {
        productLineTeam: { select: { id: true, name: true } },
      },
    });
    const level1Map = new Map<string, typeof level1Tasks[0]>();
    level1Tasks.forEach((l1) => level1Map.set(l1.id, l1));

    // 向上寻找顶层 Level 1 Task 的辅助函数
    const findRootLevel1Task = (taskId: string): typeof level1Tasks[0] | null => {
      let current = taskMap.get(taskId);
      while (current) {
        if (current.level === 1) {
          return level1Map.get(current.id) || (current as any);
        }
        if (!current.parentId) break;
        current = taskMap.get(current.parentId);
      }
      return null;
    };

    // 4. 按用户汇总数据
    const userSummaryList: MemberWorkhoursSummaryItem[] = [];

    for (const u of users) {
      // 找出 executor 是当前用户的任务
      const userTasks = allTasks.filter((t) => t.executorId === u.id);

      let totalPlannedWorkdays = 0;
      let totalActualWorkdays = 0;
      const teamNamesSet = new Set<string>();

      // 按一级任务分组统计当前用户在该一级任务下的工时
      const level1TaskMap = new Map<
        string,
        {
          l1Task: any;
          plannedWorkdays: number;
          actualWorkdays: number;
          subtasks: any[];
        }
      >();

      for (const t of userTasks) {
        if (t.productLineTeam?.name) {
          teamNamesSet.add(t.productLineTeam.name);
        }

        totalPlannedWorkdays += t.plannedWorkdays || 0;
        totalActualWorkdays += t.actualWorkdays || 0;

        // 追溯该任务所属的一级任务
        let rootL1: any = null;
        if (t.level === 1) {
          rootL1 = t;
        } else {
          rootL1 = findRootLevel1Task(t.id);
        }

        if (!rootL1) {
          rootL1 = {
            id: t.id,
            sequenceNo: t.sequenceNo,
            title: t.title,
            status: t.status,
            sdlcNode: t.sdlcNode,
            productLineTeam: t.productLineTeam,
            planStartDate: t.planStartDate,
            planEndDate: t.planEndDate,
            actualStartAt: t.actualStartAt,
            actualFinishAt: t.actualFinishAt,
            progressPercent: t.progressPercent,
          };
        }

        const l1Id = rootL1.id;
        if (!level1TaskMap.has(l1Id)) {
          level1TaskMap.set(l1Id, {
            l1Task: rootL1,
            plannedWorkdays: 0,
            actualWorkdays: 0,
            subtasks: [],
          });
        }

        const entry = level1TaskMap.get(l1Id)!;
        entry.plannedWorkdays += t.plannedWorkdays || 0;
        entry.actualWorkdays += t.actualWorkdays || 0;
        entry.subtasks.push({
          id: t.id,
          sequenceNo: t.sequenceNo,
          title: t.title,
          level: t.level,
          status: t.status,
          plannedWorkdays: t.plannedWorkdays || 0,
          actualWorkdays: t.actualWorkdays || 0,
        });
      }

      // 构建该用户参与的一级任务列表明细
      const level1TaskDetails: Level1TaskDetail[] = Array.from(
        level1TaskMap.values()
      ).map((item) => {
        const l1 = item.l1Task;
        return {
          id: l1.id,
          sequenceNo: l1.sequenceNo,
          title: l1.title,
          status: l1.status,
          sdlcNode: l1.sdlcNode || null,
          productLineTeamName: l1.productLineTeam?.name || "未指定团队",
          planStartDate: l1.planStartDate ? new Date(l1.planStartDate) : null,
          planEndDate: l1.planEndDate ? new Date(l1.planEndDate) : null,
          actualStartAt: l1.actualStartAt ? new Date(l1.actualStartAt) : null,
          actualFinishAt: l1.actualFinishAt ? new Date(l1.actualFinishAt) : null,
          progressPercent: l1.progressPercent || 0,
          userPlannedWorkdays: Number(item.plannedWorkdays.toFixed(1)),
          userPlannedHours: Number((item.plannedWorkdays * 8).toFixed(1)),
          userActualWorkdays: Number(item.actualWorkdays.toFixed(1)),
          userActualHours: Number((item.actualWorkdays * 8).toFixed(1)),
          subtasks: item.subtasks,
        };
      });

      const plannedHours = Number((totalPlannedWorkdays * 8).toFixed(1));
      const actualHours = Number((totalActualWorkdays * 8).toFixed(1));
      const varianceHours = Number((actualHours - plannedHours).toFixed(1));
      const variancePercent =
        plannedHours > 0
          ? Number((((actualHours - plannedHours) / plannedHours) * 100).toFixed(1))
          : 0;

      // 如果有团队或有任务工时，或用户被搜索筛选，输出统计卡片
      if (userTasks.length > 0 || search || userSummaryList.length === 0) {
        userSummaryList.push({
          user: {
            id: u.id,
            name: u.name,
            username: u.username,
            department: u.department,
            position: u.position,
            avatar: u.avatar,
          },
          teams: Array.from(teamNamesSet),
          plannedWorkdays: Number(totalPlannedWorkdays.toFixed(1)),
          plannedHours,
          actualWorkdays: Number(totalActualWorkdays.toFixed(1)),
          actualHours,
          varianceHours,
          variancePercent,
          level1TaskCount: level1TaskDetails.length,
          level1Tasks: level1TaskDetails,
        });
      }
    }

    // 5. 总体指标计算
    const totalMembers = userSummaryList.length;
    const teamTotalPlannedHours = Number(
      userSummaryList.reduce((acc, cur) => acc + cur.plannedHours, 0).toFixed(1)
    );
    const teamTotalActualHours = Number(
      userSummaryList.reduce((acc, cur) => acc + cur.actualHours, 0).toFixed(1)
    );
    const teamTotalVarianceHours = Number(
      (teamTotalActualHours - teamTotalPlannedHours).toFixed(1)
    );

    // 获取所有产品线团队，供前端下拉框使用
    const teams = await prisma.productLineTeam.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      data: {
        summary: {
          totalMembers,
          teamTotalPlannedHours,
          teamTotalActualHours,
          teamTotalVarianceHours,
        },
        members: userSummaryList,
        teams,
      },
    };
  } catch (error) {
    console.error("[getMemberWorkhoursStats] 获取人员工时统计失败:", error);
    return { success: false, error: "获取人员工时统计数据失败", data: null };
  }
}
