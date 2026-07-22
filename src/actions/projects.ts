"use server";

import { Prisma, ProjectRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectSchema, projectVersionSchema, type ProjectInput } from "@/lib/validations/projects";

const projectInclude = {
  createdBy: { select: { id: true, name: true } },
  projectManager: { select: { id: true, name: true, username: true, department: true, position: true } },
  versions: { orderBy: { createdAt: "desc" as const }, select: { id: true, version: true } },
  members: { include: { user: { select: { id: true, name: true, username: true, email: true, department: true } } } },
};

function dateOrNull(value: string | Date | null | undefined) {
  return value ? new Date(value) : null;
}

function projectData(data: ProjectInput) {
  return {
    name: data.name,
    key: data.key,
    customerName: data.customerName,
    customerContact: data.customerContact || null,
    customerPhone: data.customerPhone || null,
    projectManagerId: data.projectManagerId,
    marketManager: data.marketManager || null,
    salesManager: data.salesManager || null,
    contractNumber: data.contractNumber || null,
    contractAmount: data.contractAmount ? new Prisma.Decimal(data.contractAmount) : null,
    contractSignedAt: dateOrNull(data.contractSignedAt),
    warrantyMonths: data.warrantyMonths ?? null,
    warrantyExpiresAt: dateOrNull(data.warrantyExpiresAt),
    status: data.status,
    acceptanceDate: dateOrNull(data.acceptanceDate),
    description: data.description || null,
  };
}

export async function getProjects() {
  try {
    const projects = await prisma.project.findMany({ orderBy: { updatedAt: "desc" }, include: projectInclude });
    return { success: true, data: projects };
  } catch (error) {
    console.error("[getProjects] 获取项目列表失败:", error);
    return { success: false, error: "获取项目列表失败", data: [] };
  }
}

export async function getProjectById(id: string) {
  try {
    const project = await prisma.project.findUnique({ where: { id }, include: projectInclude });
    return project ? { success: true, data: project } : { success: false, error: "项目不存在" };
  } catch (error) {
    console.error("[getProjectById] 获取项目详情失败:", error);
    return { success: false, error: "获取项目详情失败" };
  }
}

import { recordAuditLog } from "@/actions/audit-logs";

export async function createProject(input: ProjectInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "数据校验失败" };

  try {
    const project = await prisma.project.create({
      data: { ...projectData(parsed.data), createdById: session.user.id },
      select: { id: true, name: true, key: true },
    });
    await recordAuditLog("CREATE", "PROJECT", `创建了项目：${project.name} (${project.key})`);
    revalidatePath("/projects");
    return { success: true, data: project };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { success: false, error: "项目编号已存在" };
    console.error("[createProject] 创建项目失败:", error);
    return { success: false, error: "创建项目失败" };
  }
}

export async function updateProject(id: string, input: ProjectInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "数据校验失败" };

  try {
    const updated = await prisma.project.update({ where: { id }, data: projectData(parsed.data) });
    await recordAuditLog("UPDATE", "PROJECT", `修改了项目信息：${updated.name} (${updated.key})`);
    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { success: false, error: "项目编号已存在" };
    console.error("[updateProject] 更新项目失败:", error);
    return { success: false, error: "更新项目失败" };
  }
}

export async function deleteProject(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };

  try {
    const project = await prisma.project.findUnique({ where: { id }, include: { _count: { select: { versions: true } } } });
    if (!project) return { success: false, error: "项目不存在" };
    if (project._count.versions) return { success: false, error: "该项目存在版本记录，只能设为完成归档，不能删除" };
    await prisma.project.delete({ where: { id } });
    await recordAuditLog("DELETE", "PROJECT", `删除了项目：${project.name} (${project.key})`);
    revalidatePath("/projects");
    return { success: true };
  } catch (error) {
    console.error("[deleteProject] 删除项目失败:", error);
    return { success: false, error: "删除项目失败" };
  }
}

export async function createProjectVersion(input: { projectId: string; version: string }) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };
  const parsed = projectVersionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "数据校验失败" };
  try {
    await prisma.projectVersion.create({ data: parsed.data });
    revalidatePath("/projects");
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { success: false, error: "该项目下版本号已存在" };
    return { success: false, error: "新增项目版本失败" };
  }
}

export async function updateProjectVersion(id: string, version: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };
  const parsed = projectVersionSchema.pick({ version: true }).safeParse({ version });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "数据校验失败" };
  try {
    await prisma.projectVersion.update({ where: { id }, data: parsed.data });
    revalidatePath("/projects");
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { success: false, error: "该项目下版本号已存在" };
    return { success: false, error: "编辑项目版本失败" };
  }
}

export async function deleteProjectVersion(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };
  try {
    await prisma.projectVersion.delete({ where: { id } });
    revalidatePath("/projects");
    return { success: true };
  } catch {
    return { success: false, error: "删除项目版本失败" };
  }
}

// Legacy project-member actions remain for compatibility with existing task data.
export async function addProjectMember(projectId: string, userId: string, role: ProjectRole) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };
  try {
    const member = await prisma.projectMember.create({ data: { projectId, userId, role }, include: { user: { select: { name: true } } } });
    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: member };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { success: false, error: "该用户已经是项目成员" };
    return { success: false, error: "添加项目成员失败" };
  }
}

export async function updateProjectMemberRole(projectId: string, userId: string, role: ProjectRole) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };
  try {
    const updated = await prisma.projectMember.update({ where: { projectId_userId: { projectId, userId } }, data: { role } });
    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: updated };
  } catch {
    return { success: false, error: "修改项目成员角色失败" };
  }
}

export async function removeProjectMember(projectId: string, userId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };
  try {
    const member = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
    if (!member) return { success: false, error: "成员不存在于项目中" };
    if (member.role === ProjectRole.OWNER) return { success: false, error: "项目拥有者不能被移除" };
    await prisma.projectMember.delete({ where: { projectId_userId: { projectId, userId } } });
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch {
    return { success: false, error: "移出项目成员失败" };
  }
}
