"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { taskSchema, TaskInput } from "@/lib/validations/tasks";
import { TaskStatus, Priority, TaskType, NotificationType } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * 获取过滤后的任务列表
 */
export async function getTasks(filters: {
  projectId?: string;
  assigneeId?: string;
  status?: TaskStatus;
  priority?: Priority;
  type?: TaskType;
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
    if (filters.priority) {
      where.priority = filters.priority;
    }
    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { priority: "desc" },
        { sortOrder: "asc" },
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
        requirement: {
          select: { id: true, title: true },
        },
      },
    });

    return { success: true, data: tasks };
  } catch (error) {
    console.error("[getTasks] 获取任务列表失败:", error);
    return { success: false, error: "获取任务列表失败", data: [] };
  }
}

/**
 * 获取单个任务的详细信息（含子任务与评论区）
 */
export async function getTaskById(id: string) {
  try {
    const task = await prisma.task.findUnique({
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
        requirement: {
          select: { id: true, title: true, status: true },
        },
        parent: {
          select: { id: true, title: true, status: true },
        },
        children: {
          orderBy: { createdAt: "asc" },
          include: {
            assignee: { select: { id: true, name: true } },
          },
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

    if (!task) {
      return { success: false, error: "任务不存在" };
    }

    return { success: true, data: task };
  } catch (error) {
    console.error("[getTaskById] 获取任务详情失败:", error);
    return { success: false, error: "获取任务详情失败" };
  }
}

/**
 * 创建任务
 */
export async function createTask(input: TaskInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "数据校验失败" };
  }

  const data = parsed.data;

  try {
    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        status: data.status || TaskStatus.TODO,
        priority: data.priority,
        type: data.type,
        projectId: data.projectId,
        requirementId: data.requirementId ?? null,
        assigneeId: data.assigneeId ?? null,
        parentId: data.parentId ?? null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        estimatedHours: data.estimatedHours ?? null,
        createdById: session.user.id,
      },
    });

    // 触发指派通知
    if (data.assigneeId && data.assigneeId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: data.assigneeId,
          type: NotificationType.TASK_ASSIGNED,
          title: "收到指派任务",
          content: `你收到了由 ${session.user.name} 指派的新任务: ${data.title}`,
          linkUrl: `/tasks/${task.id}`,
        },
      });
    }

    revalidatePath("/tasks");
    revalidatePath(`/projects/${data.projectId}`);
    if (data.requirementId) {
      revalidatePath(`/requirements/${data.requirementId}`);
    }
    return { success: true, data: task };
  } catch (error) {
    console.error("[createTask] 创建任务失败:", error);
    return { success: false, error: "创建任务失败" };
  }
}

/**
 * 修改任务
 */
export async function updateTask(id: string, input: TaskInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "数据校验失败" };
  }

  const data = parsed.data;

  try {
    const oldTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!oldTask) {
      return { success: false, error: "任务不存在" };
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description ?? null,
        status: data.status || undefined,
        priority: data.priority,
        type: data.type,
        projectId: data.projectId,
        requirementId: data.requirementId ?? null,
        assigneeId: data.assigneeId ?? null,
        parentId: data.parentId ?? null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        estimatedHours: data.estimatedHours ?? null,
      },
    });

    // 触发指派变更通知
    if (data.assigneeId && data.assigneeId !== oldTask.assigneeId && data.assigneeId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: data.assigneeId,
          type: NotificationType.TASK_ASSIGNED,
          title: "任务负责人变更",
          content: `${session.user.name} 将任务指派给了你: ${data.title}`,
          linkUrl: `/tasks/${updated.id}`,
        },
      });
    }

    revalidatePath("/tasks");
    revalidatePath(`/tasks/${id}`);
    revalidatePath(`/projects/${data.projectId}`);
    return { success: true, data: updated };
  } catch (error) {
    console.error("[updateTask] 更新任务失败:", error);
    return { success: false, error: "更新任务失败" };
  }
}

/**
 * 拖动看板或快捷修改任务状态
 */
export async function changeTaskStatus(taskId: string, status: TaskStatus) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  try {
    const oldTask = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!oldTask) {
      return { success: false, error: "任务不存在" };
    }

    if (oldTask.status === status) {
      return { success: true };
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { status },
    });

    // 状态流转时通知任务创建人/负责人
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
          type: NotificationType.TASK_UPDATED,
          title: "任务状态流转",
          content: `任务 "${updated.title}" 状态被 ${session.user.name} 变更为: ${status}`,
          linkUrl: `/tasks/${updated.id}`,
        },
      });
    }

    revalidatePath("/tasks");
    revalidatePath(`/tasks/${taskId}`);
    revalidatePath(`/projects/${updated.projectId}`);
    return { success: true, data: updated };
  } catch (error) {
    console.error("[changeTaskStatus] 变更任务状态失败:", error);
    return { success: false, error: "变更任务状态失败" };
  }
}

/**
 * 删除任务
 */
export async function deleteTask(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  try {
    const task = await prisma.task.delete({
      where: { id },
    });

    revalidatePath("/tasks");
    revalidatePath(`/projects/${task.projectId}`);
    return { success: true };
  } catch (error) {
    console.error("[deleteTask] 删除任务失败:", error);
    return { success: false, error: "删除任务失败" };
  }
}

/**
 * 任务讨论区添加评论
 */
export async function addTaskComment(taskId: string, content: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  if (!content.trim()) {
    return { success: false, error: "评论内容不能为空" };
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        taskId,
        authorId: session.user.id,
      },
    });

    revalidatePath(`/tasks/${taskId}`);
    return { success: true, data: comment };
  } catch (error) {
    console.error("[addTaskComment] 添加任务评论失败:", error);
    return { success: false, error: "添加任务评论失败" };
  }
}

/**
 * 获取特定项目下可用于关联的需求
 */
export async function getProjectRequirements(projectId: string) {
  try {
    const requirements = await prisma.requirement.findMany({
      where: {
        projectId: projectId,
        status: {
          in: ["APPROVED", "PLANNED", "IN_PROGRESS"],
        },
      },
      select: {
        id: true,
        title: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: requirements };
  } catch (error) {
    console.error("[getProjectRequirements] 获取项目关联需求失败:", error);
    return { success: false, error: "获取项目关联需求失败", data: [] };
  }
}

/**
 * 获取特定项目下的所有任务列表（用于子任务父级选择）
 */
export async function getProjectTasks(projectId: string) {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        parentId: null, // 仅允许将一级任务作为父任务
      },
      select: {
        id: true,
        title: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: tasks };
  } catch (error) {
    console.error("[getProjectTasks] 获取项目任务列表失败:", error);
    return { success: false, error: "获取项目任务列表失败", data: [] };
  }
}
