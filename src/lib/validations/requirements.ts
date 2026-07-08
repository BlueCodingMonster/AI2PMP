import { z } from "zod";
import { RequirementType, RequirementSource, Priority } from "@prisma/client";

export const requirementSchema = z.object({
  title: z.string().min(2, "标题至少2个字符").max(100, "标题最多100个字符").trim(),
  description: z.string().optional(),
  type: z.nativeEnum(RequirementType, { required_error: "请选择需求类型" }),
  source: z.nativeEnum(RequirementSource, { required_error: "请选择需求来源" }),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  businessValue: z.number().min(1).max(10).optional().nullable(),
  complexity: z.number().min(1).max(10).optional().nullable(),
  estimatedDays: z.number().min(0.1, "预估工期至少0.1天").optional().nullable(),
  projectId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  acceptanceCriteria: z.string().optional(),
  productLineTeamId: z.string().optional().nullable(),
  proposer: z.string().optional().nullable(),
  proposedAt: z.string().or(z.date()).optional().nullable(),
});

export type RequirementInput = z.infer<typeof requirementSchema>;
