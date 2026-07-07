"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { planSchema, PlanInput, planItemSchema, PlanItemInput } from "@/lib/validations/plans";
import { PlanType, PlanStatus, WorkItemType, PlanningTreatment } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * 获取所有计划，按类型筛选
 */
export async function getPlans(type?: PlanType) {
  try {
    const where: { type?: PlanType } = {};
    if (type) {
      where.type = type;
    }

    const plans = await prisma.plan.findMany({
      where,
      orderBy: [
        { year: "desc" },
        { quarter: "asc" },
        { month: "asc" },
        { createdAt: "desc" },
      ],
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        items: {
          select: {
            id: true,
            progress: true,
            status: true,
          },
        },
        parentPlan: {
          select: { id: true, title: true },
        },
        productLineTeam: {
          select: { id: true, name: true },
        },
      },
    });

    // 计算每个计划的平均进度
    const plansWithProgress = plans.map((plan) => {
      const itemsCount = plan.items.length;
      let progress = 0;
      if (itemsCount > 0) {
        const totalProgress = plan.items.reduce((sum, item) => sum + item.progress, 0);
        progress = Math.round(totalProgress / itemsCount);
      }
      return {
        ...plan,
        progress,
      };
    });

    return { success: true, data: plansWithProgress };
  } catch (error) {
    console.error("[getPlans] 获取计划列表失败:", error);
    return { success: false, error: "获取计划列表失败", data: [] };
  }
}

/**
 * 获取完整的计划层级树 (年 -> 季 -> 月)
 */
export async function getPlansHierarchy() {
  try {
    // 1. 获取所有计划及其计划项的进度
    const allPlans = await prisma.plan.findMany({
      include: {
        productLineTeam: {
          select: { id: true, name: true },
        },
        items: {
          select: {
            id: true,
            progress: true,
          },
        },
      },
      orderBy: [
        { year: "desc" },
        { quarter: "asc" },
        { month: "asc" },
      ],
    });

    // 预计算进度
    const plansMap = allPlans.map(plan => {
      const itemsCount = plan.items.length;
      const progress = itemsCount > 0 
        ? Math.round(plan.items.reduce((sum, i) => sum + i.progress, 0) / itemsCount) 
        : 0;
      return {
        id: plan.id,
        title: plan.title,
        type: plan.type,
        status: plan.status,
        year: plan.year,
        quarter: plan.quarter,
        month: plan.month,
        halfYear: plan.halfYear,
        productLineTeam: plan.productLineTeam,
        parentPlanId: plan.parentPlanId,
        progress,
      };
    });

    // 2. 组装层级
    const annualPlans = plansMap.filter(p => p.type === PlanType.ANNUAL);
    const halfYearPlans = plansMap.filter(p => p.type === PlanType.HALF_YEAR);
    const quarterlyPlans = plansMap.filter(p => p.type === PlanType.QUARTERLY);
    const monthlyPlans = plansMap.filter(p => p.type === PlanType.MONTHLY);

    const hierarchy = annualPlans.map(annual => {
      const halfYears = halfYearPlans
        .filter(q => q.parentPlanId === annual.id)
        .map(halfYear => {
          const quarters = quarterlyPlans
            .filter(q => q.parentPlanId === halfYear.id)
            .map(quarter => {
              const months = monthlyPlans.filter(m => m.parentPlanId === quarter.id);
              return {
                ...quarter,
                children: months,
              };
            });
          return {
            ...halfYear,
            children: quarters,
          };
        });
      const directQuarters = quarterlyPlans
        .filter(q => q.parentPlanId === annual.id)
        .map(quarter => {
          const months = monthlyPlans.filter(m => m.parentPlanId === quarter.id);
          return {
            ...quarter,
            children: months,
          };
        });
      const directMonths = monthlyPlans.filter(m => m.parentPlanId === annual.id);
      return {
        ...annual,
        children: [...halfYears, ...directQuarters, ...directMonths],
      };
    });

    return { success: true, data: hierarchy };
  } catch (error) {
    console.error("[getPlansHierarchy] 获取计划层级失败:", error);
    return { success: false, error: "获取计划层级失败", data: [] };
  }
}

/**
 * 根据 ID 获取特定计划详情，包括计划条目和关联的详细信息
 */
