"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { projectSchema, ProjectInput } from "@/lib/validations/projects";
import { ProjectStatus, ProjectRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * 获取项目列表，包括相关的统计数值
 */
export async function getProjects() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, username: true, email: true },
            },
          },
        },
        _count: {
          select: {
            requirements: true,
            tasks: true,
            bugs: true,
          },
        },
      },
    });
    return { success: true, data: projects };
  } catch (error) {
    console.error("[getProjects] 获取项目列表失败:", error);
    return { success: false, error: "获取项目列表失败", data: [] };
  }
}

/**
 * 获取项目详情
 */
export async function getProjectById(id: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        members: {
          orderBy: { joinedAt: "asc" },
          include: {
            user: {
              select: { id: true, name: true, username: true, email: true, department: true },
            },
          },
        },
        requirements: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            type: true,
          },
        },
        tasks: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
        bugs: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            status: true,
            severity: true,
          },
        },
      },
    });

    if (!project) {
      return { success: false, error: "项目不存在" };
    }

    return { success: true, data: project };
  } catch (error) {
    console.error("[getProjectById] 获取项目详情失败:", error);
    return { success: false, error: "获取项目详情失败" };
  }
}

/**
 * 创建项目
 */
export async function createProject(input: ProjectInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "数据校验失败" };
  }

  const data = parsed.data;

  try {
    // 检查项目 Key 是否唯一
    const existingKey = await prisma.project.findUnique({
      where: { key: data.key },
    });
    if (existingKey) {
      return { success: false, error: `项目键(Key) "${data.key}" 已被其他项目占用` };
    }

    // 事务创建项目并添加创建者为 OWNER 角色成员
    const project = await prisma.$transaction(async (tx) => {
      const proj = await tx.project.create({
        data: {
          name: data.name,
          key: data.key,
          description: data.description ?? null,
          status: data.status || ProjectStatus.PLANNING,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          createdById: session.user.id,
        },
      });

      await tx.projectMember.create({
        data: {
          projectId: proj.id,
          userId: session.user.id,
          role: ProjectRole.OWNER,
        },
      });

      return proj;
    });

    revalidatePath("/projects");
    return { success: true, data: project };
  } catch (error) {
    console.error("[createProject] 创建项目失败:", error);
    return { success: false, error: "创建项目失败" };
  }
}

/**
 * 更新项目
 */
export async function updateProject(id: string, input: ProjectInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "数据校验失败" };
  }

  const data = parsed.data;

  try {
    // 检查项目 Key 是否唯一（排除当前项目）
    const existingKey = await prisma.project.findFirst({
      where: {
        key: data.key,
        NOT: { id },
      },
    });
    if (existingKey) {
      return { success: false, error: `项目键(Key) "${data.key}" 已被其他项目占用` };
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        name: data.name,
        key: data.key,
        description: data.description ?? null,
        status: data.status || undefined,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    return { success: true, data: updated };
  } catch (error) {
    console.error("[updateProject] 更新项目失败:", error);
    return { success: false, error: "更新项目失败" };
  }
}

/**
 * 删除项目
 */
export async function deleteProject(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  try {
    // 检查项目是否存在
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        members: true,
      },
    });

    if (!project) {
      return { success: false, error: "项目不存在" };
    }

    // 校验权限：项目创建人，或 OWNER，或者是管理员
    const isOwner = project.members.some(
      (m) => m.userId === session.user.id && m.role === ProjectRole.OWNER
    );
    const hasPermission = project.createdById === session.user.id || isOwner || session.user.isAdmin;
    if (!hasPermission) {
      return { success: false, error: "无权删除该项目，只有项目拥有者或管理员可以删除" };
    }

    // 删除项目（级联删除会清理 ProjectMember, Tasks, Bugs 等，注意配置了 onDelete: Cascade）
    await prisma.project.delete({
      where: { id },
    });

    revalidatePath("/projects");
    return { success: true };
  } catch (error) {
    console.error("[deleteProject] 删除项目失败:", error);
    return { success: false, error: "删除项目失败，请重试" };
  }
}

/**
 * 为项目添加团队成员
 */
export async function addProjectMember(projectId: string, userId: string, role: ProjectRole) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  try {
    // 检查是否已经是成员
    const existing = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    if (existing) {
      return { success: false, error: "该用户已经是此项目的成员了" };
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role,
      },
      include: {
        user: { select: { name: true } },
      },
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: member };
  } catch (error) {
    console.error("[addProjectMember] 添加项目成员失败:", error);
    return { success: false, error: "添加项目成员失败" };
  }
}

/**
 * 修改项目成员的角色
 */
export async function updateProjectMemberRole(projectId: string, userId: string, role: ProjectRole) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  try {
    const updated = await prisma.projectMember.update({
      where: {
        projectId_userId: { projectId, userId },
      },
      data: { role },
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: updated };
  } catch (error) {
    console.error("[updateProjectMemberRole] 更新项目成员角色失败:", error);
    return { success: false, error: "更新项目成员角色失败" };
  }
}

/**
 * 移出项目成员
 */
export async function removeProjectMember(projectId: string, userId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  try {
    // OWNER 角色一般不能直接移除，需要先转交
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    if (!member) {
      return { success: false, error: "成员不存在于项目中" };
    }

    if (member.role === ProjectRole.OWNER) {
      return { success: false, error: "项目拥有者(OWNER)不能被移除。若要退出，请转让拥有者身份" };
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error("[removeProjectMember] 移除项目成员失败:", error);
    return { success: false, error: "移除项目成员失败" };
  }
}
