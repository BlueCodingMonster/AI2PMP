import { z } from "zod";
import { PlanType, PlanStatus, PlanItemStatus, WorkItemType, PlanningTreatment } from "@prisma/client";

export const planSchema = z.object({
  title: z.string().min(2, "计划标题至少2个字符").max(100, "计划标题最多100个字符").trim(),
  description: z.string().optional(),
  type: z.nativeEnum(PlanType, { required_error: "请选择计划类型" }),
  productLineTeamId: z.string().min(1, "请选择产品线"),
  year: z.number().int().min(2000).max(2100),
  halfYear: z.number().int().min(1).max(2).optional().nullable(),
  quarter: z.number().int().min(1).max(4).optional().nullable(),
  month: z.number().int().min(1).max(12).optional().nullable(),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  parentPlanId: z.string().optional().nullable(),
  goals: z.string().optional(),
  status: z.nativeEnum(PlanStatus).optional(),
});

export type PlanInput = z.infer<typeof planSchema>;

export const planItemSchema = z
  .object({
    title: z.string().min(2, "工作项标题至少2个字符").max(100, "工作项标题最多100个字符").trim(),
    description: z.string().optional(),
    type: z.nativeEnum(WorkItemType).default(WorkItemType.REQUIREMENT),
    isPlanned: z.boolean().default(true),
    planningTreatment: z.nativeEnum(PlanningTreatment).optional().nullable(),
    productLineTeamId: z.string().optional().nullable(),
    relatedPlanItemId: z.string().optional().nullable(),
    requirementId: z.string().optional().nullable(),
    projectId: z.string().optional().nullable(),
    productVersionId: z.string().optional().nullable(),
    taskId: z.string().optional().nullable(),
    assigneeId: z.string().optional().nullable(),
    status: z.nativeEnum(PlanItemStatus).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    sortOrder: z.number().int().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.isPlanned && !value.productLineTeamId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["productLineTeamId"],
        message: "计划外工作必须归属产品线小组",
      });
    }

    if (!value.isPlanned && !value.planningTreatment) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["planningTreatment"],
        message: "计划外工作必须选择处理方式",
      });
    }

    if (value.planningTreatment === PlanningTreatment.LINK_EXISTING_ITEM && !value.relatedPlanItemId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["relatedPlanItemId"],
        message: "关联已有工作项时必须选择被关联工作项",
      });
    }
  });

export type PlanItemInput = z.infer<typeof planItemSchema>;
