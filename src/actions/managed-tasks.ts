"use server";

import {
  ManagedTaskCategory,
  ManagedTaskStatus,
  ManagedTaskVersionType,
  Prisma,
  ProductLineRole,
  WorkCalendarDayType,
  WorkCalendarStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/actions/audit-logs";
import {
  managedTaskSchema,
  workCalendarSchema,
  type ManagedTaskInput,
  type WorkCalendarInput,
} from "@/lib/validations/managed-tasks";

const taskInclude = {
  parent: { select: { id: true, title: true, level: true, category: true, productLineTeamId: true, createdById: true } },
  children: { select: { id: true } },
  productLineTeam: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  executor: { select: { id: true, name: true, position: true } },
  productVersion: { include: { product: true } },
  projectVersion: { include: { project: true } },
  monthlyPlan: { select: { id: true, year: true, month: true, productLineTeam: { select: { name: true } } } },
} satisfies Prisma.ManagedTaskInclude;

type SessionUser = { id: string; isAdmin: boolean };
type TaskWithParent = Prisma.ManagedTaskGetPayload<{ include: { parent: true; children: { select: { id: true } }; productLineTeam: true } }>;

const clean = (value?: string | null) => value?.trim() || null;

// 系统固定使用东八区（Asia/Shanghai），所有无时区的日期字符串都按 +08:00 解析
const SYSTEM_TZ_OFFSET = "+08:00";

const toDate = (value?: string | null, isEnd: boolean = false) => {
  if (!value) return null;
  // If it's already an ISO string with timezone (contains Z or +/- offset)
  if (value.includes("Z") || /[+-]\d{2}:\d{2}$/.test(value)) {
    return new Date(value);
  }
  // Contains "T" but no timezone → append system timezone
  if (value.includes("T")) {
    return new Date(`${value}${SYSTEM_TZ_OFFSET}`);
  }
  // Space format like "2026-07-23 08:30"
  if (value.includes(" ")) {
    return new Date(`${value.replace(" ", "T")}${SYSTEM_TZ_OFFSET}`);
  }
  // Date-only string like "2026-07-23" → 开始时间 08:00，结束时间 18:00（东八区工作时间）
  if (isEnd) {
    return new Date(`${value}T18:00:00${SYSTEM_TZ_OFFSET}`);
  } else {
    return new Date(`${value}T08:00:00${SYSTEM_TZ_OFFSET}`);
  }
};

type TimeWindow = { start: string; end: string };

function parseWindows(jsonStr: string | null | undefined): TimeWindow[] | null {
  if (!jsonStr) return null;
  try {
    const val = JSON.parse(jsonStr);
    if (Array.isArray(val)) {
      return val as TimeWindow[];
    }
  } catch (e) {}
  return null;
}

type SeasonalRule = {
  name: string;
  startMMDD: string;
  endMMDD: string;
  windows: TimeWindow[];
};

function resolveWorkWindowsForDay(date: Date, calendarYear: any, calendarDay?: any): TimeWindow[] {
  if (calendarDay && calendarDay.workWindows) {
    const dayWindows = parseWindows(calendarDay.workWindows);
    if (dayWindows) return dayWindows;
  }

  if (calendarYear && calendarYear.workWindows) {
    try {
      const config = JSON.parse(calendarYear.workWindows);
      if (Array.isArray(config)) {
        if (config.length > 0) {
          if ('startMMDD' in config[0]) {
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const dd = String(date.getDate()).padStart(2, "0");
            const mmdd = `${mm}-${dd}`;

            for (const rule of config as SeasonalRule[]) {
              if (rule.startMMDD > rule.endMMDD) {
                if (mmdd >= rule.startMMDD || mmdd <= rule.endMMDD) {
                  return rule.windows;
                }
              } else {
                if (mmdd >= rule.startMMDD && mmdd <= rule.endMMDD) {
                  return rule.windows;
                }
              }
            }
          } else {
            return config as TimeWindow[];
          }
        }
      }
    } catch (e) {}
  }

  return [
    { start: "08:00", end: "12:00" },
    { start: "13:00", end: "17:00" }
  ];
}

export async function calculateWorkdays(startDate: Date | null, endDate: Date | null, teamId: string): Promise<number> {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > end) return 0;

  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) {
    years.push(y);
  }

  const calendars = await prisma.workCalendarYear.findMany({
    where: {
      year: { in: years },
      OR: [
        { productLineTeamId: teamId },
        { productLineTeamId: null }
      ]
    },
    include: { days: true },
    orderBy: [
      { status: "desc" },
      { updatedAt: "desc" }
    ]
  });

  const overrideMap = new Map<string, { type: string; workWindows: string | null; standardHours: number | null }>();
  const yearCalendarMap = new Map<number, any>();

  for (const year of years) {
    const yearCals = calendars.filter((c) => c.year === year);
    const teamCal = yearCals.find((c) => c.productLineTeamId === teamId);
    const globalCal = yearCals.find((c) => c.productLineTeamId === null);
    
    const activeCal = teamCal || globalCal;
    if (activeCal) {
      yearCalendarMap.set(year, activeCal);
      activeCal.days.forEach((d) => {
        const key = d.date.toISOString().split("T")[0];
        overrideMap.set(key, {
          type: d.type,
          workWindows: d.workWindows,
          standardHours: d.standardHours
        });
      });
    }
  }

  let totalMs = 0;
  
  const current = new Date(start);
  const iterDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const iterEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (iterDate <= iterEnd) {
    const year = iterDate.getFullYear();
    const month = String(iterDate.getMonth() + 1).padStart(2, "0");
    const dayDate = String(iterDate.getDate()).padStart(2, "0");
    const key = `${year}-${month}-${dayDate}`;

    const override = overrideMap.get(key);
    const isWorkday = override
      ? (override.type === WorkCalendarDayType.REGULAR_WORKDAY ||
         override.type === WorkCalendarDayType.ADJUSTED_WORKDAY ||
         override.type === WorkCalendarDayType.SPECIAL_WORKDAY)
      : (iterDate.getDay() !== 0 && iterDate.getDay() !== 6);

    if (isWorkday) {
      const activeCal = yearCalendarMap.get(year);
      const calendarDay = activeCal ? activeCal.days.find((d: any) => d.date.toISOString().split("T")[0] === key) : null;
      const windows = resolveWorkWindowsForDay(iterDate, activeCal, calendarDay);
      
      for (const win of windows) {
        const [sh, sm] = win.start.split(":").map(Number);
        const [eh, em] = win.end.split(":").map(Number);

        const winStart = new Date(iterDate);
        winStart.setHours(sh, sm, 0, 0);

        const winEnd = new Date(iterDate);
        winEnd.setHours(eh, em, 0, 0);

        const overlapStart = Math.max(start.getTime(), winStart.getTime());
        const overlapEnd = Math.min(end.getTime(), winEnd.getTime());

        if (overlapStart < overlapEnd) {
          totalMs += overlapEnd - overlapStart;
        }
      }
    }

    iterDate.setDate(iterDate.getDate() + 1);
  }

  const defaultYearCal = yearCalendarMap.get(startYear) || yearCalendarMap.get(endYear);
  const standardHours = defaultYearCal ? defaultYearCal.standardHours : 8;

  const totalHours = totalMs / 3600000;
  const rawWorkdays = totalHours / standardHours;
  
  return Math.round(rawWorkdays * 10) / 10;
}

