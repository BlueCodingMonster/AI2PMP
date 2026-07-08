import {
  ExecutionFlowTemplate,
  IntellectualPropertyType,
  PlanStatus,
  SpecialTaskCategory,
  StageGroup,
  WorkItemSource,
} from "@prisma/client";

export const planStatusLabels: Record<PlanStatus, string> = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
  IN_PROGRESS: "进行中",
  ADJUSTED: "已调整",
  COMPLETED: "已完成",
  CANCELLED: "已作废",
  ARCHIVED: "已归档",
};

export const workItemSourceLabels: Record<WorkItemSource, string> = {
  PLATFORM_RND: "平台研发规划",
  LOCAL_DELIVERY: "本地化项目交付",
  UNPLANNED: "计划外工作",
};

export const executionFlowLabels: Record<ExecutionFlowTemplate, string> = {
  NONE: "不使用流程模板",
  INTERNAL_RND: "内部研发管理流程",
  LOCAL_DEPLOYMENT: "本地化部署流程",
  DATA_MIGRATION: "数据迁移流程",
  SYSTEM_INTEGRATION: "系统对接流程",
  ONSITE_IMPLEMENTATION: "现场实施流程",
};

export const specialTaskCategoryLabels: Record<SpecialTaskCategory, string> = {
  TECH_RESEARCH: "技术研究",
  SCENARIO_VALIDATION: "场景验证",
  INTELLECTUAL_PROPERTY: "知识产权",
};

export const intellectualPropertyTypeLabels: Record<IntellectualPropertyType, string> = {
  PATENT: "专利",
  SOFTWARE_COPYRIGHT: "软著",
  STANDARD: "标准",
};

export const stageGroupLabels: Record<StageGroup, string> = {
  PRODUCT: "产品环节",
  DEVELOPMENT: "研发环节",
  TEST_RELEASE: "测试与发布环节",
  DELIVERY: "项目交付环节",
  OTHER: "其他",
};

export type StageTemplate = {
  group: StageGroup;
  name: string;
  isMilestone: boolean;
  sortOrder: number;
};

export const internalRndStages: StageTemplate[] = [
  { group: "PRODUCT", name: "项目/任务启动会", isMilestone: true, sortOrder: 10 },
  { group: "PRODUCT", name: "需求分析", isMilestone: false, sortOrder: 20 },
  { group: "PRODUCT", name: "需求评审及宣讲", isMilestone: true, sortOrder: 30 },
  { group: "DEVELOPMENT", name: "研发启动", isMilestone: true, sortOrder: 40 },
  { group: "DEVELOPMENT", name: "需求分析及研发设计", isMilestone: false, sortOrder: 50 },
  { group: "DEVELOPMENT", name: "设计文档评审及宣讲", isMilestone: false, sortOrder: 60 },
  { group: "DEVELOPMENT", name: "代码编写", isMilestone: false, sortOrder: 70 },
  { group: "DEVELOPMENT", name: "研发集成测试", isMilestone: false, sortOrder: 80 },
  { group: "TEST_RELEASE", name: "提测", isMilestone: true, sortOrder: 90 },
  { group: "TEST_RELEASE", name: "测试及问题修复", isMilestone: false, sortOrder: 100 },
  { group: "TEST_RELEASE", name: "上线发布", isMilestone: false, sortOrder: 110 },
  { group: "TEST_RELEASE", name: "项目/任务总结", isMilestone: false, sortOrder: 120 },
];

export const deliveryFlowStages: Record<ExecutionFlowTemplate, StageTemplate[]> = {
  NONE: [],
  INTERNAL_RND: internalRndStages,
  LOCAL_DEPLOYMENT: [
    { group: "DELIVERY", name: "部署准备", isMilestone: false, sortOrder: 10 },
    { group: "DELIVERY", name: "环境配置", isMilestone: false, sortOrder: 20 },
    { group: "DELIVERY", name: "数据初始化", isMilestone: false, sortOrder: 30 },
    { group: "DELIVERY", name: "联调", isMilestone: false, sortOrder: 40 },
    { group: "DELIVERY", name: "验收", isMilestone: true, sortOrder: 50 },
  ],
  DATA_MIGRATION: [
    { group: "DELIVERY", name: "数据梳理", isMilestone: false, sortOrder: 10 },
    { group: "DELIVERY", name: "映射设计", isMilestone: false, sortOrder: 20 },
    { group: "DELIVERY", name: "迁移执行", isMilestone: false, sortOrder: 30 },
    { group: "DELIVERY", name: "核验确认", isMilestone: true, sortOrder: 40 },
  ],
  SYSTEM_INTEGRATION: [
    { group: "DELIVERY", name: "接口确认", isMilestone: false, sortOrder: 10 },
    { group: "DELIVERY", name: "联调开发", isMilestone: false, sortOrder: 20 },
    { group: "DELIVERY", name: "联调测试", isMilestone: false, sortOrder: 30 },
    { group: "DELIVERY", name: "上线确认", isMilestone: true, sortOrder: 40 },
  ],
  ONSITE_IMPLEMENTATION: [
    { group: "DELIVERY", name: "现场准备", isMilestone: false, sortOrder: 10 },
    { group: "DELIVERY", name: "现场实施", isMilestone: false, sortOrder: 20 },
    { group: "DELIVERY", name: "现场验收", isMilestone: true, sortOrder: 30 },
  ],
};

export function getStageTemplates(template: ExecutionFlowTemplate): StageTemplate[] {
  return deliveryFlowStages[template] ?? [];
}
