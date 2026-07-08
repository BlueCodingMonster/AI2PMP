"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { planItemSchema, PlanItemInput, planSchema, PlanInput } from "@/lib/validations/plans";
import { deliveryFlowStages } from "@/lib/plans/workflow-templates";
import {
  ExecutionFlowTemplate,
  PlanStatus,
  PlanType,
  PlanningTreatment,
  WorkItemSource,
  WorkItemType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

function summarizePlanItems(items: Array<{ isPlanned: boolean; progress: number }>) {
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

async function createDefaultStages(planItemId: string, flow: ExecutionFlowTemplate) {
  const templates = deliveryFlowStages[flow] ?? [];
  if (templates.length === 0) return;

  await prisma.planItemStage.createMany({
    data: templates.map((stage) => ({
      planItemId,
      group: stage.group,
      name: stage.name,
      isMilestone: stage.isMilestone,
      sortOrder: stage.sortOrder,
    })),
  });
}

export async function getPlans(type?: PlanType) {
  try {
    const plans = await prisma.plan.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ year: "desc" }, { quarter: "asc" }, { month: "asc" }, { createdAt: "desc" }],
      include: {
        createdBy: { select: { id: true, name: true } },
        items: { select: { id: true, progress: true, status: true, isPlanned: true } },
        parentPlan: { select: { id: true, title: true } },
        productLineTeam: { select: { id: true, name: true } },
      },
    });

    return {
      success: true,
      data: plans.map((plan) => {
        const summary = summarizePlanItems(plan.items);
        return { ...plan, progress: summary.plannedProgress, workItemSummary: summary };
      }),
    };
  } catch (error) {
    console.error("[getPlans] 获取计划列表失败:", error);
    return { success: false, error: "获取计划列表失败", data: [] };
  }
}

export async function getPlansHierarchy() {
  try {
    const allPlans = await prisma.plan.findMany({
      include: {
        productLineTeam: { select: { id: true, name: true } },
        items: { select: { id: true, progress: true, isPlanned: true } },
      },
      orderBy: [{ year: "desc" }, { quarter: "asc" }, { month: "asc" }],
    });

    const plansMap = allPlans.map((plan) => {
      const summary = summarizePlanItems(plan.items);
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
        progress: summary.plannedProgress,
        workItemSummary: summary,
      };
    });

    const annualPlans = plansMap.filter((plan) => plan.type === PlanType.ANNUAL);
    const quarterlyPlans = plansMap.filter((plan) => plan.type === PlanType.QUARTERLY);
    const monthlyPlans = plansMap.filter((plan) => plan.type === PlanType.MONTHLY);

    const hierarchy = annualPlans.map((annual) => {
      const directQuarters = quarterlyPlans
        .filter((quarter) => quarter.parentPlanId === annual.id)
        .map((quarter) => ({
          ...quarter,
          children: monthlyPlans.filter((month) => month.parentPlanId === quarter.id),
        }));
      const directMonths = monthlyPlans.filter((month) => month.parentPlanId === annual.id);
      return { ...annual, children: [...directQuarters, ...directMonths] };
    });

    return { success: true, data: hierarchy };
  } catch (error) {
    console.error("[getPlansHierarchy] 获取计划层级失败:", error);
    return { success: false, error: "获取计划层级失败", data: [] };
  }
}