async function calculateLeafWorkdays(
  planStartDate: Date | null,
  planEndDate: Date | null,
  actualStartAt: Date | null,
  actualFinishAt: Date | null,
  teamId: string
) {
  const plannedWorkdays = await calculateWorkdays(planStartDate, planEndDate, teamId);
  let actualWorkdays = 0;
  if (actualStartAt) {
    const end = actualFinishAt || new Date();
    actualWorkdays = await calculateWorkdays(actualStartAt, end, teamId);
  }
  return { plannedWorkdays, actualWorkdays };
}

async function currentUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("未登录，无法操作");
  return { id: session.user.id, isAdmin: Boolean(session.user.isAdmin) };
}

async function inferTeamIdFromAssociation(data: ManagedTaskInput) {
  if (data.monthlyPlanId) {
    const plan = await prisma.monthlyPlan.findUnique({ where: { id: data.monthlyPlanId }, select: { productLineTeamId: true } });
    if (plan?.productLineTeamId) return plan.productLineTeamId;
  }
  if (data.versionType === ManagedTaskVersionType.PROJECT && data.versionId) {
    const version = await prisma.projectVersion.findUnique({
      where: { id: data.versionId },
      select: { project: { select: { productLineTeamId: true } } },
    });
    if (version?.project.productLineTeamId) return version.project.productLineTeamId;
  }
  if (data.versionType === ManagedTaskVersionType.PRODUCT && data.versionId) {
    const version = await prisma.productVersion.findUnique({
      where: { id: data.versionId },
      select: { product: { select: { productLineTeams: { select: { id: true } } } } },
    });
    const teams = version?.product.productLineTeams ?? [];
    if (teams.length === 1) return teams[0].id;
    if (teams.length > 1) throw new Error("该产品版本关联多个产品线小组，当前用户也没有固定所属小组，无法自动确定任务小组");
  }
  return null;
}

async function getCreatorTeamId(userId: string, data: ManagedTaskInput) {
  const memberships = await prisma.productLineMember.findMany({
    where: { userId },
    orderBy: { joinedAt: "asc" },
    select: { teamId: true },
  });
  if (memberships.length === 0) {
    const inferredTeamId = await inferTeamIdFromAssociation(data);
    if (inferredTeamId) return inferredTeamId;
    throw new Error("当前用户没有固定所属小组，且无法从关联月度事项或版本推导任务小组，请先完善人员所属小组或选择有关联小组的事项/版本");
  }
  if (memberships.length > 1) throw new Error("当前用户存在多个固定所属小组，请先明确唯一所属小组后再创建一级任务");
  return memberships[0].teamId;
}

async function getTaskRoot(taskId: string) {
  let task: TaskWithParent | null = await prisma.managedTask.findUnique({ where: { id: taskId }, include: { parent: true, children: { select: { id: true } }, productLineTeam: true } });
  if (!task) return null;
  while (task.parentId) {
    const parent: TaskWithParent | null = await prisma.managedTask.findUnique({ where: { id: task.parentId }, include: { parent: true, children: { select: { id: true } }, productLineTeam: true } });
    if (!parent) break;
    task = parent;
  }
  return task;
}

async function canManageTask(task: { id: string; productLineTeamId: string; createdById: string }, user: SessionUser) {
  if (user.isAdmin) return true;
  const root = await getTaskRoot(task.id);
  if (root?.createdById === user.id) return true;
  const leader = await prisma.productLineMember.findFirst({
    where: { teamId: task.productLineTeamId, userId: user.id, role: ProductLineRole.LEADER },
    select: { id: true },
  });
  return Boolean(leader);
}

