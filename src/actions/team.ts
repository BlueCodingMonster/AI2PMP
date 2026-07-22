"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { memberCreateSchema, memberUpdateSchema, MemberCreateInput, MemberUpdateInput } from "@/lib/validations/team";
import { recordAuditLog } from "@/actions/audit-logs";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
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
        level: true,
        position: true,
        isAdmin: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
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
        level: data.level ?? null,
        position: data.position ?? null,
        isAdmin: data.isAdmin ?? false,
        isActive: data.isActive ?? true,
      },
    });

    await recordAuditLog("CREATE", "USER", `创建了新用户：${user.name} (${user.username})`);
    revalidatePath("/team");
    return { success: true, data: { id: user.id, name: user.name, username: user.username } };
  } catch (error) {
    console.error("[createMember] 创建团队成员失败:", error);
    return { success: false, error: "创建团队成员失败" };
  }
}

/**
 * 更新成员资料
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
    const updateData: Prisma.UserUpdateInput = {
      name: data.name,
      username: data.username,
      phone: data.phone ?? null,
      department: data.department ?? null,
      level: data.level ?? null,
      position: data.position ?? null,
    };

    if (isAdmin) {
      if (data.isAdmin !== undefined) updateData.isAdmin = data.isAdmin;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    await recordAuditLog("UPDATE", "USER", `更新了用户资料：${updated.name} (${updated.username})`);
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
    const user = await prisma.user.findUnique({ where: { id }, select: { name: true, username: true } });
    await prisma.user.delete({
      where: { id },
    });
    if (user) {
      await recordAuditLog("DELETE", "USER", `删除了用户：${user.name} (${user.username})`);
    }
    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("[deleteMember] 彻底删除成员失败:", error);
    // 降级策略：禁用用户
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
      await recordAuditLog("DISABLE", "USER", `禁用了用户（自动降级）：${user.name} (${user.username})`);
      revalidatePath("/team");
      return { success: true, warning: "因该用户已产生业务关联数据，已自动将其变更为「禁用」状态" };
    } catch {
      return { success: false, error: "删除及禁用成员均失败，系统异常" };
    }
  }
}

/**
 * 重置团队成员密码
 */
export async function resetPassword(id: string, newPassword?: string) {
  const session = await auth();
  const isAdmin = session?.user?.isAdmin;
  
  if (!isAdmin) {
    return { success: false, error: "权限不足，只有系统管理员可以重置成员密码" };
  }

  const passwordToUse = newPassword || "123456";

  try {
    const hashedPassword = await bcrypt.hash(passwordToUse, 10);
    const user = await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
      select: { name: true, username: true }
    });
    await recordAuditLog("RESET_PASSWORD", "USER", `重置了用户密码：${user.name} (${user.username})`);
    return { success: true, password: passwordToUse };
  } catch (error) {
    console.error("[resetPassword] 重置成员密码失败:", error);
    return { success: false, error: "重置成员密码失败" };
  }
}
