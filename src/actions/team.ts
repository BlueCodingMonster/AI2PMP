"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { memberCreateSchema, memberUpdateSchema, MemberCreateInput, MemberUpdateInput } from "@/lib/validations/team";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

/**
 * 获取团队成员（所有用户）列表
 */
export async function getMembers() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        department: true,
        isAdmin: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            assignedRequirements: true,
            assignedTasks: true,
            assignedBugs: true,
            projectMemberships: true,
          },
        },
      },
    });
    return { success: true, data: users };
  } catch (error) {
    console.error("[getMembers] 获取团队成员失败:", error);
    return { success: false, error: "获取团队成员失败", data: [] };
  }
}

/**
 * 创建新成员（注册新用户）
 */
export async function createMember(input: MemberCreateInput) {
  const session = await auth();
  // 仅限管理员创建新成员
  if (!session?.user?.isAdmin) {
    return { success: false, error: "权限不足，只有系统管理员可以创建新成员" };
  }

  const parsed = memberCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "校验数据失败" };
  }

  const data = parsed.data;

  try {
    // 检查登录名是否已被注册
    const existing = await prisma.user.findUnique({
      where: { username: data.username },
    });
    if (existing) {
      return { success: false, error: `登录名 "${data.username}" 已被占用` };
    }

    // 哈希密码 (10 轮)
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        email: null,
        password: hashedPassword,
        phone: data.phone ?? null,
        department: data.department ?? null,
        isAdmin: data.isAdmin ?? false,
        isActive: data.isActive ?? true,
      },
    });

    revalidatePath("/team");
    return { success: true, data: { id: user.id, name: user.name, username: user.username } };
  } catch (error) {
    console.error("[createMember] 创建团队成员失败:", error);
    return { success: false, error: "创建团队成员失败" };
  }
}

/**
 * 更新团队成员信息
 */
export async function updateMember(id: string, input: MemberUpdateInput) {
  const session = await auth();
  
  // 只有管理员，或者用户本人可以修改自己的信息
  const isSelf = session?.user?.id === id;
  const isAdmin = session?.user?.isAdmin;
  if (!isSelf && !isAdmin) {
    return { success: false, error: "权限不足，无法修改他人信息" };
  }

  const parsed = memberUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "校验数据失败" };
  }

  const data = parsed.data;

  try {
    // 检查登录名冲突
    const existing = await prisma.user.findFirst({
      where: {
        username: data.username,
        NOT: { id },
      },
    });
    if (existing) {
      return { success: false, error: `登录名 "${data.username}" 已被占用` };
    }

    // 组装数据：非管理员不能自行升级为管理员或启用/禁用自己
    const updateData: any = {
      name: data.name,
      username: data.username,
      phone: data.phone ?? null,
      department: data.department ?? null,
    };

    if (isAdmin) {
      if (data.isAdmin !== undefined) updateData.isAdmin = data.isAdmin;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/team");
    return { success: true, data: updated };
  } catch (error) {
    console.error("[updateMember] 更新团队成员失败:", error);
    return { success: false, error: "更新团队成员失败" };
  }
}

/**
 * 彻底删除团队成员（若有项目/任务等强关联则会捕获错误并提示改为禁用）
 */
export async function deleteMember(id: string) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return { success: false, error: "权限不足，只有系统管理员可以删除成员" };
  }

  if (session.user.id === id) {
    return { success: false, error: "无法删除自己" };
  }

  try {
    await prisma.user.delete({
      where: { id },
    });
    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("[deleteMember] 彻底删除成员失败:", error);
    // 降级策略：禁用用户
    try {
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
      revalidatePath("/team");
      return { success: true, warning: "因该用户已产生业务关联数据，已自动将其变更为「禁用」状态" };
    } catch (err) {
      return { success: false, error: "删除及禁用成员均失败，系统异常" };
    }
  }
}
