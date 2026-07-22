import { z } from "zod";
import { Priority, RequirementSource, RequirementStatus } from "@prisma/client";

const requirementPrioritySchema = z.enum([Priority.HIGH, Priority.MEDIUM, Priority.LOW]);

export const requirementSchema = z
  .object({
    title: z.string().min(2, "需求名称至少2个字符").max(100, "需求名称最多100个字符").trim(),
    summary: z.string().max(2000, "需求内容简述最多2000个字符").trim().optional().nullable(),
    status: z.nativeEnum(RequirementStatus).default(RequirementStatus.PENDING_REVIEW),
    source: z.nativeEnum(RequirementSource),
    priority: requirementPrioritySchema.default(Priority.MEDIUM),
    productLineTeamId: z.string().optional().nullable(),
    proposer: z.string().max(100, "客户名称或需求方最多100个字符").trim().optional().nullable(),
    proposedAt: z.string().or(z.date()).optional().nullable(),
    reviewedAt: z.string().or(z.date()).optional().nullable(),
    createdAt: z
      .string({ required_error: "创建时间不能为空" })
      .min(1, "创建时间不能为空")
      .refine((value) => !Number.isNaN(Date.parse(value)), "创建时间格式不正确"),
  })
  .superRefine((value, ctx) => {
    if (value.status === RequirementStatus.REVIEWED && !value.reviewedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reviewedAt"],
        message: "状态为已评审时必须选择评审通过时间",
      });
    }
  });

export type RequirementInput = z.infer<typeof requirementSchema>;