async function assertCanManageTask(task: { id: string; productLineTeamId: string; createdById: string }, user: SessionUser) {
  if (!(await canManageTask(task, user))) throw new Error("无权维护该任务");
}

function getVersionData(data: ManagedTaskInput) {
  return {
    versionType: data.versionType ?? null,
    productVersionId: data.versionType === ManagedTaskVersionType.PRODUCT ? data.versionId || null : null,
    projectVersionId: data.versionType === ManagedTaskVersionType.PROJECT ? data.versionId || null : null,
  };
}

function leafData(data: ManagedTaskInput) {
  const status = data.executorId ? data.status : ManagedTaskStatus.UNSCHEDULED;
  const actualStartAt = toDate(data.actualStartAt, false) ?? (status === ManagedTaskStatus.IN_PROGRESS ? new Date() : null);
  const actualFinishAt = toDate(data.actualFinishAt, true) ?? (status === ManagedTaskStatus.DONE ? new Date() : null);
  return {
    title: data.title,
    description: clean(data.description),
    sdlcNode: data.sdlcNode ?? null,
    status,
    planStartDate: toDate(data.planStartDate, false),
    planEndDate: toDate(data.planEndDate, true),
    plannedWorkdays: data.plannedWorkdays,
    progressPercent: data.executorId ? data.progressPercent : 0,
    actualStartAt,
    actualFinishAt,
    executorId: data.executorId || null,
    monthlyPlanId: data.monthlyPlanId || null,
    monthlyItemType: data.monthlyItemType ?? null,
    monthlyItemId: data.monthlyItemId || null,
    notes: clean(data.notes),
    ...getVersionData(data),
  };
}

async function rollupTask(taskId: string): Promise<void> {
  const parentTask = await prisma.managedTask.findUnique({
    where: { id: taskId },
    select: { productLineTeamId: true },
  });
  if (!parentTask) return;
  const teamId = parentTask.productLineTeamId;

  const children = await prisma.managedTask.findMany({
    where: { parentId: taskId },
    include: { children: { select: { id: true } } },
  });
  if (children.length === 0) return;

  const effective = children.filter((child) => child.status !== ManagedTaskStatus.CANCELLED);
  const totalWork = effective.reduce((sum, child) => sum + child.plannedWorkdays, 0);
  const weighted = effective.reduce((sum, child) => sum + child.progressPercent * child.plannedWorkdays, 0);
  const hasIncompleteSchedule = effective.some((child) => !child.planStartDate || !child.planEndDate);
  const hasUnassignedLeaf = effective.some((child) => child.children.length === 0 && !child.executorId);

  let status: ManagedTaskStatus = ManagedTaskStatus.TODO;
  if (hasIncompleteSchedule || hasUnassignedLeaf) status = ManagedTaskStatus.UNSCHEDULED;
  else if (effective.length === 0 && children.every((child) => child.status === ManagedTaskStatus.CANCELLED)) status = ManagedTaskStatus.CANCELLED;
  else if (effective.length > 0 && effective.every((child) => child.status === ManagedTaskStatus.DONE)) status = ManagedTaskStatus.DONE;
  else if (effective.some((child) => child.status === ManagedTaskStatus.IN_PROGRESS)) status = ManagedTaskStatus.IN_PROGRESS;
  else if (effective.some((child) => child.status === ManagedTaskStatus.PAUSED)) status = ManagedTaskStatus.PAUSED;

  const planStartDate = hasIncompleteSchedule ? null : new Date(Math.min(...effective.map((child) => child.planStartDate!.getTime())));
  const planEndDate = hasIncompleteSchedule ? null : new Date(Math.max(...effective.map((child) => child.planEndDate!.getTime())));
  const plannedWorkdays = planStartDate && planEndDate ? await calculateWorkdays(planStartDate, planEndDate, teamId) : 0;

  const actualStartAt = effective.some((child) => child.actualStartAt) ? new Date(Math.min(...effective.filter((child) => child.actualStartAt).map((child) => child.actualStartAt!.getTime()))) : null;
  const actualFinishAt = effective.length > 0 && effective.every((child) => child.actualFinishAt) ? new Date(Math.max(...effective.map((child) => child.actualFinishAt!.getTime()))) : null;
  
  let actualWorkdays = 0;
  if (actualStartAt) {
    const end = actualFinishAt || new Date();
    actualWorkdays = await calculateWorkdays(actualStartAt, end, teamId);
  }

  await prisma.managedTask.update({
    where: { id: taskId },
    data: {
      status,
      executorId: null,
      planStartDate,
      planEndDate,
      plannedWorkdays,
      actualWorkdays,
      progressPercent: totalWork ? Math.round(weighted / totalWork) : 0,
      actualStartAt,
      actualFinishAt,
    },
  });
}

async function rollupAncestors(taskId: string | null) {
  let currentId = taskId;
  while (currentId) {
    await rollupTask(currentId);
    const task = await prisma.managedTask.findUnique({ where: { id: currentId }, select: { parentId: true } });
    currentId = task?.parentId ?? null;
  }
}