export async function getPlanById(id: string) {
  try {
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        parentPlan: { select: { id: true, title: true, type: true } },
        sourcePlan: { select: { id: true, title: true, type: true, status: true } },
        replacementPlan: { select: { id: true, title: true, type: true, status: true } },
        productLineTeam: { select: { id: true, name: true } },
        childPlans: { select: { id: true, title: true, type: true, status: true } },
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
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
            task: { select: { id: true, title: true, status: true } },
            assignee: { select: { id: true, name: true } },
            relatedPlanItem: { select: { id: true, title: true, status: true, progress: true } },
            stages: {
              orderBy: { sortOrder: "asc" },
              include: { assignee: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    if (!plan) return { success: false, error: "计划不存在" };

    const summary = summarizePlanItems(plan.items);
    return { success: true, data: { ...plan, progress: summary.plannedProgress, workItemSummary: summary } };
  } catch (error) {
    console.error("[getPlanById] 获取计划详情失败:", error);
    return { success: false, error: "获取计划详情失败" };
  }
}

export async function createPlan(input: PlanInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };

  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "输入数据不合法" };

  const data = parsed.data;
  try {
    const plan = await prisma.plan.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        type: data.type,
        status: data.status || PlanStatus.DRAFT,
        productLineTeamId: data.productLineTeamId,
        year: data.year,
        halfYear: data.halfYear ?? null,
        quarter: data.quarter ?? null,
        month: data.month ?? null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        parentPlanId: data.parentPlanId ?? null,
        sourcePlanId: data.sourcePlanId ?? null,
        replacementPlanId: data.replacementPlanId ?? null,
        adjustedReason: data.adjustedReason ?? null,
        voidedReason: data.voidedReason ?? null,
        voidedAt: data.voidedAt ? new Date(data.voidedAt) : null,
        goals: data.goals ?? null,
        createdById: session.user.id,
      },
    });

    revalidatePath("/plans");
    revalidatePath("/plans/overview");
    return { success: true, data: plan };
  } catch (error) {
    console.error("[createPlan] 创建计划失败:", error);
    return { success: false, error: "创建计划失败" };
  }
}

export async function updatePlan(id: string, input: PlanInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };

  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "输入数据不合法" };

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
        sourcePlanId: data.sourcePlanId ?? null,
        replacementPlanId: data.replacementPlanId ?? null,
        adjustedReason: data.adjustedReason ?? null,
        voidedReason: data.voidedReason ?? null,
        voidedAt: data.voidedAt ? new Date(data.voidedAt) : null,
        goals: data.goals ?? null,
      },
    });

    revalidatePath("/plans");
    revalidatePath("/plans/overview");
    revalidatePath(`/plans/${id}`);
    return { success: true, data: updated };
  } catch (error) {
    console.error("[updatePlan] 更新计划失败:", error);
    return { success: false, error: "更新计划失败" };
  }
}

export async function deletePlan(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };

  try {
    await prisma.plan.delete({ where: { id } });
    revalidatePath("/plans");
    revalidatePath("/plans/overview");
    return { success: true };
  } catch (error) {
    console.error("[deletePlan] 删除计划失败:", error);
    return { success: false, error: "删除计划失败，可能存在关联限制" };
  }
}

