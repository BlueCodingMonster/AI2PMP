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
const toDate = (value?: string | null) => (value ? new Date(value.includes("T") ? value : `${value}T00:00:00.000Z`) : null);

async function calculateWorkdays(startDate: Date | null, endDate: Date | null, teamId: string): Promise<number> {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
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
      { status: "desc" }, // PUBLISHED before DRAFT
      { updatedAt: "desc" }
    ]
  });

  const overrideMap = new Map<string, string>();
  for (const year of years) {
    const yearCals = calendars.filter((c) => c.year === year);
    const teamCal = yearCals.find((c) => c.productLineTeamId === teamId);
    const globalCal = yearCals.find((c) => c.productLineTeamId === null);
    
    if (globalCal) {
      globalCal.days.forEach((d) => {
        const key = d.date.toISOString().split("T")[0];
        overrideMap.set(key, d.type);
      });
    }
    if (teamCal) {
      teamCal.days.forEach((d) => {
        const key = d.date.toISOString().split("T")[0];
        overrideMap.set(key, d.type);
      });
    }
  }

  let workdayCount = 0;
  const current = new Date(start);
  while (current <= end) {
    const key = current.toISOString().split("T")[0];
    const override = overrideMap.get(key);
    
    if (override) {
      if (
        override === WorkCalendarDayType.REGULAR_WORKDAY ||
        override === WorkCalendarDayType.ADJUSTED_WORKDAY ||
        override === WorkCalendarDayType.SPECIAL_WORKDAY
      ) {
        workdayCount++;
      }
    } else {
      const day = current.getDay();
      const isWeekend = day === 0 || day === 6;
      if (!isWeekend) {
        workdayCount++;
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return workdayCount;
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
  const actualStartAt = toDate(data.actualStartAt) ?? (status === ManagedTaskStatus.IN_PROGRESS ? new Date() : null);
  const actualFinishAt = toDate(data.actualFinishAt) ?? (status === ManagedTaskStatus.DONE ? new Date() : null);
  return {
    title: data.title,
    description: clean(data.description),
    sdlcNode: data.sdlcNode ?? null,
    status,
    planStartDate: toDate(data.planStartDate),
    planEndDate: toDate(data.planEndDate),
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
      productLineTeam: { select: { name: true } },
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
    return [
      ...plan.productDeliveries.map((item) => ({ planId: plan.id, itemType: "PRODUCT_DELIVERY", itemId: item.id, label: `${prefix} / 产品交付 / ${item.moduleVersion || item.deliveryContent || "未命名事项"}` })),
      ...plan.projectDeliveries.map((item) => ({ planId: plan.id, itemType: "PROJECT_DELIVERY", itemId: item.id, label: `${prefix} / 项目交付 / ${item.projectName || item.deliveryContent || "未命名事项"}` })),
      ...plan.marketActions.map((item) => ({ planId: plan.id, itemType: "MARKET_ACTION", itemId: item.id, label: `${prefix} / 市场动作 / ${item.productOrProject || item.marketAction || "未命名事项"}` })),
      ...plan.costOptimizations.map((item) => ({ planId: plan.id, itemType: "COST_OPTIMIZATION", itemId: item.id, label: `${prefix} / 成本优化 / ${item.optimizationItem || item.currentProblem || "未命名事项"}` })),
      ...plan.aiProductEnablements.map((item) => ({ planId: plan.id, itemType: "AI_PRODUCT_ENABLEMENT", itemId: item.id, label: `${prefix} / AI产品赋能 / ${item.item || item.outputResult || "未命名事项"}` })),
      ...plan.aiEfficiencies.map((item) => ({ planId: plan.id, itemType: "AI_EFFICIENCY", itemId: item.id, label: `${prefix} / AI提效 / ${item.item || item.outputResult || "未命名事项"}` })),
      ...plan.risks.map((item) => ({ planId: plan.id, itemType: "RISK", itemId: item.id, label: `${prefix} / 风险 / ${item.riskItem || "未命名事项"}` })),
      ...plan.resourceRequests.map((item) => ({ planId: plan.id, itemType: "RESOURCE_REQUEST", itemId: item.id, label: `${prefix} / 资源需求 / ${item.content || "未命名事项"}` })),
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

    if (!data.executorId) {
      if (data.status !== ManagedTaskStatus.UNSCHEDULED) return { success: false, error: "未分配执行人的叶子任务只能保持待排期" };
      if (data.progressPercent !== 0) return { success: false, error: "未分配执行人的叶子任务进度必须为0" };
    }

    const parent = data.parentId ? await prisma.managedTask.findUnique({ where: { id: data.parentId }, include: { children: true } }) : null;
    if (data.parentId && !parent) return { success: false, error: "上级任务不存在" };
    if (parent) await assertCanManageTask(parent, user);
    if (parent && parent.level >= 3) return { success: false, error: "任务最多只能拆分三级" };
    if (parent && parent.children.length === 0 && (parent.actualStartAt || parent.actualFinishAt || parent.status === ManagedTaskStatus.DONE)) {
      return { success: false, error: "该任务已有执行数据，请先使用拆分任务操作迁移执行数据" };
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

export async function deleteOrCancelManagedTask(id: string) {
  try {
    const user = await currentUser();
    const task = await prisma.managedTask.findUnique({ where: { id }, include: { children: true } });
    if (!task) return { success: false, error: "任务不存在" };
    await assertCanManageTask(task, user);
    if (task.children.length === 0 && !task.actualStartAt && task.status !== ManagedTaskStatus.DONE) {
      await prisma.managedTask.delete({ where: { id } });
      await recordAuditLog("DELETE", "WBS", `删除了 WBS 任务：${task.title}`);
    } else {
      await prisma.managedTask.update({ where: { id }, data: { status: ManagedTaskStatus.CANCELLED } });
      await recordAuditLog("CANCEL", "WBS", `取消了 WBS 任务：${task.title}`);
    }
    await rollupAncestors(task.parentId);
    revalidatePath("/managed-tasks");
    return { success: true };
  } catch (error) {
    console.error("[deleteOrCancelManagedTask]", error);
    return { success: false, error: error instanceof Error ? error.message : "删除/取消任务失败" };
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
        ? await tx.workCalendarYear.update({ where: { id: existing.id }, data: { status: data.status, standardHours: data.standardHours, publishedAt: data.status === WorkCalendarStatus.PUBLISHED ? new Date() : null } })
        : await tx.workCalendarYear.create({ data: { year: data.year, productLineTeamId: null, status: data.status, standardHours: data.standardHours, publishedAt: data.status === WorkCalendarStatus.PUBLISHED ? new Date() : null } });
      await tx.workCalendarDay.deleteMany({ where: { calendarYearId: saved.id } });
      const exceptionDays = data.days.filter(
        (day) =>
          day.type === WorkCalendarDayType.LEGAL_HOLIDAY ||
          day.type === WorkCalendarDayType.ADJUSTED_WORKDAY ||
          day.type === WorkCalendarDayType.SPECIAL_REST_DAY ||
          day.type === WorkCalendarDayType.SPECIAL_WORKDAY
      );
      await tx.workCalendarDay.createMany({
        data: exceptionDays.map((day) => ({
          calendarYearId: saved.id,
          date: new Date(`${day.date}T00:00:00.000Z`),
          type: day.type,
          standardHours: day.standardHours ?? null,
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
