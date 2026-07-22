"use server";

import { Prisma, PlanPublicationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCanManagePlanTeam, getPlanAccess } from "@/lib/plans/permissions";
import { MonthlyPlanInput, monthlyDraftSchema, monthlyPublishSchema } from "@/lib/validations/monthly-plans";

export type MonthlyPlanFilters = { year?: number; month?: number; productLineTeamIds?: string[]; status?: PlanPublicationStatus };
const clean = (value?: string | null) => value?.trim() || null;
const toDate = (value?: string | null) => value ? new Date(`${value}T00:00:00`) : null;

async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("未登录，无权操作");
  return { id: session.user.id, isAdmin: Boolean(session.user.isAdmin) };
}

export async function getMonthlyPlanFormContext() {
  try {
    const user = await currentUser();
    return { success: true, data: await getPlanAccess(user.id, user.isAdmin) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "获取计划权限失败" };
  }
}

export async function getMonthlyPlans(filters: MonthlyPlanFilters = {}) {
  try {
    const user = await currentUser();
    const access = await getPlanAccess(user.id, user.isAdmin);
    const data = await prisma.monthlyPlan.findMany({
      where: {
        productLineTeamId: { in: access.visibleTeamIds },
        ...(filters.year ? { year: filters.year } : {}), ...(filters.month ? { month: filters.month } : {}),
        ...(filters.productLineTeamIds && filters.productLineTeamIds.length > 0 ? { productLineTeamId: { in: filters.productLineTeamIds } } : {}), ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: [{ year: "desc" }, { month: "desc" }, { updatedAt: "desc" }],
      include: {
        productLineTeam: { select: { id: true, name: true, members: { where: { role: "LEADER" }, select: { user: { select: { name: true } } } } } },
        _count: { select: { productDeliveries: true, projectDeliveries: true, marketActions: true, costOptimizations: true, aiProductEnablements: true, aiEfficiencies: true, risks: true, resourceRequests: true } },
      },
    });
    return { success: true, data, manageableTeamIds: access.manageableTeams.map((team) => team.id), isAdmin: user.isAdmin };
  } catch (error) {
    console.error("[getMonthlyPlans]", error);
    return { success: false, error: "获取月度计划失败", data: [], manageableTeamIds: [], isAdmin: false };
  }
}

export async function getMonthlyPlanById(id: string) {
  try {
    const user = await currentUser();
    const access = await getPlanAccess(user.id, user.isAdmin);
    const data = await prisma.monthlyPlan.findFirst({
      where: { id, productLineTeamId: { in: access.visibleTeamIds } },
      include: {
        productLineTeam: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } }, updatedBy: { select: { id: true, name: true } },
        productDeliveries: { orderBy: { sortOrder: "asc" } }, projectDeliveries: { orderBy: { sortOrder: "asc" } },
        marketActions: { orderBy: { sortOrder: "asc" } }, costOptimizations: { orderBy: { sortOrder: "asc" } },
        aiProductEnablements: { orderBy: { sortOrder: "asc" } }, aiEfficiencies: { orderBy: { sortOrder: "asc" } },
        risks: { orderBy: { sortOrder: "asc" } }, resourceRequests: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!data) return { success: false, error: "月度计划不存在或无权查看" };
    return { success: true, data, canManage: user.isAdmin || access.manageableTeams.some((team) => team.id === data.productLineTeamId), isAdmin: user.isAdmin };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "获取月度计划失败" };
  }
}

