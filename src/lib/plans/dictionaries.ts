import {
  PlanPublicationStatus,
  PlanRiskLevel,
  PlanTrackingStatus,
  QuarterlyGoalDomain,
  QuarterlyRiskStatus,
  ResourceRequestType,
} from "@prisma/client";

export const planPublicationStatusLabels: Record<PlanPublicationStatus, string> = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
};

export const quarterlyGoalDomainLabels: Record<QuarterlyGoalDomain, string> = {
  PRODUCT_ITERATION: "产品迭代",
  PRODUCT_DELIVERY: "产品交付",
  PRODUCT_RESEARCH: "产品调研",
  MARKET_SUPPORT: "市场支持",
  OPERATIONS_STABILITY: "运维稳定",
  TECHNICAL_INNOVATION: "技术创新",
  AI_ENABLEMENT: "AI赋能",
};

export const planTrackingStatusLabels: Record<PlanTrackingStatus, string> = {
  NOT_STARTED: "未开始",
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  DELAY_RISK: "延期风险",
  DELAYED: "已延期",
  PAUSED: "暂缓",
};

export const planRiskLevelLabels: Record<PlanRiskLevel, string> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};

export const quarterlyRiskStatusLabels: Record<QuarterlyRiskStatus, string> = {
  NOT_TRIGGERED: "未触发",
  TRIGGERED: "已触发",
  HANDLING: "处理中",
  CLOSED: "已关闭",
};

export const resourceRequestTypeLabels: Record<ResourceRequestType, string> = {
  PEOPLE: "人员",
  TECHNOLOGY: "技术",
  BUDGET: "预算",
  MANAGEMENT_COORDINATION: "管理协调",
};
