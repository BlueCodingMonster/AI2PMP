import { z } from "zod";
import { ProjectRole, ProjectStatus } from "@prisma/client";

const optionalText = z.string().trim().max(200, "内容最多200个字符").optional().nullable();
const optionalDate = z.string().or(z.date()).optional().nullable();

export const projectSchema = z.object({
  name: z.string().trim().min(2, "项目名称至少2个字符").max(100, "项目名称最多100个字符"),
  key: z.string().trim().toUpperCase().min(2, "项目编号至少2个字符").max(10, "项目编号最多10个字符").regex(/^[A-Z0-9]+$/, "项目编号只能包含大写字母和数字"),
  customerName: z.string().trim().min(1, "请输入客户名称").max(100, "客户名称最多100个字符"),
  customerContact: optionalText,
  customerPhone: optionalText,
  projectManagerId: z.string().trim().min(1, "请选择项目负责人"),
  marketManager: optionalText,
  salesManager: optionalText,
  contractNumber: optionalText,
  contractAmount: z.string().trim().optional().nullable().refine((value) => !value || /^\d+(\.\d{1,2})?$/.test(value), "合同金额最多保留2位小数"),
  contractSignedAt: optionalDate,
  warrantyMonths: z.number().int("质保周期必须为整数").min(0, "质保周期不能小于0").max(1200, "质保周期不能超过1200个月").optional().nullable(),
  warrantyExpiresAt: optionalDate,
  status: z.nativeEnum(ProjectStatus),
  acceptanceDate: optionalDate,
  description: z.string().trim().max(2000, "项目说明最多2000个字符").optional().nullable(),
}).superRefine((data, context) => {
  if (data.status === ProjectStatus.ARCHIVED && !data.acceptanceDate) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["acceptanceDate"], message: "完成归档时请填写验收日期" });
  }
});

export const projectVersionSchema = z.object({
  projectId: z.string().min(1, "请选择项目"),
  version: z.string().trim().min(1, "请输入版本号").max(50, "版本号最多50个字符"),
});

export type ProjectInput = z.infer<typeof projectSchema>;

export const projectMemberSchema = z.object({
  userId: z.string({ required_error: "请选择用户" }),
  role: z.nativeEnum(ProjectRole, { required_error: "请选择角色" }),
});

export type ProjectMemberInput = z.infer<typeof projectMemberSchema>;
