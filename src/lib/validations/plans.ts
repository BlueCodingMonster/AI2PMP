import { z } from "zod";
import {
  ExecutionFlowTemplate,
  IntellectualPropertyType,
  PlanItemStatus,
  PlanStatus,
  PlanType,
  PlanningTreatment,
  SpecialTaskCategory,
  WorkItemSource,
  WorkItemType,
} from "@prisma/client";

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
  sourcePlanId: z.string().optional().nullable(),
  replacementPlanId: z.string().optional().nullable(),
  adjustedReason: z.string().optional(),
  voidedReason: z.string().optional(),
  voidedAt: z.string().or(z.date()).optional().nullable(),
  goals: z.string().optional(),
  status: z.nativeEnum(PlanStatus).optional(),
});

export type PlanInput = z.input<typeof planSchema>;

export const planItemSchema = z
  .object({
    title: z.string().min(2, "工作项标题至少2个字符").max(100, "工作项标题最多100个字符").trim(),
    description: z.string().optional(),
    type: z.nativeEnum(WorkItemType).default(WorkItemType.REQUIREMENT),
    source: z.nativeEnum(WorkItemSource).default(WorkItemSource.PLATFORM_RND),
    executionFlow: z.nativeEnum(ExecutionFlowTemplate).default(ExecutionFlowTemplate.NONE),
    versionNameText: z.string().optional().nullable(),
    specialTaskCategory: z.nativeEnum(SpecialTaskCategory).optional().nullable(),
    ipType: z.nativeEnum(IntellectualPropertyType).optional().nullable(),
    specialSerialNo: z.string().optional().nullable(),
    specialTarget: z.string().optional().nullable(),
    specialOwnerText: z.string().optional().nullable(),
    plannedFinishText: z.string().optional().nullable(),
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

    if (value.source === WorkItemSource.LOCAL_DELIVERY && value.specialTaskCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["specialTaskCategory"],
        message: "项目交付计划不承载技术研究、场景验证、知识产权专项任务",
      });
    }

    if (value.source === WorkItemSource.LOCAL_DELIVERY && value.executionFlow === ExecutionFlowTemplate.INTERNAL_RND) {
      return;
    }

    if (value.specialTaskCategory === SpecialTaskCategory.INTELLECTUAL_PROPERTY && !value.ipType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ipType"],
        message: "知识产权任务必须选择专利、软著或标准",
      });
    }

    if (value.specialTaskCategory && value.source !== WorkItemSource.PLATFORM_RND) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source"],
        message: "专项任务只能归入平台研发规划",
      });
    }
  });

export type PlanItemInput = z.input<typeof planItemSchema>;
