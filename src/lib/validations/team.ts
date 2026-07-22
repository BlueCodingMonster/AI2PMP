import { z } from "zod";

const usernameSchema = z
  .string()
  .min(3, "登录名至少3个字符")
  .max(32, "登录名最多32个字符")
  .regex(/^[a-zA-Z0-9_-]+$/, "登录名只能包含字母、数字、下划线或短横线")
  .trim()
  .toLowerCase();

export const memberCreateSchema = z.object({
  name: z.string().min(2, "姓名至少2个字符").max(50, "姓名最多50个字符").trim(),
  username: usernameSchema,
  password: z.string().min(6, "密码至少6个字符"),
  phone: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  level: z.string().max(50).optional().nullable(),
  position: z.string().max(50).optional().nullable(),
  isAdmin: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export type MemberCreateInput = z.infer<typeof memberCreateSchema>;

export const memberUpdateSchema = z.object({
  name: z.string().min(2, "姓名至少2个字符").max(50, "姓名最多50个字符").trim(),
  username: usernameSchema,
  phone: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  level: z.string().max(50).optional().nullable(),
  position: z.string().max(50).optional().nullable(),
  isAdmin: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>;