export async function getPlanById(id: string) {
  try {
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        parentPlan: {
          select: { id: true, title: true, type: true },
        },
        productLineTeam: {
          select: { id: true, name: true },
        },
        childPlans: {
          select: { id: true, title: true, type: true, status: true },
        },
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            requirement: {
              select: { id: true, title: true, status: true, priority: true },
            },
            project: {
              select: { id: true, name: true, key: true },
            },
            productVersion: {
              select: {
                id: true,
                title: true,
                version: true,
                status: true,
                productModule: {
                  select: {
                    name: true,
                    productPlatform: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
            task: {
              select: { id: true, title: true, status: true },
            },
            assignee: {
              select: { id: true, name: true },
            },
            relatedPlanItem: {
              select: { id: true, title: true, status: true, progress: true },
            },
          },
        },
      },
    });

    if (!plan) {
      return { success: false, error: "计划不存在" };
    }

    // 计算计划总进度
    const itemsCount = plan.items.length;
    let progress = 0;
    if (itemsCount > 0) {
      const totalProgress = plan.items.reduce((sum, item) => sum + item.progress, 0);
      progress = Math.round(totalProgress / itemsCount);
    }

    return { success: true, data: { ...plan, progress } };
  } catch (error) {
    console.error("[getPlanById] 获取计划详情失败:", error);
    return { success: false, error: "获取计划详情失败" };
  }
}

/**
 * 创建计划
 */
export async function createPlan(input: PlanInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  const parsed = planSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "输入数据不合法" };
  }

  const data = parsed.data;

  try {
    const plan = await prisma.plan.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        type: data.type,
        status: data.status || "DRAFT",
        productLineTeamId: data.productLineTeamId,
        year: data.year,
        halfYear: data.halfYear ?? null,
        quarter: data.quarter ?? null,
        month: data.month ?? null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        parentPlanId: data.parentPlanId ?? null,
        goals: data.goals ?? null,
        createdById: session.user.id,
      },
    });

    revalidatePath("/plans");
    return { success: true, data: plan };
  } catch (error) {
    console.error("[createPlan] 创建计划失败:", error);
    return { success: false, error: "创建计划失败" };
  }
}

/**
 * 更新计划
 */
export async function updatePlan(id: string, input: PlanInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  const parsed = planSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "输入数据不合法" };
  }

  const data = parsed.data;

  try {
    const updated = await prisma.plan.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description ?? null,
        type: data.type,
        status: data.status || undefined,
        productLineTeamId: data.productLineTeamId,
        year: data.year,
        halfYear: data.halfYear ?? null,
        quarter: data.quarter ?? null,
        month: data.month ?? null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        parentPlanId: data.parentPlanId ?? null,
        goals: data.goals ?? null,
      },
    });

    // 如果状态更新为 PUBLISHED，触发通知
    if (data.status === PlanStatus.PUBLISHED) {
      // 可以在这里通知团队
    }

    revalidatePath("/plans");
    revalidatePath(`/plans/${id}`);
    return { success: true, data: updated };
  } catch (error) {
    console.error("[updatePlan] 更新计划失败:", error);
    return { success: false, error: "更新计划失败" };
  }
}

/**
 * 删除计划
 */
export async function deletePlan(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  try {
    await prisma.plan.delete({
      where: { id },
    });

    revalidatePath("/plans");
    return { success: true };
  } catch (error) {
    console.error("[deletePlan] 删除计划失败:", error);
    return { success: false, error: "删除计划失败，可能存在级联关联限制" };
  }
}

/**
 * 添加计划条目 (PlanItem)
 */
export async function addPlanItem(planId: string, input: PlanItemInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  const parsed = planItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "输入数据不合法" };
  }

  const data = parsed.data;

  try {
    const item = await prisma.planItem.create({
      data: {
        planId,
        productLineTeamId: data.productLineTeamId ?? null,
        title: data.title,
        description: data.description ?? null,
        type: data.type ?? WorkItemType.REQUIREMENT,
        isPlanned: data.isPlanned ?? true,
        planningTreatment: data.planningTreatment ?? null,
        relatedPlanItemId: data.relatedPlanItemId ?? null,
        requirementId: data.requirementId ?? null,
        projectId: data.projectId ?? null,
        productVersionId: data.productVersionId ?? null,
        taskId: data.taskId ?? null,
        assigneeId: data.assigneeId ?? null,
        status: data.status || "TODO",
        progress: data.progress !== undefined ? data.progress : 0,
        sortOrder: data.sortOrder !== undefined ? data.sortOrder : 0,
      },
    });

    // 如果关联了需求，将需求状态变更为 PLANNED (已排期)
    if (data.requirementId) {
      await prisma.requirement.update({
        where: { id: data.requirementId },
        data: { status: "PLANNED" },
      });
    }

    revalidatePath(`/plans/${planId}`);
    return { success: true, data: item };
  } catch (error) {
    console.error("[addPlanItem] 添加计划条目失败:", error);
    return { success: false, error: "添加计划条目失败" };
  }
}