async function replaceMonthlySections(tx: Prisma.TransactionClient, planId: string, input: MonthlyPlanInput) {
  await Promise.all([
    tx.monthlyProductDelivery.deleteMany({ where: { monthlyPlanId: planId } }), tx.monthlyProjectDelivery.deleteMany({ where: { monthlyPlanId: planId } }),
    tx.monthlyMarketAction.deleteMany({ where: { monthlyPlanId: planId } }), tx.monthlyCostOptimization.deleteMany({ where: { monthlyPlanId: planId } }),
    tx.monthlyAiProductEnablement.deleteMany({ where: { monthlyPlanId: planId } }), tx.monthlyAiEfficiency.deleteMany({ where: { monthlyPlanId: planId } }),
    tx.monthlyRisk.deleteMany({ where: { monthlyPlanId: planId } }), tx.monthlyResourceRequest.deleteMany({ where: { monthlyPlanId: planId } }),
  ]);
  if (input.productDeliveries.length) await tx.monthlyProductDelivery.createMany({ data: input.productDeliveries.map((row, sortOrder) => ({ monthlyPlanId: planId, moduleVersion: clean(row.moduleVersion), deliveryContent: clean(row.deliveryContent), plannedCompletionDate: toDate(row.plannedCompletionDate), sortOrder })) });
  if (input.projectDeliveries.length) await tx.monthlyProjectDelivery.createMany({ data: input.projectDeliveries.map((row, sortOrder) => ({ monthlyPlanId: planId, projectName: clean(row.projectName), deliveryContent: clean(row.deliveryContent), plannedCompletionDate: toDate(row.plannedCompletionDate), customerName: clean(row.customerName), sortOrder })) });
  if (input.marketActions.length) await tx.monthlyMarketAction.createMany({ data: input.marketActions.map((row, sortOrder) => ({ monthlyPlanId: planId, productOrProject: clean(row.productOrProject), marketAction: clean(row.marketAction), outputResult: clean(row.outputResult), plannedCompletionDate: toDate(row.plannedCompletionDate), sortOrder })) });
  if (input.costOptimizations.length) await tx.monthlyCostOptimization.createMany({ data: input.costOptimizations.map((row, sortOrder) => ({ monthlyPlanId: planId, optimizationItem: clean(row.optimizationItem), currentProblem: clean(row.currentProblem), optimizationMeasure: clean(row.optimizationMeasure), sortOrder })) });
  if (input.aiProductEnablements.length) await tx.monthlyAiProductEnablement.createMany({ data: input.aiProductEnablements.map((row, sortOrder) => ({ monthlyPlanId: planId, item: clean(row.item), outputResult: clean(row.outputResult), plannedCompletionDate: toDate(row.plannedCompletionDate), sortOrder })) });
  if (input.aiEfficiencies.length) await tx.monthlyAiEfficiency.createMany({ data: input.aiEfficiencies.map((row, sortOrder) => ({ monthlyPlanId: planId, item: clean(row.item), outputResult: clean(row.outputResult), plannedCompletionDate: toDate(row.plannedCompletionDate), sortOrder })) });
  if (input.risks.length) await tx.monthlyRisk.createMany({ data: input.risks.map((row, sortOrder) => ({ monthlyPlanId: planId, riskItem: clean(row.riskItem), riskLevel: row.riskLevel ?? null, impactScope: clean(row.impactScope), responseMeasure: clean(row.responseMeasure), sortOrder })) });
  if (input.resourceRequests.length) await tx.monthlyResourceRequest.createMany({ data: input.resourceRequests.map((row, sortOrder) => ({ monthlyPlanId: planId, requestType: row.requestType ?? null, content: clean(row.content), urgency: row.urgency ?? null, supportDepartment: clean(row.supportDepartment), sortOrder })) });
}

async function saveMonthlyPlan(id: string | null, input: MonthlyPlanInput, publish: boolean) {
  const user = await currentUser();
  const parsed = (publish ? monthlyPublishSchema : monthlyDraftSchema).safeParse(input);
  if (!parsed.success) { const issue = parsed.error.errors[0]; return { success: false, error: issue ? `${issue.path.join(".") || "计划"}：${issue.message}` : "输入数据不合法" }; }
  const data = parsed.data;
  if (id) {
    const existing = await prisma.monthlyPlan.findUnique({ where: { id }, select: { productLineTeamId: true } });
    if (!existing) return { success: false, error: "月度计划不存在" };
    await assertCanManagePlanTeam(existing.productLineTeamId, user);
  }
  await assertCanManagePlanTeam(data.productLineTeamId, user);
  try {
    const plan = await prisma.$transaction(async (tx) => {
      const saved = id
        ? await tx.monthlyPlan.update({ where: { id }, data: { productLineTeamId: data.productLineTeamId, year: data.year, month: data.month, updatedById: user.id, ...(publish ? { status: PlanPublicationStatus.PUBLISHED, publishedAt: new Date() } : {}) } })
        : await tx.monthlyPlan.create({ data: { productLineTeamId: data.productLineTeamId, year: data.year, month: data.month, createdById: user.id, updatedById: user.id, status: publish ? PlanPublicationStatus.PUBLISHED : PlanPublicationStatus.DRAFT, publishedAt: publish ? new Date() : null } });
      await replaceMonthlySections(tx, saved.id, data);
      return saved;
    });
    revalidatePath("/plans"); revalidatePath(`/plans/monthly/${plan.id}`);
    return { success: true, data: plan };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { success: false, error: "该产品线小组在当前月份已存在计划" };
    console.error("[saveMonthlyPlan]", error);
    return { success: false, error: error instanceof Error ? error.message : "保存月度计划失败" };
  }
}

export async function createMonthlyPlanDraft(input: MonthlyPlanInput) { return saveMonthlyPlan(null, input, false); }
export async function updateMonthlyPlanDraft(id: string, input: MonthlyPlanInput) { return saveMonthlyPlan(id, input, false); }
export async function publishMonthlyPlan(id: string | null, input: MonthlyPlanInput) { return saveMonthlyPlan(id, input, true); }

export async function returnMonthlyPlanToDraft(id: string) {
  const user = await currentUser(); if (!user.isAdmin) return { success: false, error: "仅管理员可将计划退回草稿" };
  await prisma.monthlyPlan.update({ where: { id }, data: { status: PlanPublicationStatus.DRAFT, updatedById: user.id } });
  revalidatePath("/plans"); revalidatePath(`/plans/monthly/${id}`); return { success: true };
}

export async function deleteMonthlyPlan(id: string) {
  const user = await currentUser();
  const plan = await prisma.monthlyPlan.findUnique({ where: { id }, select: { status: true, productLineTeamId: true } });
  if (!plan) return { success: false, error: "月度计划不存在" };
  await assertCanManagePlanTeam(plan.productLineTeamId, user);
  if (plan.status === PlanPublicationStatus.PUBLISHED) return { success: false, error: "已发布计划需由管理员退回草稿后才能删除" };
  await prisma.monthlyPlan.delete({ where: { id } }); revalidatePath("/plans"); return { success: true };
}
