"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * 记录审计日志的内部方法 (可由其他 Server Action 调用)
 */
export async function recordAuditLog(
  action: string,
  module: string,
  details: string
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return;

    // 从数据库查询当前用户的最新信息，以保证记录的名字是准确的
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, name: true },
    });

    if (!user) return;

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        username: user.username,
        name: user.name,
        action,
        module,
        details,
      },
    });
  } catch (error) {
    console.error("[recordAuditLog] 记录审计日志失败:", error);
  }
}

/**
 * 获取审计日志列表 (支持分页、模糊搜索、模块过滤)
 */
export async function getAuditLogs(params: {
  page?: number;
  limit?: number;
  query?: string;
  module?: string;
}) {
  try {
    const session = await auth();
    // 只有系统管理员或部门经理能看审计日志
    if (!session?.user?.isAdmin) {
      // 检查层级
      const user = await prisma.user.findUnique({
        where: { id: session?.user?.id || "" },
        select: { level: true },
      });
      if (user?.level !== "部门经理") {
        return { success: false, error: "权限不足，仅管理员或部门经理可查看审计日志", data: null };
      }
    }

    const page = params.page || 1;
    const limit = params.limit || 15;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.module && params.module !== "ALL") {
      where.module = params.module;
    }

    if (params.query) {
      where.OR = [
        { name: { contains: params.query, mode: "insensitive" } },
        { username: { contains: params.query, mode: "insensitive" } },
        { details: { contains: params.query, mode: "insensitive" } },
        { action: { contains: params.query, mode: "insensitive" } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      success: true,
      data: {
        logs,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  } catch (error) {
    console.error("[getAuditLogs] 获取审计日志失败:", error);
    return { success: false, error: "获取审计日志失败", data: null };
  }
}

/**
 * 清空所有审计日志 (仅系统管理员可用)
 */
export async function clearAllAuditLogs() {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return { success: false, error: "权限不足，只有系统管理员可以清空审计日志" };
    }

    await prisma.auditLog.deleteMany({});
    
    // 记录一条清空日志
    await recordAuditLog("DELETE_ALL", "SYSTEM", "清空了系统所有的审计日志");
    
    revalidatePath("/system/audit-logs");
    return { success: true };
  } catch (error) {
    console.error("[clearAllAuditLogs] 清空审计日志失败:", error);
    return { success: false, error: "清空审计日志失败" };
  }
}