export async function addUnplannedWorkItem(input: PlanItemInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  const parsed = planItemSchema.safeParse({ ...input, isPlanned: false });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "输入数据不合法" };
  }

  const data = parsed.data;

  try {
    const item = await prisma.planItem.create({
      data: {
        planId: null,
        productLineTeamId: data.productLineTeamId ?? null,
        title: data.title,
        description: data.description ?? null,
        type: data.type ?? WorkItemType.TEMPORARY,
        isPlanned: false,
        planningTreatment: data.planningTreatment ?? PlanningTreatment.NOT_INCLUDED,
        relatedPlanItemId: data.relatedPlanItemId ?? null,
        requirementId: data.requirementId ?? null,
        projectId: data.projectId ?? null,
        productVersionId: data.productVersionId ?? null,
        taskId: data.taskId ?? null,
        assigneeId: data.assigneeId ?? null,
        status: data.status || "TODO",
        progress: data.progress !== undefined ? data.progress : 0,
        sortOrder: data.sortOrder !== undefined ? data.sortOrder : 0,
      },
    });

    revalidatePath("/plans/unplanned");
    return { success: true, data: item };
  } catch (error) {
    console.error("[addUnplannedWorkItem] 添加计划外工作失败:", error);
    return { success: false, error: "添加计划外工作失败" };
  }
}

/**
 * 更新计划条目 (PlanItem)
 */
export async function updatePlanItem(itemId: string, input: PlanItemInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  const parsed = planItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "输入数据不合法" };
  }

  const data = parsed.data;

  try {
    const oldItem = await prisma.planItem.findUnique({
      where: { id: itemId },
    });

    const updated = await prisma.planItem.update({
      where: { id: itemId },
      data: {
        title: data.title,
        description: data.description ?? null,
        type: data.type ?? undefined,
        isPlanned: data.isPlanned ?? undefined,
        planningTreatment: data.planningTreatment ?? null,
        productLineTeamId: data.productLineTeamId ?? null,
        relatedPlanItemId: data.relatedPlanItemId ?? null,
        requirementId: data.requirementId ?? null,
        projectId: data.projectId ?? null,
        productVersionId: data.productVersionId ?? null,
        taskId: data.taskId ?? null,
        assigneeId: data.assigneeId ?? null,
        status: data.status || undefined,
        progress: data.progress !== undefined ? data.progress : undefined,
        sortOrder: data.sortOrder !== undefined ? data.sortOrder : undefined,
      },
    });

    // 如果原来没有关联需求，现在关联了，更新需求状态
    if (data.requirementId && oldItem?.requirementId !== data.requirementId) {
      await prisma.requirement.update({
        where: { id: data.requirementId },
        data: { status: "PLANNED" },
      });
    }

    if (updated.planId) {
      revalidatePath(`/plans/${updated.planId}`);
    }
    revalidatePath("/plans/unplanned");
    return { success: true, data: updated };
  } catch (error) {
    console.error("[updatePlanItem] 更新计划条目失败:", error);
    return { success: false, error: "更新计划条目失败" };
  }
}

/**
 * 删除计划条目
 */
export async function deletePlanItem(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  try {
    const item = await prisma.planItem.delete({
      where: { id: itemId },
    });

    // 如果关联了需求，需要评估是否把需求重新恢复为 APPROVED 状态
    if (item.requirementId) {
      // 检查该需求是否还被其他计划关联，如果没有，置回 APPROVED
      const otherAssociations = await prisma.planItem.count({
        where: { requirementId: item.requirementId },
      });
      if (otherAssociations === 0) {
        await prisma.requirement.update({
          where: { id: item.requirementId },
          data: { status: "APPROVED" },
        });
      }
    }

    revalidatePath(`/plans/${item.planId}`);
    return { success: true };
  } catch (error) {
    console.error("[deletePlanItem] 删除计划条目失败:", error);
    return { success: false, error: "删除计划条目失败" };
  }
}

