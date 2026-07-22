import { z } from "zod";

export const managedTaskCategoryEnum = { DEVELOPMENT: "DEVELOPMENT", OTHER: "OTHER" } as const;
export const managedTaskStatusEnum = { UNSCHEDULED: "UNSCHEDULED", TODO: "TODO", IN_PROGRESS: "IN_PROGRESS", PAUSED: "PAUSED", DONE: "DONE", CANCELLED: "CANCELLED" } as const;
export const managedTaskVersionTypeEnum = { PRODUCT: "PRODUCT", PROJECT: "PROJECT" } as const;
export const managedTaskMonthlyItemTypeEnum = {
  PRODUCT_DELIVERY: "PRODUCT_DELIVERY",
  PROJECT_DELIVERY: "PROJECT_DELIVERY",
  MARKET_ACTION: "MARKET_ACTION",
  COST_OPTIMIZATION: "COST_OPTIMIZATION",
  AI_PRODUCT_ENABLEMENT: "AI_PRODUCT_ENABLEMENT",
  AI_EFFICIENCY: "AI_EFFICIENCY",
  RISK: "RISK",
  RESOURCE_REQUEST: "RESOURCE_REQUEST",
} as const;
export const managedTaskSdlcNodeEnum = {
  REQUIREMENT_ANALYSIS: "REQUIREMENT_ANALYSIS",
  SOLUTION_DESIGN: "SOLUTION_DESIGN",
  DEVELOPMENT: "DEVELOPMENT",
  INTEGRATION: "INTEGRATION",
  TESTING: "TESTING",
  RELEASE: "RELEASE",
  ACCEPTANCE: "ACCEPTANCE",
  OPERATION_OBSERVATION: "OPERATION_OBSERVATION",
  OTHER: "OTHER",
} as const;
export const workCalendarStatusEnum = { DRAFT: "DRAFT", PUBLISHED: "PUBLISHED" } as const;
export const workCalendarDayTypeEnum = {
  REGULAR_WORKDAY: "REGULAR_WORKDAY",
  REGULAR_WEEKEND: "REGULAR_WEEKEND",
  LEGAL_HOLIDAY: "LEGAL_HOLIDAY",
  ADJUSTED_WORKDAY: "ADJUSTED_WORKDAY",
  SPECIAL_REST_DAY: "SPECIAL_REST_DAY",
  SPECIAL_WORKDAY: "SPECIAL_WORKDAY",
} as const;

const optionalId = z.string().trim().optional().nullable();
const optionalDate = z.string().trim().optional().nullable();

export const managedTaskSchema = z.object({
  parentId: optionalId,
  title: z.string().trim().min(1, "请输入任务名称").max(120, "任务名称最多120个字符"),
  description: z.string().trim().max(5000, "任务说明最多5000个字符").optional().nullable(),
  category: z.nativeEnum(managedTaskCategoryEnum).optional().nullable(),
  sdlcNode: z.nativeEnum(managedTaskSdlcNodeEnum).optional().nullable(),
  status: z.nativeEnum(managedTaskStatusEnum).default(managedTaskStatusEnum.UNSCHEDULED),
  planStartDate: optionalDate,
  planEndDate: optionalDate,
  plannedWorkdays: z.coerce.number().min(0).max(10000).optional().nullable(),
  progressPercent: z.coerce.number().int().min(0).max(100),
  actualStartAt: optionalDate,
  actualFinishAt: optionalDate,
  executorId: optionalId,
  monthlyPlanId: optionalId,
  monthlyItemType: z.nativeEnum(managedTaskMonthlyItemTypeEnum).optional().nullable(),
  monthlyItemId: optionalId,
  versionType: z.nativeEnum(managedTaskVersionTypeEnum).optional().nullable(),
  versionId: optionalId,
  notes: z.string().trim().max(5000, "备注最多5000个字符").optional().nullable(),
}).superRefine((data, context) => {
  const start = data.planStartDate ? new Date(data.planStartDate) : null;
  const end = data.planEndDate ? new Date(data.planEndDate) : null;
  if (start && end && end < start) context.addIssue({ code: z.ZodIssueCode.custom, path: ["planEndDate"], message: "计划结束日期不能早于计划开始日期" });
  const actualStart = data.actualStartAt ? new Date(data.actualStartAt) : null;
  const actualFinish = data.actualFinishAt ? new Date(data.actualFinishAt) : null;
  if (actualStart && actualStart > new Date()) context.addIssue({ code: z.ZodIssueCode.custom, path: ["actualStartAt"], message: "实际开始时间不能晚于当前时间" });
  if (actualFinish && actualFinish > new Date()) context.addIssue({ code: z.ZodIssueCode.custom, path: ["actualFinishAt"], message: "实际完成时间不能晚于当前时间" });
  if (actualStart && actualFinish && actualFinish < actualStart) context.addIssue({ code: z.ZodIssueCode.custom, path: ["actualFinishAt"], message: "实际完成时间不能早于实际开始时间" });
  if (Boolean(data.monthlyItemType) !== Boolean(data.monthlyItemId)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["monthlyItemId"], message: "月度计划事项类型和事项需要同时选择" });
  if (Boolean(data.versionType) !== Boolean(data.versionId)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["versionId"], message: "版本类型和版本需要同时选择" });
});

export const workCalendarDaySchema = z.object({
  date: z.string().trim().min(1),
  type: z.nativeEnum(workCalendarDayTypeEnum),
  standardHours: z.coerce.number().min(0).max(24).optional().nullable(),
  label: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const workCalendarSchema = z.object({
  productLineTeamId: optionalId, // 保留兼容性，server 端强制设为 null（全局日历）
  year: z.coerce.number().int().min(2020).max(2100),
  status: z.nativeEnum(workCalendarStatusEnum).default(workCalendarStatusEnum.DRAFT),
  standardHours: z.coerce.number().min(1).max(24).default(8),
  days: z.array(workCalendarDaySchema).default([]),
});

export type ManagedTaskInput = z.infer<typeof managedTaskSchema>;
export type WorkCalendarInput = z.infer<typeof workCalendarSchema>;
