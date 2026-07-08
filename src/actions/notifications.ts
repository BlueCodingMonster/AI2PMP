"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * 获取当前用户的通知列表
 */
export async function getNotifications() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作", data: [] };
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: notifications };
  } catch (error) {
    console.error("[getNotifications] 获取通知列表失败:", error);
    return { success: false, error: "获取通知列表失败", data: [] };
  }
}

/**
 * 获取当前用户的未读通知数
 */
export async function getUnreadCount() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: true, data: 0 };
  }

  try {
    const count = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    });
    return { success: true, data: count };
  } catch (error) {
    console.error("[getUnreadCount] 获取未读数失败:", error);
    return { success: true, data: 0 };
  }
}

/**
 * 标记特定通知为已读
 */
export async function markAsRead(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  try {
    await prisma.notification.update({
      where: { id, userId: session.user.id },
      data: { isRead: true },
    });

    revalidatePath("/notifications");
    return { success: true };
  } catch (error) {
    console.error("[markAsRead] 标记通知已读失败:", error);
    return { success: false, error: "标记已读失败" };
  }
}

/**
 * 一键标记全部已读
 */
export async function markAllAsRead() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  try {
    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    revalidatePath("/notifications");
    return { success: true };
  } catch (error) {
    console.error("[markAllAsRead] 标记全部已读失败:", error);
    return { success: false, error: "标记全部已读失败" };
  }
}
