import { z } from "zod";
import { ProjectStatus, ProjectRole } from "@prisma/client";

export const projectSchema = z.object({
  name: z.string().min(2, "项目名称至少2个字符").max(100, "项目名称最多100个字符").trim(),
  key: z
    .string()
    .min(2, "项目键(Key)至少2个字符")
    .max(10, "项目键(Key)最多10个字符")
    .toUpperCase()
    .trim()
    .regex(/^[A-Z0-9]+$/, "项目键只能包含大写字母和数字"),
  description: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  startDate: z.string().or(z.date()).optional().nullable(),
  endDate: z.string().or(z.date()).optional().nullable(),
});

export type ProjectInput = z.infer<typeof projectSchema>;

export const projectMemberSchema = z.object({
  userId: z.string({ required_error: "请选择用户" }),
  role: z.nativeEnum(ProjectRole, { required_error: "请选择角色" }),
});

export type ProjectMemberInput = z.infer<typeof projectMemberSchema>;