export async function getManagedTaskContext() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, position: true, level: true },
  });
  const teams = await prisma.productLineTeam.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, members: { select: { userId: true, role: true } } },
  });
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: { name: true, versions: { orderBy: { version: "desc" }, select: { id: true, version: true } } },
  });
  const projects = await prisma.project.findMany({
    orderBy: { name: "asc" },
    select: { name: true, versions: { orderBy: { version: "desc" }, select: { id: true, version: true } } },
  });
  const monthlyPlans = await prisma.monthlyPlan.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 24,
    select: {
      id: true,
      year: true,
      month: true,
      productLineTeam: { select: { id: true, name: true } },
      productDeliveries: { orderBy: { sortOrder: "asc" }, select: { id: true, moduleVersion: true, deliveryContent: true } },
      projectDeliveries: { orderBy: { sortOrder: "asc" }, select: { id: true, projectName: true, deliveryContent: true } },
      marketActions: { orderBy: { sortOrder: "asc" }, select: { id: true, productOrProject: true, marketAction: true } },
      costOptimizations: { orderBy: { sortOrder: "asc" }, select: { id: true, optimizationItem: true, currentProblem: true } },
      aiProductEnablements: { orderBy: { sortOrder: "asc" }, select: { id: true, item: true, outputResult: true } },
      aiEfficiencies: { orderBy: { sortOrder: "asc" }, select: { id: true, item: true, outputResult: true } },
      risks: { orderBy: { sortOrder: "asc" }, select: { id: true, riskItem: true } },
      resourceRequests: { orderBy: { sortOrder: "asc" }, select: { id: true, content: true } },
    },
  });

  const monthlyItems = monthlyPlans.flatMap((plan) => {
    const prefix = `${plan.productLineTeam.name} / ${plan.year}-${String(plan.month).padStart(2, "0")}`;
    const teamId = plan.productLineTeam.id;
    return [
      ...plan.productDeliveries.map((item) => ({ teamId, planId: plan.id, itemType: "PRODUCT_DELIVERY", itemId: item.id, label: `${prefix} / 产品交付 / ${item.moduleVersion || item.deliveryContent || "未命名事项"}` })),
      ...plan.projectDeliveries.map((item) => ({ teamId, planId: plan.id, itemType: "PROJECT_DELIVERY", itemId: item.id, label: `${prefix} / 项目交付 / ${item.projectName || item.deliveryContent || "未命名事项"}` })),
      ...plan.marketActions.map((item) => ({ teamId, planId: plan.id, itemType: "MARKET_ACTION", itemId: item.id, label: `${prefix} / 市场动作 / ${item.productOrProject || item.marketAction || "未命名事项"}` })),
      ...plan.costOptimizations.map((item) => ({ teamId, planId: plan.id, itemType: "COST_OPTIMIZATION", itemId: item.id, label: `${prefix} / 成本优化 / ${item.optimizationItem || item.currentProblem || "未命名事项"}` })),
      ...plan.aiProductEnablements.map((item) => ({ teamId, planId: plan.id, itemType: "AI_PRODUCT_ENABLEMENT", itemId: item.id, label: `${prefix} / AI产品赋能 / ${item.item || item.outputResult || "未命名事项"}` })),
      ...plan.aiEfficiencies.map((item) => ({ teamId, planId: plan.id, itemType: "AI_EFFICIENCY", itemId: item.id, label: `${prefix} / AI提效 / ${item.item || item.outputResult || "未命名事项"}` })),
      ...plan.risks.map((item) => ({ teamId, planId: plan.id, itemType: "RISK", itemId: item.id, label: `${prefix} / 风险 / ${item.riskItem || "未命名事项"}` })),
      ...plan.resourceRequests.map((item) => ({ teamId, planId: plan.id, itemType: "RESOURCE_REQUEST", itemId: item.id, label: `${prefix} / 资源需求 / ${item.content || "未命名事项"}` })),
    ];
  });

  return {
    users,
    teams,
    versions: {
      products: products.flatMap((product) => product.versions.map((version) => ({ id: version.id, label: `${product.name} / ${version.version}` }))),
      projects: projects.flatMap((project) => project.versions.map((version) => ({ id: version.id, label: `${project.name} / ${version.version}` }))),
    },
    monthlyItems,
  };
}

export async function getManagedTasks() {
  const tasks = await prisma.managedTask.findMany({
    include: taskInclude,
    orderBy: [
      { productLineTeam: { name: "asc" } },
      { planStartDate: "asc" },
      { sequenceNo: "asc" },
    ],
  });
  const calendars = await prisma.workCalendarYear.findMany({ include: { days: { orderBy: { date: "asc" } } }, orderBy: [{ year: "desc" }, { updatedAt: "desc" }] });
  return { tasks, calendars };
}