/**
 * 获取可用于纳入计划的「已批准」需求列表
 */
export async function getEligibleRequirements() {
  try {
    const requirements = await prisma.requirement.findMany({
      where: {
        status: "APPROVED",
      },
      select: {
        id: true,
        title: true,
        priority: true,
        type: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: requirements };
  } catch (error) {
    console.error("[getEligibleRequirements] 获取候选需求失败:", error);
    return { success: false, error: "获取候选需求失败", data: [] };
  }
}

/**
 * 获取某个计划关联的上级计划选项 (年度作为季度上级，季度作为月度上级)
 */
export async function getPlanProductLineOptions() {
  try {
    const teams = await prisma.productLineTeam.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return { success: true, data: teams };
  } catch (error) {
    console.error("[getPlanProductLineOptions] 获取产品线选项失败:", error);
    return { success: false, error: "获取产品线选项失败", data: [] };
  }
}

export async function getProductVersionOptions(productLineTeamId?: string) {
  try {
    const versions = await prisma.productVersion.findMany({
      where: productLineTeamId ? { productLineTeamId } : undefined,
      select: {
        id: true,
        title: true,
        version: true,
        status: true,
        productModule: {
          select: {
            name: true,
            productPlatform: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });
    return { success: true, data: versions };
  } catch (error) {
    console.error("[getProductVersionOptions] 获取产品版本选项失败:", error);
    return { success: false, error: "获取产品版本选项失败", data: [] };
  }
}

export async function getParentPlanOptions(type: PlanType, year: number, productLineTeamId?: string) {
  try {
    if (!productLineTeamId) {
      return { success: true, data: [] };
    }

    const relatedTypes =
      type === PlanType.ANNUAL
        ? []
        : type === PlanType.HALF_YEAR
        ? [PlanType.ANNUAL]
        : type === PlanType.QUARTERLY
        ? [PlanType.ANNUAL, PlanType.HALF_YEAR]
        : [PlanType.ANNUAL, PlanType.HALF_YEAR, PlanType.QUARTERLY];

    if (relatedTypes.length === 0) {
      return { success: true, data: [] };
    }

    const options = await prisma.plan.findMany({
      where: {
        type: { in: relatedTypes },
        year: year,
        productLineTeamId,
      },
      select: {
        id: true,
        title: true,
        type: true,
        halfYear: true,
        quarter: true,
        month: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: options };
  } catch (error) {
    console.error("[getParentPlanOptions] 获取上级计划选项失败:", error);
    return { success: false, error: "获取上级计划选项失败", data: [] };
  }
}

export async function getUnplannedWorkItems(productLineTeamId?: string) {
  try {
    const items = await prisma.planItem.findMany({
      where: {
        isPlanned: false,
        ...(productLineTeamId ? { productLineTeamId } : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: {
        productLineTeam: { select: { id: true, name: true } },
        requirement: { select: { id: true, title: true, status: true, priority: true } },
        project: { select: { id: true, name: true, key: true } },
        productVersion: {
          select: {
            id: true,
            title: true,
            version: true,
            status: true,
            productModule: {
              select: {
                name: true,
                productPlatform: { select: { name: true } },
              },
            },
          },
        },
        assignee: { select: { id: true, name: true } },
        relatedPlanItem: { select: { id: true, title: true, status: true, progress: true } },
      },
    });

    return { success: true, data: items };
  } catch (error) {
    console.error("[getUnplannedWorkItems] 获取计划外工作失败:", error);
    return { success: false, error: "获取计划外工作失败", data: [] };
  }
}

export function summarizePlanItems(items: Array<{ isPlanned: boolean; progress: number; status: string }>) {
  const plannedItems = items.filter((item) => item.isPlanned);
  const unplannedItems = items.filter((item) => !item.isPlanned);

  const plannedProgress =
    plannedItems.length > 0
      ? Math.round(plannedItems.reduce((sum, item) => sum + item.progress, 0) / plannedItems.length)
      : 0;

  const allCount = items.length;
  const unplannedShare = allCount > 0 ? Math.round((unplannedItems.length / allCount) * 100) : 0;

  return {
    plannedCount: plannedItems.length,
    unplannedCount: unplannedItems.length,
    plannedProgress,
    unplannedShare,
  };
}
