import { z } from "zod";
import {
  PlanRiskLevel,
  PlanTrackingStatus,
  QuarterlyGoalDomain,
  QuarterlyRiskStatus,
} from "@prisma/client";

const optionalText = z.string().max(5000).optional().nullable();

export const quarterlyGoalDraftSchema = z.object({
  domain: z.nativeEnum(QuarterlyGoalDomain).optional().nullable(),
  quarterlyGoal: optionalText,
  successCriteria: optionalText,
  month1Goal: optionalText,
  month1Status: z.nativeEnum(PlanTrackingStatus).optional().nullable(),
  month2Goal: optionalText,
  month2Status: z.nativeEnum(PlanTrackingStatus).optional().nullable(),
  month3Goal: optionalText,
  month3Status: z.nativeEnum(PlanTrackingStatus).optional().nullable(),
  currentCompletion: optionalText,
  achievementRate: z.number().int().min(0).max(100).default(0),
  quarterlyStatus: z.nativeEnum(PlanTrackingStatus).optional().nullable(),
  keyDependencies: optionalText,
  notes: optionalText,
});

export const quarterlyRiskDraftSchema = z.object({
  riskDescription: optionalText,
  affectedMilestone: z.string().max(500).optional().nullable(),
  probability: z.nativeEnum(PlanRiskLevel).optional().nullable(),
  impact: z.nativeEnum(PlanRiskLevel).optional().nullable(),
  overallLevel: z.nativeEnum(PlanRiskLevel).optional().nullable(),
  triggerCondition: optionalText,
  responseStrategy: optionalText,
  warningPoint: z.string().max(500).optional().nullable(),
  status: z.nativeEnum(QuarterlyRiskStatus).optional().nullable(),
});

const quarterlyBaseSchema = z.object({
  productLineTeamId: z.string().min(1, "请选择产品线小组"),
  year: z.number().int().min(2020).max(2100),
  quarter: z.number().int().min(1).max(4),
  goals: z.array(quarterlyGoalDraftSchema).default([]),
  risks: z.array(quarterlyRiskDraftSchema).default([]),
});

export const quarterlyDraftSchema = quarterlyBaseSchema;

export const quarterlyPublishSchema = quarterlyBaseSchema.superRefine((value, ctx) => {
  if (value.goals.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["goals"], message: "发布前至少填写一条季度目标" });
  }
  value.goals.forEach((goal, index) => {
    const required = [
      ["domain", goal.domain], ["quarterlyGoal", goal.quarterlyGoal], ["successCriteria", goal.successCriteria],
      ["month1Goal", goal.month1Goal], ["month1Status", goal.month1Status], ["month2Goal", goal.month2Goal],
      ["month2Status", goal.month2Status], ["month3Goal", goal.month3Goal], ["month3Status", goal.month3Status],
    ] as const;
    required.forEach(([field, fieldValue]) => {
      if (!fieldValue || (typeof fieldValue === "string" && !fieldValue.trim())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["goals", index, field], message: `第${index + 1}条目标字段不能为空` });
      }
    });
  });
  value.risks.forEach((risk, index) => {
    const required = [
      ["riskDescription", risk.riskDescription], ["probability", risk.probability], ["impact", risk.impact],
      ["overallLevel", risk.overallLevel], ["responseStrategy", risk.responseStrategy], ["status", risk.status],
    ] as const;
    required.forEach(([field, fieldValue]) => {
      if (!fieldValue || (typeof fieldValue === "string" && !fieldValue.trim())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["risks", index, field], message: `第${index + 1}条风险字段不能为空` });
      }
    });
  });
});

export type QuarterlyPlanInput = z.output<typeof quarterlyDraftSchema>;