export async function createManagedTask(input: ManagedTaskInput) {
  try {
    const user = await currentUser();
    const parsed = managedTaskSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "任务数据校验失败" };
    const data = parsed.data;

    const parent = data.parentId ? await prisma.managedTask.findUnique({ where: { id: data.parentId }, include: { children: true } }) : null;
    if (data.parentId && !parent) return { success: false, error: "上级任务不存在" };
    if (parent) await assertCanManageTask(parent, user);
    if (parent && parent.level >= 3) return { success: false, error: "任务最多只能拆分三级" };

    if (parent && parent.children.length === 0) {
      const hasParentExecutionData = Boolean(
        parent.executorId ||
        parent.actualStartAt ||
        parent.actualFinishAt ||
        parent.status === ManagedTaskStatus.DONE ||
        parent.status === ManagedTaskStatus.IN_PROGRESS
      );
      if (hasParentExecutionData) {
        if (!data.executorId && parent.executorId) data.executorId = parent.executorId;
        if (!data.actualStartAt && parent.actualStartAt) data.actualStartAt = parent.actualStartAt.toISOString();
        if (!data.actualFinishAt && parent.actualFinishAt) data.actualFinishAt = parent.actualFinishAt.toISOString();
        if (!data.planStartDate && parent.planStartDate) data.planStartDate = parent.planStartDate.toISOString();
        if (!data.planEndDate && parent.planEndDate) data.planEndDate = parent.planEndDate.toISOString();
        if (data.status === ManagedTaskStatus.UNSCHEDULED && parent.status !== ManagedTaskStatus.UNSCHEDULED && data.executorId) {
          data.status = parent.status;
        }
        if (data.progressPercent === 0 && parent.progressPercent > 0) data.progressPercent = parent.progressPercent;
        if (!data.monthlyPlanId && parent.monthlyPlanId) {
          data.monthlyPlanId = parent.monthlyPlanId;
          data.monthlyItemType = parent.monthlyItemType;
          data.monthlyItemId = parent.monthlyItemId;
        }
        if (!data.versionType && parent.versionType) {
          data.versionType = parent.versionType;
          data.versionId = parent.productVersionId || parent.projectVersionId || undefined;
        }
      }
    }

    if (!data.executorId) {
      if (data.status !== ManagedTaskStatus.UNSCHEDULED) return { success: false, error: "未分配执行人的叶子任务只能保持待排期" };
      if (data.progressPercent !== 0) return { success: false, error: "未分配执行人的叶子任务进度必须为0" };
    }

    const level = parent ? parent.level + 1 : 1;
    const productLineTeamId = parent ? parent.productLineTeamId : await getCreatorTeamId(user.id, data);
    if (!parent && !data.category) return { success: false, error: "一级任务必须选择任务分类" };
    const category = parent ? parent.category : data.category;
    if (level !== 2 || category !== ManagedTaskCategory.DEVELOPMENT) data.sdlcNode = null;

    const baseData = leafData(data);
    const { plannedWorkdays, actualWorkdays } = await calculateLeafWorkdays(
      baseData.planStartDate,
      baseData.planEndDate,
      baseData.actualStartAt,
      baseData.actualFinishAt,
      productLineTeamId
    );

    const task = await prisma.managedTask.create({
      data: {
        ...baseData,
        plannedWorkdays,
        actualWorkdays,
        level,
        category,
        productLineTeamId,
        parentId: parent?.id ?? null,
        createdById: user.id,
      },
      include: taskInclude,
    });
    await recordAuditLog("CREATE", "WBS", `创建了 WBS 任务：${task.title}`);
    if (parent) {
      await prisma.managedTask.update({ where: { id: parent.id }, data: { executorId: null } });
      await rollupAncestors(parent.id);
    }
    revalidatePath("/managed-tasks");
    return { success: true, data: task };
  } catch (error) {
    console.error("[createManagedTask]", error);
    return { success: false, error: error instanceof Error ? error.message : "创建任务失败" };
  }
}

export async function updateManagedTask(id: string, input: ManagedTaskInput) {
  try {
    const user = await currentUser();
    const parsed = managedTaskSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "任务数据校验失败" };
    const data = parsed.data;
    const existing = await prisma.managedTask.findUnique({ where: { id }, include: { children: { select: { id: true } } } });
    if (!existing) return { success: false, error: "任务不存在" };
    const isLeaf = existing.children.length === 0;

    if (isLeaf && !data.executorId) {
      if (data.status !== ManagedTaskStatus.UNSCHEDULED) return { success: false, error: "未分配执行人的叶子任务只能保持待排期" };
      if (data.progressPercent !== 0) return { success: false, error: "未分配执行人的叶子任务进度必须为0" };
    }
    const isManager = await canManageTask(existing, user);
    const isExecutor = isLeaf && existing.executorId === user.id;
    if (!isManager && !isExecutor) return { success: false, error: "无权维护该任务" };

    const beforeStatus = existing.status;
    let updateData: Prisma.ManagedTaskUpdateInput;
    if (!isLeaf) {
      if (!isManager) return { success: false, error: "父任务由子任务自动滚动，不能由执行人修改" };
      updateData = {
        title: data.title,
        description: clean(data.description),
        notes: clean(data.notes),
        sdlcNode: data.sdlcNode ?? null,
        ...(existing.parentId === null
          ? {
              monthlyPlanId: data.monthlyPlanId || null,
              monthlyItemType: data.monthlyItemType ?? null,
              monthlyItemId: data.monthlyItemId || null,
              ...getVersionData(data),
            }
          : {}),
      };
    } else if (isExecutor && !isManager) {
      const status = data.executorId ? data.status : ManagedTaskStatus.UNSCHEDULED;
      const actualStartAt = toDate(data.actualStartAt) ?? existing.actualStartAt ?? (data.status === ManagedTaskStatus.IN_PROGRESS ? new Date() : null);
      const actualFinishAt = data.status === ManagedTaskStatus.DONE ? (toDate(data.actualFinishAt) ?? existing.actualFinishAt ?? new Date()) : toDate(data.actualFinishAt);
      
      const { plannedWorkdays, actualWorkdays } = await calculateLeafWorkdays(
        existing.planStartDate,
        existing.planEndDate,
        actualStartAt,
        actualFinishAt,
        existing.productLineTeamId
      );

      updateData = {
        status,
        progressPercent: data.executorId ? data.progressPercent : 0,
        actualStartAt,
        actualFinishAt,
        plannedWorkdays,
        actualWorkdays,
      };
    } else {
      const baseData = leafData(data);
      if (existing.status !== ManagedTaskStatus.IN_PROGRESS && data.status === ManagedTaskStatus.IN_PROGRESS && !toDate(data.actualStartAt)) baseData.actualStartAt = existing.actualStartAt ?? new Date();
      if (existing.status !== ManagedTaskStatus.DONE && data.status === ManagedTaskStatus.DONE && !toDate(data.actualFinishAt)) baseData.actualFinishAt = existing.actualFinishAt ?? new Date();
      if (existing.status === ManagedTaskStatus.DONE && data.status !== ManagedTaskStatus.DONE && !toDate(data.actualFinishAt)) baseData.actualFinishAt = null;

      const { plannedWorkdays, actualWorkdays } = await calculateLeafWorkdays(
        baseData.planStartDate,
        baseData.planEndDate,
        baseData.actualStartAt,
        baseData.actualFinishAt,
        existing.productLineTeamId
      );

      updateData = {
        ...baseData,
        plannedWorkdays,
        actualWorkdays,
      };
    }

    const updated = await prisma.managedTask.update({ where: { id }, data: updateData });
    if (beforeStatus !== updated.status) {
      await prisma.managedTaskStatusLog.create({ data: { taskId: id, fromStatus: beforeStatus, toStatus: updated.status, changedById: user.id } });
    }
    await recordAuditLog("UPDATE", "WBS", `修改了 WBS 任务：${updated.title}，状态：[${beforeStatus}] -> [${updated.status}]`);
    await rollupAncestors(updated.parentId);
    revalidatePath("/managed-tasks");
    return { success: true, data: updated };
  } catch (error) {
    console.error("[updateManagedTask]", error);
    return { success: false, error: error instanceof Error ? error.message : "更新任务失败" };
  }
}

