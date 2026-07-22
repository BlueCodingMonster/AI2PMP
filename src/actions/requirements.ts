"use server";

import { RequirementInput, requirementSchema } from "@/lib/validations/requirements";
import { requirementStatusLabels } from "@/lib/requirements/presentation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Prisma, Priority, RequirementSource, RequirementStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type RequirementFilters = {
  statuses?: RequirementStatus[];
  priority?: Priority;
  source?: RequirementSource;
  productLineTeamIds?: string[];
  search?: string;
  dateType?: "proposedAt" | "createdAt" | "reviewedAt";
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
};

export async function getRequirements(filters: RequirementFilters = {}) {
  try {
    const where: Prisma.RequirementWhereInput = {};
    if (filters.statuses?.length) where.status = { in: filters.statuses };
    if (filters.priority) where.priority = filters.priority;
    if (filters.source) where.source = filters.source;
    if (filters.productLineTeamIds?.length) where.productLineTeamId = { in: filters.productLineTeamIds };

    const dateType = filters.dateType ?? "proposedAt";
    if (filters.dateFrom || filters.dateTo) {
      where[dateType] = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lt: filters.dateTo } : {}),
      };
    }

    const normalized = filters.search?.trim();
    if (normalized) {
      const sequence = /^XQ(\d+)$/i.exec(normalized)?.[1];
      where.OR = [
        { title: { contains: normalized, mode: "insensitive" } },
        { proposer: { contains: normalized, mode: "insensitive" } },
        { createdBy: { is: { name: { contains: normalized, mode: "insensitive" } } } },
        ...(sequence ? [{ sequenceNo: Number(sequence) }] : []),
      ];
    }

    const requestedPage = Math.max(1, Math.floor(filters.page ?? 1));
    const pageSize = [20, 50, 100].includes(filters.pageSize ?? 20) ? (filters.pageSize ?? 20) : 20;
    const total = await prisma.requirement.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const requirements = await prisma.requirement.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { sequenceNo: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        createdBy: { select: { id: true, name: true } },
        productLineTeam: { select: { id: true, name: true } },
      },
    });
    return { success: true, data: requirements, total, page, pageSize, totalPages };
  } catch (error) {
    console.error("[getRequirements] 获取需求列表失败:", error);
    return { success: false, error: "获取需求列表失败", data: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
  }
}

export async function getRequirementById(id: string) {
  try {
    const requirement = await prisma.requirement.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, username: true, department: true } },
        productLineTeam: { select: { id: true, name: true } },
      },
    });
    return requirement
      ? { success: true, data: requirement }
      : { success: false, error: "需求不存在" };
  } catch (error) {
    console.error("[getRequirementById] 获取需求详情失败:", error);
    return { success: false, error: "获取需求详情失败" };
  }
}

import { recordAuditLog } from "@/actions/audit-logs";

export async function createRequirement(input: RequirementInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };

  const parsed = requirementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "输入数据不合法" };
  }

  const data = parsed.data;
  try {
    const requirement = await prisma.requirement.create({
      data: {
        title: data.title,
        summary: data.summary || null,
        status: data.status,
        source: data.source,
        priority: data.priority,
        productLineTeamId: data.productLineTeamId || null,
        proposer: data.proposer || null,
        proposedAt: data.proposedAt ? new Date(data.proposedAt) : null,
        reviewedAt: data.reviewedAt ? new Date(data.reviewedAt) : null,
        createdAt: new Date(data.createdAt),
        createdById: session.user.id,
      },
    });
    await recordAuditLog("CREATE", "REQUIREMENT", `创建了需求：${requirement.title}`);
    revalidatePath("/requirements");
    return { success: true, data: requirement };
  } catch (error) {
    console.error("[createRequirement] 创建需求失败:", error);
    return { success: false, error: "创建需求失败" };
  }
}

export async function updateRequirement(id: string, input: RequirementInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };

  const parsed = requirementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "输入数据不合法" };
  }

  try {
    const existing = await prisma.requirement.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "需求不存在" };
    if (existing.createdById !== session.user.id && !session.user.isAdmin) {
      return { success: false, error: "无权编辑他人创建的需求" };
    }

    const data = parsed.data;
    const updated = await prisma.requirement.update({
      where: { id },
      data: {
        title: data.title,
        summary: data.summary || null,
        status: data.status,
        source: data.source,
        priority: data.priority,
        productLineTeamId: data.productLineTeamId || null,
        proposer: data.proposer || null,
        proposedAt: data.proposedAt ? new Date(data.proposedAt) : null,
        reviewedAt: data.reviewedAt ? new Date(data.reviewedAt) : null,
        createdAt: new Date(data.createdAt),
      },
    });

    await recordAuditLog("UPDATE", "REQUIREMENT", `修改了需求信息：${updated.title}`);
    revalidatePath("/requirements");
    revalidatePath(`/requirements/${id}`);
    return { success: true, data: updated };
  } catch (error) {
    console.error("[updateRequirement] 更新需求失败:", error);
    return { success: false, error: "更新需求失败" };
  }
}

export async function deleteRequirement(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };

  try {
    const requirement = await prisma.requirement.findUnique({ where: { id } });
    if (!requirement) return { success: false, error: "需求不存在" };
    if (requirement.createdById !== session.user.id && !session.user.isAdmin) {
      return { success: false, error: "无权删除他人创建的需求" };
    }
    await prisma.requirement.delete({ where: { id } });
    await recordAuditLog("DELETE", "REQUIREMENT", `删除了需求：${requirement.title}`);
    revalidatePath("/requirements");
    return { success: true };
  } catch (error) {
    console.error("[deleteRequirement] 删除需求失败:", error);
    return { success: false, error: "删除需求失败" };
  }
}

export async function getAssignees() {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, username: true, email: true },
      orderBy: { name: "asc" },
    });
    return { success: true, data: users };
  } catch (error) {
    console.error("[getAssignees] 获取用户列表失败:", error);
    return { success: false, error: "获取用户列表失败", data: [] };
  }
}

export async function getProjectsList() {
  try {
    const projects = await prisma.project.findMany({
      select: { id: true, name: true, key: true },
      orderBy: { name: "asc" },
    });
    return { success: true, data: projects };
  } catch (error) {
    console.error("[getProjectsList] 获取项目列表失败:", error);
    return { success: false, error: "获取项目列表失败", data: [] };
  }
}