export async function addPlanItem(planId: string, input: PlanItemInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };

  try {
    const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { productLineTeamId: true } });
    if (!plan) return { success: false, error: "计划不存在" };

    const parsed = planItemSchema.safeParse({ ...input, productLineTeamId: input.productLineTeamId ?? plan.productLineTeamId });
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "输入数据不合法" };

    const data = parsed.data;
    const productLineTeamId = data.productLineTeamId ?? plan.productLineTeamId;
    const item = await prisma.planItem.create({
      data: {
        planId: data.isPlanned ? planId : null,
        productLineTeamId,
        title: data.title,
        description: data.description ?? null,
        type: data.type ?? WorkItemType.REQUIREMENT,
        source: data.isPlanned ? data.source ?? WorkItemSource.PLATFORM_RND : WorkItemSource.UNPLANNED,
        executionFlow: data.executionFlow ?? ExecutionFlowTemplate.NONE,
        versionNameText: data.versionNameText ?? null,
        specialTaskCategory: data.specialTaskCategory ?? null,
        ipType: data.ipType ?? null,
        specialSerialNo: data.specialSerialNo ?? null,
        specialTarget: data.specialTarget ?? null,
        specialOwnerText: data.specialOwnerText ?? null,
        plannedFinishText: data.plannedFinishText ?? null,
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

    await createDefaultStages(item.id, item.executionFlow);
    if (data.requirementId) {
      await prisma.requirement.update({ where: { id: data.requirementId }, data: { status: "PLANNED" } });
    }

    revalidatePath(`/plans/${planId}`);
    revalidatePath("/plans");
    revalidatePath("/plans/overview");
    revalidatePath("/plans/unplanned");
    return { success: true, data: item };
  } catch (error) {
    console.error("[addPlanItem] 添加计划条目失败:", error);
    return { success: false, error: "添加计划条目失败" };
  }
}

export async function addUnplannedWorkItem(input: PlanItemInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };

  const parsed = planItemSchema.safeParse({ ...input, isPlanned: false, source: WorkItemSource.UNPLANNED });
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "输入数据不合法" };

  const data = parsed.data;
  try {
    const item = await prisma.planItem.create({
      data: {
        planId: null,
        productLineTeamId: data.productLineTeamId ?? null,
        title: data.title,
        description: data.description ?? null,
        type: data.type ?? WorkItemType.TEMPORARY,
        source: WorkItemSource.UNPLANNED,
        executionFlow: data.executionFlow ?? ExecutionFlowTemplate.NONE,
        versionNameText: data.versionNameText ?? null,
        specialTaskCategory: data.specialTaskCategory ?? null,
        ipType: data.ipType ?? null,
        specialSerialNo: data.specialSerialNo ?? null,
        specialTarget: data.specialTarget ?? null,
        specialOwnerText: data.specialOwnerText ?? null,
        plannedFinishText: data.plannedFinishText ?? null,
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

    await createDefaultStages(item.id, item.executionFlow);
    revalidatePath("/plans/unplanned");
    revalidatePath("/plans/overview");
    return { success: true, data: item };
  } catch (error) {
    console.error("[addUnplannedWorkItem] 添加计划外工作失败:", error);
    return { success: false, error: "添加计划外工作失败" };
  }
}

export async function updatePlanItem(itemId: string, input: PlanItemInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };

  try {
    const oldItem = await prisma.planItem.findUnique({
      where: { id: itemId },
      include: { plan: { select: { id: true, productLineTeamId: true } } },
    });
    if (!oldItem) return { success: false, error: "工作项不存在" };

    const productLineTeamId = input.productLineTeamId ?? oldItem.productLineTeamId ?? oldItem.plan?.productLineTeamId ?? null;
    const parsed = planItemSchema.safeParse({ ...input, productLineTeamId });
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "输入数据不合法" };

    const data = parsed.data;
    const nextIsPlanned = data.isPlanned ?? oldItem.isPlanned;
    const updated = await prisma.planItem.update({
      where: { id: itemId },
      data: {
        title: data.title,
        description: data.description ?? null,
        type: data.type ?? undefined,
        source: nextIsPlanned ? data.source ?? oldItem.source : WorkItemSource.UNPLANNED,
        executionFlow: data.executionFlow ?? oldItem.executionFlow,
        versionNameText: data.versionNameText ?? null,
        specialTaskCategory: data.specialTaskCategory ?? null,
        ipType: data.ipType ?? null,
        specialSerialNo: data.specialSerialNo ?? null,
        specialTarget: data.specialTarget ?? null,
        specialOwnerText: data.specialOwnerText ?? null,
        plannedFinishText: data.plannedFinishText ?? null,
        isPlanned: nextIsPlanned,
        planId: nextIsPlanned ? oldItem.planId : null,
        planningTreatment: nextIsPlanned ? null : data.planningTreatment ?? null,
        productLineTeamId,
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

    if (data.executionFlow && data.executionFlow !== oldItem.executionFlow) {
      await prisma.planItemStage.deleteMany({ where: { planItemId: itemId } });
      await createDefaultStages(itemId, data.executionFlow);
    }

    if (data.requirementId && oldItem.requirementId !== data.requirementId) {
      await prisma.requirement.update({ where: { id: data.requirementId }, data: { status: "PLANNED" } });
    }

    if (oldItem.planId) revalidatePath(`/plans/${oldItem.planId}`);
    if (updated.planId && updated.planId !== oldItem.planId) revalidatePath(`/plans/${updated.planId}`);
    revalidatePath("/plans");
    revalidatePath("/plans/overview");
    revalidatePath("/plans/unplanned");
    return { success: true, data: updated };
  } catch (error) {
    console.error("[updatePlanItem] 更新计划条目失败:", error);
    return { success: false, error: "更新计划条目失败" };
  }
}

export async function deletePlanItem(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };

  try {
    const item = await prisma.planItem.delete({ where: { id: itemId } });
    if (item.requirementId) {
      const otherAssociations = await prisma.planItem.count({ where: { requirementId: item.requirementId } });
      if (otherAssociations === 0) {
        await prisma.requirement.update({ where: { id: item.requirementId }, data: { status: "APPROVED" } });
      }
    }

    if (item.planId) revalidatePath(`/plans/${item.planId}`);
    revalidatePath("/plans");
    revalidatePath("/plans/overview");
    revalidatePath("/plans/unplanned");
    return { success: true };
  } catch (error) {
    console.error("[deletePlanItem] 删除计划条目失败:", error);
    return { success: false, error: "删除计划条目失败" };
  }
}

export async function getEligibleRequirements() {
  try {
    const requirements = await prisma.requirement.findMany({
      where: { status: "APPROVED" },
      select: { id: true, title: true, priority: true, type: true },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: requirements };
  } catch (error) {
    console.error("[getEligibleRequirements] 获取候选需求失败:", error);
    return { success: false, error: "获取候选需求失败", data: [] };
  }
}

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
            productPlatform: { select: { name: true } },
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
    if (!productLineTeamId) return { success: true, data: [] };

    const relatedTypes =
      type === PlanType.ANNUAL ? [] : type === PlanType.QUARTERLY ? [PlanType.ANNUAL] : [PlanType.ANNUAL, PlanType.QUARTERLY];

    if (relatedTypes.length === 0) return { success: true, data: [] };

    const options = await prisma.plan.findMany({
      where: {
        type: { in: relatedTypes },
        year,
        productLineTeamId,
        status: { not: PlanStatus.CANCELLED },
      },
      select: { id: true, title: true, type: true, halfYear: true, quarter: true, month: true },
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
      where: { isPlanned: false, ...(productLineTeamId ? { productLineTeamId } : {}) },
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

export async function getPlanOverview(type?: PlanType, year?: number) {
  try {
    const plans = await prisma.plan.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(year ? { year } : {}),
        status: { not: PlanStatus.CANCELLED },
      },
      include: {
        productLineTeam: { select: { id: true, name: true } },
        items: {
          select: {
            id: true,
            source: true,
            isPlanned: true,
            progress: true,
            specialTaskCategory: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { updatedAt: "desc" }],
    });

    const rows = plans.map((plan) => {
      const summary = summarizePlanItems(plan.items);
      return {
        id: plan.id,
        title: plan.title,
        type: plan.type,
        status: plan.status,
        year: plan.year,
        quarter: plan.quarter,
        month: plan.month,
        productLineTeam: plan.productLineTeam,
        progress: summary.plannedProgress,
        plannedCount: summary.plannedCount,
        unplannedCount: summary.unplannedCount,
        platformRndCount: plan.items.filter((item) => item.source === WorkItemSource.PLATFORM_RND).length,
        localDeliveryCount: plan.items.filter((item) => item.source === WorkItemSource.LOCAL_DELIVERY).length,
        specialTaskCount: plan.items.filter((item) => item.specialTaskCategory).length,
      };
    });

    return { success: true, data: rows };
  } catch (error) {
    console.error("[getPlanOverview] 获取计划整体视图失败:", error);
    return { success: false, error: "获取计划整体视图失败", data: [] };
  }
}
