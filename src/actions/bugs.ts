"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { bugSchema, BugInput } from "@/lib/validations/bugs";
import { BugStatus, BugSeverity, Priority, NotificationType } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * 获取过滤后的缺陷(Bug)列表
 */
export async function getBugs(filters: {
  projectId?: string;
  assigneeId?: string;
  status?: BugStatus;
  severity?: BugSeverity;
  priority?: Priority;
  search?: string;
} = {}) {
  try {
    const where: any = {};

    if (filters.projectId) {
      where.projectId = filters.projectId;
    }
    if (filters.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.severity) {
      where.severity = filters.severity;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const bugs = await prisma.bug.findMany({
      where,
      orderBy: [
        { priority: "desc" },
        { severity: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        project: {
          select: { id: true, name: true, key: true },
        },
        assignee: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    return { success: true, data: bugs };
  } catch (error) {
    console.error("[getBugs] 获取缺陷列表失败:", error);
    return { success: false, error: "获取缺陷列表失败", data: [] };
  }
}

/**
 * 获取单个缺陷(Bug)详情与评论区
 */
export async function getBugById(id: string) {
  try {
    const bug = await prisma.bug.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, key: true },
        },
        assignee: {
          select: { id: true, name: true, username: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        comments: {
          orderBy: { createdAt: "desc" },
          include: {
            author: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!bug) {
      return { success: false, error: "缺陷不存在" };
    }

    return { success: true, data: bug };
  } catch (error) {
    console.error("[getBugById] 获取缺陷详情失败:", error);
    return { success: false, error: "获取缺陷详情失败" };
  }
}

/**
 * 创建缺陷(Bug)
 */
export async function createBug(input: BugInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  const parsed = bugSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "数据校验失败" };
  }

  const data = parsed.data;

  try {
    const bug = await prisma.bug.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        status: data.status || BugStatus.OPEN,
        severity: data.severity,
        priority: data.priority,
        projectId: data.projectId,
        assigneeId: data.assigneeId ?? null,
        environment: data.environment ?? null,
        stepsToReproduce: data.stepsToReproduce ?? null,
        createdById: session.user.id,
      },
    });

    // 触发指派缺陷通知
    if (data.assigneeId && data.assigneeId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: data.assigneeId,
          type: NotificationType.BUG_ASSIGNED,
          title: "收到缺陷指派",
          content: `你收到了由 ${session.user.name} 指派的新缺陷: ${data.title}`,
          linkUrl: `/bugs/${bug.id}`,
        },
      });
    }

    revalidatePath("/bugs");
    revalidatePath(`/projects/${data.projectId}`);
    return { success: true, data: bug };
  } catch (error) {
    console.error("[createBug] 创建缺陷失败:", error);
    return { success: false, error: "创建缺陷失败" };
  }
}

/**
 * 修改缺陷(Bug)
 */
export async function updateBug(id: string, input: BugInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  const parsed = bugSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "数据校验失败" };
  }

  const data = parsed.data;

  try {
    const oldBug = await prisma.bug.findUnique({
      where: { id },
    });

    if (!oldBug) {
      return { success: false, error: "缺陷不存在" };
    }

    const updated = await prisma.bug.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description ?? null,
        status: data.status || undefined,
        severity: data.severity,
        priority: data.priority,
        projectId: data.projectId,
        assigneeId: data.assigneeId ?? null,
        environment: data.environment ?? null,
        stepsToReproduce: data.stepsToReproduce ?? null,
      },
    });

    // 触发指派变更通知
    if (data.assigneeId && data.assigneeId !== oldBug.assigneeId && data.assigneeId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: data.assigneeId,
          type: NotificationType.BUG_ASSIGNED,
          title: "缺陷负责人变更",
          content: `${session.user.name} 将缺陷指派给了你: ${data.title}`,
          linkUrl: `/bugs/${updated.id}`,
        },
      });
    }

    revalidatePath("/bugs");
    revalidatePath(`/bugs/${id}`);
    revalidatePath(`/projects/${data.projectId}`);
    return { success: true, data: updated };
  } catch (error) {
    console.error("[updateBug] 更新缺陷失败:", error);
    return { success: false, error: "更新缺陷失败" };
  }
}

/**
 * 快捷修改缺陷状态
 */
export async function changeBugStatus(bugId: string, status: BugStatus) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  try {
    const oldBug = await prisma.bug.findUnique({
      where: { id: bugId },
    });

    if (!oldBug) {
      return { success: false, error: "缺陷不存在" };
    }

    if (oldBug.status === status) {
      return { success: true };
    }

    const updated = await prisma.bug.update({
      where: { id: bugId },
      data: { status },
    });

    // 状态变更有通知
    const notificationReceivers = new Set<string>();
    if (updated.assigneeId && updated.assigneeId !== session.user.id) {
      notificationReceivers.add(updated.assigneeId);
    }
    if (updated.createdById && updated.createdById !== session.user.id) {
      notificationReceivers.add(updated.createdById);
    }

    for (const userId of notificationReceivers) {
      await prisma.notification.create({
        data: {
          userId,
          type: NotificationType.BUG_UPDATED,
          title: "缺陷状态变更",
          content: `缺陷 "${updated.title}" 状态被 ${session.user.name} 变更为: ${status}`,
          linkUrl: `/bugs/${updated.id}`,
        },
      });
    }

    revalidatePath("/bugs");
    revalidatePath(`/bugs/${bugId}`);
    revalidatePath(`/projects/${updated.projectId}`);
    return { success: true, data: updated };
  } catch (error) {
    console.error("[changeBugStatus] 变更缺陷状态失败:", error);
    return { success: false, error: "变更缺陷状态失败" };
  }
}

/**
 * 删除缺陷
 */
export async function deleteBug(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  try {
    const bug = await prisma.bug.delete({
      where: { id },
    });

    revalidatePath("/bugs");
    revalidatePath(`/projects/${bug.projectId}`);
    return { success: true };
  } catch (error) {
    console.error("[deleteBug] 删除缺陷失败:", error);
    return { success: false, error: "删除缺陷失败" };
  }
}

/**
 * 缺陷评论区发帖
 */
export async function addBugComment(bugId: string, content: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  if (!content.trim()) {
    return { success: false, error: "回复内容不能为空" };
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        bugId,
        authorId: session.user.id,
      },
    });

    revalidatePath(`/bugs/${bugId}`);
    return { success: true, data: comment };
  } catch (error) {
    console.error("[addBugComment] 添加缺陷评论失败:", error);
    return { success: false, error: "添加缺陷评论失败" };
  }
}