/**
 * Grid 视图专用 PATCH 更新：只传变更字段，服务端从 DB 读最新值后合并。
 * 解决并发覆盖问题——两人同时编辑同一任务的不同字段时互不干扰。
 */
export async function patchManagedTaskFields(
  id: string,
  patch: Record<string, unknown>
) {
  try {
    const existing = await prisma.managedTask.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "任务不存在" };

    // 将 DB 记录转换为 ManagedTaskInput 格式，日期只保留 YYYY-MM-DD
    const dateStr = (d: Date | null) => d ? d.toISOString().slice(0, 10) : null;
    const current: ManagedTaskInput = {
      parentId: existing.parentId,
      title: existing.title,
      description: existing.description,
      category: existing.category,
      sdlcNode: existing.sdlcNode,
      status: existing.status,
      planStartDate: dateStr(existing.planStartDate),
      planEndDate: dateStr(existing.planEndDate),
      plannedWorkdays: existing.plannedWorkdays,
      progressPercent: existing.progressPercent,
      actualStartAt: dateStr(existing.actualStartAt),
      actualFinishAt: dateStr(existing.actualFinishAt),
      executorId: existing.executorId,
      monthlyPlanId: existing.monthlyPlanId,
      monthlyItemType: existing.monthlyItemType,
      monthlyItemId: existing.monthlyItemId,
      versionType: existing.versionType,
      versionId: existing.productVersionId || existing.projectVersionId || null,
      notes: existing.notes,
    };

    // 合并 patch 到 current（只覆盖传入的字段）
    const merged = { ...current, ...patch } as ManagedTaskInput;

    return updateManagedTask(id, merged);
  } catch (error) {
    console.error("[patchManagedTaskFields]", error);
    return { success: false, error: error instanceof Error ? error.message : "更新任务失败" };
  }
}

async function deleteSubtree(taskId: string) {
  const children = await prisma.managedTask.findMany({
    where: { parentId: taskId },
    select: { id: true },
  });
  for (const child of children) {
    await deleteSubtree(child.id);
  }
  await prisma.managedTaskStatusLog.deleteMany({
    where: { taskId },
  });
  await prisma.managedTask.delete({
    where: { id: taskId },
  });
}

export async function deleteOrCancelManagedTask(id: string) {
  try {
    const user = await currentUser();
    const task = await prisma.managedTask.findUnique({ where: { id }, include: { children: true } });
    if (!task) return { success: false, error: "任务不存在" };
    await assertCanManageTask(task, user);

    const parentId = task.parentId;

    await deleteSubtree(id);
    await recordAuditLog("DELETE", "WBS", `彻底删除了 WBS 任务：${task.title}`);

    if (parentId) {
      await rollupAncestors(parentId);
    }
    revalidatePath("/managed-tasks");
    return { success: true };
  } catch (error) {
    console.error("[deleteOrCancelManagedTask]", error);
    return { success: false, error: error instanceof Error ? error.message : "删除任务失败" };
  }
}

export async function clearAllManagedTasks() {
  try {
    await prisma.managedTaskStatusLog.deleteMany({});
    const { count } = await prisma.managedTask.deleteMany({});
    await recordAuditLog("DELETE", "WBS", `清空了系统中的全部 WBS 任务数据，共 ${count} 条记录`);
    revalidatePath("/managed-tasks");
    return { success: true, count };
  } catch (error) {
    console.error("[clearAllManagedTasks]", error);
    return { success: false, error: error instanceof Error ? error.message : "清空任务失败" };
  }
}

