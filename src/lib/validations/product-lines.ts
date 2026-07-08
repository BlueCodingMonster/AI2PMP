import { z } from "zod";
import { ProductLineRole, ProductVersionStatus } from "@prisma/client";

export const productLineTeamSchema = z.object({
  name: z.string().min(2, "小组名称至少2个字符").max(50, "小组名称最多50个字符").trim(),
  description: z.string().optional().nullable(),
});

export const productLineMemberSchema = z.object({
  userId: z.string({ required_error: "请选择用户" }),
  role: z.nativeEnum(ProductLineRole, { required_error: "请选择担任的角色" }),
});

export const memberSecondmentSchema = z.object({
  userId: z.string({ required_error: "请选择需要借调的成员" }),
  fromTeamId: z.string().optional().nullable(),
  toTeamId: z.string({ required_error: "请选择借入的目标小组" }),
  role: z.nativeEnum(ProductLineRole, { required_error: "请指派借调期间的角色" }),
  startDate: z.string().or(z.date()).refine((val) => val !== null, "请选择借调开始日期"),
  endDate: z.string().or(z.date()).optional().nullable(),
});

export type ProductLineTeamInput = z.infer<typeof productLineTeamSchema>;
export type ProductLineMemberInput = z.infer<typeof productLineMemberSchema>;
export type MemberSecondmentInput = z.infer<typeof memberSecondmentSchema>;

export const productPlatformSchema = z.object({
  productLineTeamId: z.string().min(1, "请选择产品线小组"),
  name: z.string().min(1, "请输入产品/平台名称").max(80, "产品/平台名称最多80个字符").trim(),
  description: z.string().optional().nullable(),
});

export const productModuleSchema = z.object({
  productPlatformId: z.string().min(1, "请选择产品/平台"),
  name: z.string().min(1, "请输入板块/模块名称").max(80, "板块/模块名称最多80个字符").trim(),
  description: z.string().optional().nullable(),
});

export const productVersionSchema = z.object({
  productLineTeamId: z.string().min(1, "请选择产品线小组"),
  productModuleId: z.string().min(1, "请选择板块/模块"),
  title: z.string().min(1, "请输入版本标题").max(120, "版本标题最多120个字符").trim(),
  version: z.string().min(1, "请输入版本号").max(40, "版本号最多40个字符").trim(),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(ProductVersionStatus).default(ProductVersionStatus.PLANNING),
  startDate: z.string().optional().nullable(),
  releaseDate: z.string().optional().nullable(),
});

export const productVersionStatusSchema = z.object({
  status: z.nativeEnum(ProductVersionStatus),
});

export type ProductPlatformInput = z.infer<typeof productPlatformSchema>;
export type ProductModuleInput = z.infer<typeof productModuleSchema>;
export type ProductVersionInput = z.infer<typeof productVersionSchema>;
