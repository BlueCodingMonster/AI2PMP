"use server";

import { Prisma, PlanPublicationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCanManagePlanTeam, getPlanAccess } from "@/lib/plans/permissions";
import {
  QuarterlyPlanInput,
  quarterlyDraftSchema,
  quarterlyPublishSchema,
} from "@/lib/validations/quarterly-plans";

export type QuarterlyPlanFilters = { year?: number; quarter?: number; productLineTeamIds?: string[]; status?: PlanPublicationStatus };

const clean = (value?: string | null) => value?.trim() || null;
const firstError = (error: { errors: Array<{ message: string; path: Array<string | number> }> }) => {
  const issue = error.errors[0];
  return issue ? `${issue.path.join(".") || "计划"}：${issue.message}` : "输入数据不合法";
};

async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("未登录，无权操作");
  return { id: session.user.id, isAdmin: Boolean(session.user.isAdmin) };
}

export async function getQuarterlyPlanFormContext() {
  try {
    const user = await currentUser();
    const access = await getPlanAccess(user.id, user.isAdmin);
    return { success: true, data: access };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "获取计划权限失败" };
  }
}

export async function getQuarterlyPlans(filters: QuarterlyPlanFilters = {}) {
  try {
    const user = await currentUser();
    const access = await getPlanAccess(user.id, user.isAdmin);
    const where: Prisma.QuarterlyPlanWhereInput = {
      productLineTeamId: { in: access.visibleTeamIds },
      ...(filters.year ? { year: filters.year } : {}),
      ...(filters.quarter ? { quarter: filters.quarter } : {}),
      ...(filters.productLineTeamIds && filters.productLineTeamIds.length > 0 ? { productLineTeamId: { in: filters.productLineTeamIds } } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };
    const data = await prisma.quarterlyPlan.findMany({
      where,
      orderBy: [{ year: "desc" }, { quarter: "desc" }, { updatedAt: "desc" }],
      include: {
        productLineTeam: { select: { id: true, name: true, members: { where: { role: "LEADER" }, select: { user: { select: { name: true } } } } } },
        _count: { select: { goals: true, risks: true } },
      },
    });
    return { success: true, data, manageableTeamIds: access.manageableTeams.map((team) => team.id), isAdmin: user.isAdmin };
  } catch (error) {
    console.error("[getQuarterlyPlans]", error);
    return { success: false, error: "获取季度计划失败", data: [], manageableTeamIds: [], isAdmin: false };
  }
}

export async function getQuarterlyPlanById(id: string) {
  try {
    const user = await currentUser();
    const access = await getPlanAccess(user.id, user.isAdmin);
    const data = await prisma.quarterlyPlan.findFirst({
      where: { id, productLineTeamId: { in: access.visibleTeamIds } },
      include: {
        productLineTeam: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
        goals: { orderBy: { sortOrder: "asc" } },
        risks: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!data) return { success: false, error: "季度计划不存在或无权查看" };
    return { success: true, data, canManage: user.isAdmin || access.manageableTeams.some((team) => team.id === data.productLineTeamId), isAdmin: user.isAdmin };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "获取季度计划失败" };
  }
}

async function replaceRows(tx: Prisma.TransactionClient, planId: string, input: QuarterlyPlanInput) {
  await tx.quarterlyGoal.deleteMany({ where: { quarterlyPlanId: planId } });
  await tx.quarterlyRisk.deleteMany({ where: { quarterlyPlanId: planId } });
  if (input.goals.length) await tx.quarterlyGoal.createMany({ data: input.goals.map((goal, index) => ({
    quarterlyPlanId: planId, domain: goal.domain ?? null, quarterlyGoal: clean(goal.quarterlyGoal), successCriteria: clean(goal.successCriteria),
    month1Goal: clean(goal.month1Goal), month1Status: goal.month1Status ?? null, month2Goal: clean(goal.month2Goal), month2Status: goal.month2Status ?? null,
    month3Goal: clean(goal.month3Goal), month3Status: goal.month3Status ?? null, currentCompletion: clean(goal.currentCompletion), achievementRate: goal.achievementRate ?? 0,
    quarterlyStatus: goal.quarterlyStatus ?? null, keyDependencies: clean(goal.keyDependencies), notes: clean(goal.notes), sortOrder: index,
  })) });
  if (input.risks.length) await tx.quarterlyRisk.createMany({ data: input.risks.map((risk, index) => ({
    quarterlyPlanId: planId, riskDescription: clean(risk.riskDescription), affectedMilestone: clean(risk.affectedMilestone), probability: risk.probability ?? null,
    impact: risk.impact ?? null, overallLevel: risk.overallLevel ?? null, triggerCondition: clean(risk.triggerCondition), responseStrategy: clean(risk.responseStrategy),
    warningPoint: clean(risk.warningPoint), status: risk.status ?? null, sortOrder: index,
  })) });
}

async function saveQuarterlyPlan(id: string | null, input: QuarterlyPlanInput, publish: boolean) {
  const user = await currentUser();
  const parsed = (publish ? quarterlyPublishSchema : quarterlyDraftSchema).safeParse(input);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };
  const data = parsed.data;
  if (id) {
    const existing = await prisma.quarterlyPlan.findUnique({ where: { id }, select: { productLineTeamId: true } });
    if (!existing) return { success: false, error: "季度计划不存在" };
    await assertCanManagePlanTeam(existing.productLineTeamId, user);
  }
  await assertCanManagePlanTeam(data.productLineTeamId, user);
  try {
    const plan = await prisma.$transaction(async (tx) => {
      const saved = id
        ? await tx.quarterlyPlan.update({ where: { id }, data: { productLineTeamId: data.productLineTeamId, year: data.year, quarter: data.quarter, updatedById: user.id, ...(publish ? { status: PlanPublicationStatus.PUBLISHED, publishedAt: new Date() } : {}) } })
        : await tx.quarterlyPlan.create({ data: { productLineTeamId: data.productLineTeamId, year: data.year, quarter: data.quarter, createdById: user.id, updatedById: user.id, status: publish ? PlanPublicationStatus.PUBLISHED : PlanPublicationStatus.DRAFT, publishedAt: publish ? new Date() : null } });
      await replaceRows(tx, saved.id, data);
      return saved;
    });
    revalidatePath("/plans"); revalidatePath(`/plans/quarterly/${plan.id}`);
    return { success: true, data: plan };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { success: false, error: "该产品线小组在当前季度已存在计划" };
    console.error("[saveQuarterlyPlan]", error);
    return { success: false, error: error instanceof Error ? error.message : "保存季度计划失败" };
  }
}

export async function createQuarterlyPlanDraft(input: QuarterlyPlanInput) { return saveQuarterlyPlan(null, input, false); }
export async function updateQuarterlyPlanDraft(id: string, input: QuarterlyPlanInput) { return saveQuarterlyPlan(id, input, false); }
export async function publishQuarterlyPlan(id: string | null, input: QuarterlyPlanInput) { return saveQuarterlyPlan(id, input, true); }

export async function returnQuarterlyPlanToDraft(id: string) {
  const user = await currentUser();
  if (!user.isAdmin) return { success: false, error: "仅管理员可将计划退回草稿" };
  await prisma.quarterlyPlan.update({ where: { id }, data: { status: PlanPublicationStatus.DRAFT, updatedById: user.id } });
  revalidatePath("/plans"); revalidatePath(`/plans/quarterly/${id}`);
  return { success: true };
}

export async function deleteQuarterlyPlan(id: string) {
  const user = await currentUser();
  const plan = await prisma.quarterlyPlan.findUnique({ where: { id }, select: { status: true, productLineTeamId: true } });
  if (!plan) return { success: false, error: "季度计划不存在" };
  await assertCanManagePlanTeam(plan.productLineTeamId, user);
  if (plan.status === PlanPublicationStatus.PUBLISHED) return { success: false, error: "已发布计划需由管理员退回草稿后才能删除" };
  await prisma.quarterlyPlan.delete({ where: { id } });
  revalidatePath("/plans");
  return { success: true };
}