export async function copyManagedTask(id: string) {
  try {
    const user = await currentUser();
    const original = await prisma.managedTask.findUnique({
      where: { id },
      include: { children: true },
    });
    if (!original) return { success: false, error: "任务不存在" };
    await assertCanManageTask(original, user);

    // 辅助递归复制子树
    async function duplicateNode(srcId: string, newParentId: string | null, isRoot: boolean): Promise<any> {
      const src = await prisma.managedTask.findUnique({
        where: { id: srcId },
        include: { children: { orderBy: { sequenceNo: "asc" } } },
      });
      if (!src) return null;

      const parentTask = newParentId ? await prisma.managedTask.findUnique({ where: { id: newParentId } }) : null;
      const created = await prisma.managedTask.create({
        data: {
          title: isRoot ? `${src.title} (副本)` : src.title,
          description: src.description,
          level: isRoot ? src.level : (parentTask ? parentTask.level + 1 : 1),
          parentId: newParentId,
          category: src.category,
          sdlcNode: src.sdlcNode,
          status: src.status,
          planStartDate: src.planStartDate,
          planEndDate: src.planEndDate,
          plannedWorkdays: src.plannedWorkdays,
          actualWorkdays: src.actualWorkdays,
          progressPercent: src.progressPercent,
          actualStartAt: src.actualStartAt,
          actualFinishAt: src.actualFinishAt,
          productLineTeamId: src.productLineTeamId,
          createdById: user?.id || src.createdById,
          executorId: src.executorId,
          monthlyPlanId: src.monthlyPlanId,
          monthlyItemType: src.monthlyItemType,
          monthlyItemId: src.monthlyItemId,
          versionType: src.versionType,
          productVersionId: src.productVersionId,
          projectVersionId: src.projectVersionId,
          notes: src.notes,
        },
      });

      for (const child of src.children) {
        await duplicateNode(child.id, created.id, false);
      }

      return created;
    }

    const copied = await duplicateNode(id, original.parentId, true);
    if (original.parentId) {
      await rollupAncestors(original.parentId);
    }
    await recordAuditLog("CREATE", "WBS", `复制了 WBS 任务：${original.title} 及其分支`);
    revalidatePath("/managed-tasks");
    return { success: true, data: copied };
  } catch (error) {
    console.error("[copyManagedTask]", error);
    return { success: false, error: error instanceof Error ? error.message : "复制任务失败" };
  }
}

export async function indentManagedTask(id: string) {
  try {
    const user = await currentUser();
    const task = await prisma.managedTask.findUnique({ where: { id } });
    if (!task) return { success: false, error: "任务不存在" };
    await assertCanManageTask(task, user);

    if (task.level >= 3) return { success: false, error: "已达最大深度（3层），无法继续降级" };

    const siblings = await prisma.managedTask.findMany({
      where: { parentId: task.parentId },
      orderBy: { sequenceNo: "asc" },
    });

    const taskIndex = siblings.findIndex((s) => s.id === task.id);
    if (taskIndex <= 0) return { success: false, error: "上方没有同级任务，无法降级为子任务" };

    const prevSibling = siblings[taskIndex - 1];
    const oldParentId = task.parentId;

    await prisma.managedTask.update({
      where: { id: task.id },
      data: {
        parentId: prevSibling.id,
        level: prevSibling.level + 1,
      },
    });

    await rollupAncestors(prevSibling.id);
    if (oldParentId) {
      await rollupAncestors(oldParentId);
    }

    await recordAuditLog("UPDATE", "WBS", `降低了任务层级（降级）：${task.title}`);
    revalidatePath("/managed-tasks");
    return { success: true };
  } catch (error) {
    console.error("[indentManagedTask]", error);
    return { success: false, error: error instanceof Error ? error.message : "降级任务失败" };
  }
}

export async function outdentManagedTask(id: string) {
  try {
    const user = await currentUser();
    const task = await prisma.managedTask.findUnique({ where: { id } });
    if (!task) return { success: false, error: "任务不存在" };
    await assertCanManageTask(task, user);

    if (task.level <= 1 || !task.parentId) return { success: false, error: "已是一级任务，无法继续升级" };

    const parent = await prisma.managedTask.findUnique({ where: { id: task.parentId } });
    if (!parent) return { success: false, error: "父任务不存在" };

    const oldParentId = task.parentId;

    await prisma.managedTask.update({
      where: { id: task.id },
      data: {
        parentId: parent.parentId,
        level: parent.level,
      },
    });

    await rollupAncestors(oldParentId);
    if (parent.parentId) {
      await rollupAncestors(parent.parentId);
    }

    await recordAuditLog("UPDATE", "WBS", `提升了任务层级（升级）：${task.title}`);
    revalidatePath("/managed-tasks");
    return { success: true };
  } catch (error) {
    console.error("[outdentManagedTask]", error);
    return { success: false, error: error instanceof Error ? error.message : "升级任务失败" };
  }
}

/**
 * 上移任务：与上方同级任务交换 sequenceNo，实现排序上移
 * 注意：sequenceNo 有全表 @unique 约束，需三步交换避免中间态冲突
 */
