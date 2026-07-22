import { Priority, RequirementSource, RequirementStatus } from "@prisma/client";

export const formatRequirementNo = (sequenceNo: number) =>
  `XQ${String(sequenceNo).padStart(4, "0")}`;

export const requirementStatusLabels: Record<RequirementStatus, string> = {
  PENDING_REVIEW: "待评审",
  UNDER_REVIEW: "评审中",
  REVIEWED: "已评审",
  REJECTED: "已驳回",
  SCHEDULED: "已排期",
  COMPLETED: "已完成",
};

export const requirementSourceLabels: Record<RequirementSource, string> = {
  PRODUCT_PLANNING: "产品规划",
  CUSTOMER_FEEDBACK: "客户反馈",
  INTERNAL_REQUEST: "公司内部需求",
  MARKET_REQUEST: "市场需求",
};

export const requirementPriorityLabels: Partial<Record<Priority, string>> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};
