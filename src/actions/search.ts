"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ManagedTaskStatus } from "@prisma/client";

export async function globalSearch(query: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录" };
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return { success: true, data: { projects: [], tasks: [], members: [] } };
  }

  try {
    // 1. 搜索项目 (Project)
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { name: { contains: trimmed, mode: "insensitive" } },
          { key: { contains: trimmed, mode: "insensitive" } },
          { customerName: { contains: trimmed, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        key: true,
      },
      take: 5,
    });

    // 2. 搜索任务 (ManagedTask)
    // 部门经理/管理员能搜所有任务；普通员工只能搜索自己所在小组的任务
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { level: true, productLineMemberships: { select: { teamId: true } } },
    });
    const isDeptManager = dbUser?.level === "部门经理";
    const myTeamIds = dbUser?.productLineMemberships.map((m) => m.teamId) || [];

    const taskWhereClause: any = {
      OR: [
        { title: { contains: trimmed, mode: "insensitive" } },
        { description: { contains: trimmed, mode: "insensitive" } },
      ],
    };

    if (!isDeptManager) {
      taskWhereClause.productLineTeamId = { in: myTeamIds };
    }

    const tasks = await prisma.managedTask.findMany({
      where: taskWhereClause,
      select: {
        id: true,
        title: true,
        sequenceNo: true,
      },
      take: 5,
    });

    // 3. 搜索成员 (User)
    const members = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: trimmed, mode: "insensitive" } },
          { username: { contains: trimmed, mode: "insensitive" } },
          { department: { contains: trimmed, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        department: true,
        position: true,
      },
      take: 5,
    });

    return {
      success: true,
      data: {
        projects,
        tasks,
        members,
      },
    };
  } catch (error) {
    console.error("[globalSearch] error:", error);
    return { success: false, error: "搜索出错" };
  }
}
