import { z } from "zod";
import { PlanRiskLevel, ResourceRequestType } from "@prisma/client";

const text = z.string().max(5000).optional().nullable();
const date = z.string().optional().nullable();
const productDeliverySchema = z.object({ moduleVersion: text, deliveryContent: text, plannedCompletionDate: date });
const projectDeliverySchema = z.object({ projectName: text, deliveryContent: text, plannedCompletionDate: date, customerName: text });
const marketActionSchema = z.object({ productOrProject: text, marketAction: text, outputResult: text, plannedCompletionDate: date });
const costOptimizationSchema = z.object({ optimizationItem: text, currentProblem: text, optimizationMeasure: text });
const aiItemSchema = z.object({ item: text, outputResult: text, plannedCompletionDate: date });
const riskSchema = z.object({ riskItem: text, riskLevel: z.nativeEnum(PlanRiskLevel).optional().nullable(), impactScope: text, responseMeasure: text });
const resourceSchema = z.object({ requestType: z.nativeEnum(ResourceRequestType).optional().nullable(), content: text, urgency: z.nativeEnum(PlanRiskLevel).optional().nullable(), supportDepartment: text });

const monthlyBaseSchema = z.object({
  productLineTeamId: z.string().min(1, "请选择产品线小组"),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  productDeliveries: z.array(productDeliverySchema).default([]),
  projectDeliveries: z.array(projectDeliverySchema).default([]),
  marketActions: z.array(marketActionSchema).default([]),
  costOptimizations: z.array(costOptimizationSchema).default([]),
  aiProductEnablements: z.array(aiItemSchema).default([]),
  aiEfficiencies: z.array(aiItemSchema).default([]),
  risks: z.array(riskSchema).default([]),
  resourceRequests: z.array(resourceSchema).default([]),
});

export const monthlyDraftSchema = monthlyBaseSchema;

export const monthlyPublishSchema = monthlyBaseSchema.superRefine((value, ctx) => {
  const sections = [
    ["productDeliveries", value.productDeliveries, ["moduleVersion", "deliveryContent", "plannedCompletionDate"]],
    ["projectDeliveries", value.projectDeliveries, ["projectName", "deliveryContent", "plannedCompletionDate"]],
    ["marketActions", value.marketActions, ["productOrProject", "marketAction", "outputResult", "plannedCompletionDate"]],
    ["costOptimizations", value.costOptimizations, ["optimizationItem", "currentProblem", "optimizationMeasure"]],
    ["aiProductEnablements", value.aiProductEnablements, ["item", "outputResult", "plannedCompletionDate"]],
    ["aiEfficiencies", value.aiEfficiencies, ["item", "outputResult", "plannedCompletionDate"]],
    ["risks", value.risks, ["riskItem", "riskLevel", "impactScope", "responseMeasure"]],
    ["resourceRequests", value.resourceRequests, ["requestType", "content", "urgency", "supportDepartment"]],
  ] as const;
  if (sections.every(([, rows]) => rows.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [], message: "发布前至少填写一个业务板块" });
  }
  sections.forEach(([section, rows, fields]) => rows.forEach((row, index) => fields.forEach((field) => {
    const fieldValue = (row as Record<string, unknown>)[field];
    if (!fieldValue || (typeof fieldValue === "string" && !fieldValue.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [section, index, field], message: `第${index + 1}行字段不能为空` });
    }
  })));
});

export type MonthlyPlanInput = z.output<typeof monthlyDraftSchema>;
