"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

/**
 * 修改个人基本信息
 */
export async function updateProfile(input: { name: string; email: string | null; phone: string | null }) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，请重新登录" };
  }

  const { name, email, phone } = input;
  
  if (!name || name.trim() === "") {
    return { success: false, error: "姓名不能为空" };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name.trim(),
        email: email ? email.trim() || null : null,
        phone: phone ? phone.trim() || null : null,
      },
    });
    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("[updateProfile] 修改个人信息失败:", error);
    return { success: false, error: "修改个人信息失败" };
  }
}

/**
 * 用户自己修改密码
 */
export async function changePassword(input: { oldPassword?: string; newPassword?: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，请重新登录" };
  }

  const { oldPassword, newPassword } = input;

  if (!oldPassword || !newPassword) {
    return { success: false, error: "旧密码和新密码均不能为空" };
  }

  if (newPassword.length < 6) {
    return { success: false, error: "新密码长度不能少于 6 位" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.password) {
      return { success: false, error: "用户不存在或未设置密码" };
    }

    // 校验旧密码
    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) {
      return { success: false, error: "当前旧密码输入错误" };
    }

    // 哈希新密码并更新
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    return { success: true };
  } catch (error) {
    console.error("[changePassword] 修改密码失败:", error);
    return { success: false, error: "修改密码失败" };
  }
}