export async function moveTaskUp(id: string) {
  try {
    const user = await currentUser();
    const task = await prisma.managedTask.findUnique({ where: { id } });
    if (!task) return { success: false, error: "任务不存在" };
    await assertCanManageTask(task, user);

    // 查出所有同级任务（同 parentId），按 sequenceNo 升序
    const siblings = await prisma.managedTask.findMany({
      where: { parentId: task.parentId },
      orderBy: { sequenceNo: "asc" },
    });

    const idx = siblings.findIndex((s) => s.id === task.id);
    if (idx <= 0) return { success: false, error: "已是同级中的第一个任务，无法继续上移" };

    const prevSibling = siblings[idx - 1];
    const seqA = task.sequenceNo;
    const seqB = prevSibling.sequenceNo;

    // 三步交换：先置临时负值 → 写目标值 → 写回
    await prisma.$transaction(async (tx) => {
      await tx.managedTask.update({ where: { id: task.id }, data: { sequenceNo: -seqA } });
      await tx.managedTask.update({ where: { id: prevSibling.id }, data: { sequenceNo: seqA } });
      await tx.managedTask.update({ where: { id: task.id }, data: { sequenceNo: seqB } });
    });

    await recordAuditLog("UPDATE", "WBS", `上移了任务顺序：${task.title}`);
    revalidatePath("/managed-tasks");
    return { success: true };
  } catch (error) {
    console.error("[moveTaskUp]", error);
    return { success: false, error: error instanceof Error ? error.message : "上移任务失败" };
  }
}

/**
 * 下移任务：与下方同级任务交换 sequenceNo，实现排序下移
 * 注意：sequenceNo 有全表 @unique 约束，需三步交换避免中间态冲突
 */
export async function moveTaskDown(id: string) {
  try {
    const user = await currentUser();
    const task = await prisma.managedTask.findUnique({ where: { id } });
    if (!task) return { success: false, error: "任务不存在" };
    await assertCanManageTask(task, user);

    // 查出所有同级任务（同 parentId），按 sequenceNo 升序
    const siblings = await prisma.managedTask.findMany({
      where: { parentId: task.parentId },
      orderBy: { sequenceNo: "asc" },
    });

    const idx = siblings.findIndex((s) => s.id === task.id);
    if (idx < 0 || idx >= siblings.length - 1) return { success: false, error: "已是同级中的最后一个任务，无法继续下移" };

    const nextSibling = siblings[idx + 1];
    const seqA = task.sequenceNo;
    const seqB = nextSibling.sequenceNo;

    // 三步交换：先置临时负值 → 写目标值 → 写回
    await prisma.$transaction(async (tx) => {
      await tx.managedTask.update({ where: { id: task.id }, data: { sequenceNo: -seqA } });
      await tx.managedTask.update({ where: { id: nextSibling.id }, data: { sequenceNo: seqA } });
      await tx.managedTask.update({ where: { id: task.id }, data: { sequenceNo: seqB } });
    });

    await recordAuditLog("UPDATE", "WBS", `下移了任务顺序：${task.title}`);
    revalidatePath("/managed-tasks");
    return { success: true };
  } catch (error) {
    console.error("[moveTaskDown]", error);
    return { success: false, error: error instanceof Error ? error.message : "下移任务失败" };
  }
}

function defaultDayType(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6 ? WorkCalendarDayType.REGULAR_WEEKEND : WorkCalendarDayType.REGULAR_WORKDAY;
}

export async function saveWorkCalendar(input: WorkCalendarInput) {
  try {
    const user = await currentUser();
    if (!user.isAdmin) return { success: false, error: "只有管理员可以维护工作日历" };
    const parsed = workCalendarSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "工作日历数据校验失败" };
    const data = parsed.data;
    const existing = await prisma.workCalendarYear.findFirst({ where: { year: data.year, productLineTeamId: null }, select: { id: true } });
    const calendar = await prisma.$transaction(async (tx) => {
      const saved = existing
        ? await tx.workCalendarYear.update({ where: { id: existing.id }, data: { status: data.status, standardHours: data.standardHours, workWindows: data.workWindows || null, publishedAt: data.status === WorkCalendarStatus.PUBLISHED ? new Date() : null } })
        : await tx.workCalendarYear.create({ data: { year: data.year, productLineTeamId: null, status: data.status, standardHours: data.standardHours, workWindows: data.workWindows || null, publishedAt: data.status === WorkCalendarStatus.PUBLISHED ? new Date() : null } });
      await tx.workCalendarDay.deleteMany({ where: { calendarYearId: saved.id } });
      const exceptionDays = data.days.filter(
        (day) =>
          day.type === WorkCalendarDayType.LEGAL_HOLIDAY ||
          day.type === WorkCalendarDayType.ADJUSTED_WORKDAY ||
          day.type === WorkCalendarDayType.SPECIAL_REST_DAY ||
          day.type === WorkCalendarDayType.SPECIAL_WORKDAY ||
          day.workWindows
      );
      await tx.workCalendarDay.createMany({
        data: exceptionDays.map((day) => ({
          calendarYearId: saved.id,
          date: new Date(`${day.date}T00:00:00.000Z`),
          type: day.type,
          standardHours: day.standardHours ?? null,
          workWindows: day.workWindows || null,
          label: clean(day.label),
          notes: clean(day.notes),
        })),
      });
      return saved;
    });
    revalidatePath("/managed-tasks");
    return { success: true, data: calendar };
  } catch (error) {
    console.error("[saveWorkCalendar]", error);
    return { success: false, error: error instanceof Error ? error.message : "保存工作日历失败" };
  }
}
