"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// ===== Zod 校验模式 =====
const registerSchema = z.object({
  name: z
    .string()
    .min(2, "姓名至少2个字符")
    .max(50, "姓名最多50个字符")
    .trim(),
  username: z
    .string()
    .min(3, "登录名至少3个字符")
    .max(32, "登录名最多32个字符")
    .regex(/^[a-zA-Z0-9_-]+$/, "登录名只能包含字母、数字、下划线或短横线")
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(6, "密码至少6个字符")
    .max(100, "密码最多100个字符"),
});

type RegisterInput = z.infer<typeof registerSchema>;

type RegisterResult =
  | { success: true }
  | { success: false; error: string };

/**
 * 用户注册 Server Action
 * 1. Zod 校验输入
 * 2. 检查登录名是否已存在
 * 3. bcrypt 哈希密码（10 轮）
 * 4. 写入数据库
 */
export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  // 1. 校验输入
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    // 返回第一个校验错误
    const firstError = parsed.error.errors[0];
    return { success: false, error: firstError?.message ?? "输入数据无效" };
  }

  const { name, username, password } = parsed.data;

  try {
    // 2. 检查登录名是否已被注册
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return { success: false, error: "该登录名已被占用" };
    }

    // 3. 哈希密码 —— 10 轮 salt 是安全与性能的平衡点
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. 创建用户
    await prisma.user.create({
      data: {
        name,
        username,
        email: null,
        password: hashedPassword,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[registerUser] 注册失败:", error);
    return { success: false, error: "注册失败，请稍后重试" };
  }
}
