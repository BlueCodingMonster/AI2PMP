# 计划与工作项模型 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将最新确认的产品线小组计划模型落到系统中：产品线小组负责年度/季度/月度计划和执行，管理者查看跨小组汇总；平台版本研发与项目定制化研发共用简化内部研发流程；项目交付、专项任务、计划外工作保持清晰边界。

**Architecture:** 在现有 `Plan`、`PlanItem` 基础上增量扩展，不重新引入“项目管理”主线。新增工作来源、执行流程、专项任务元数据和阶段安排模型；计划关系保持弱关联，生命周期支持调整、作废、替换和归档。前端默认展示三大研发环节、四个关键里程碑和当前节点，完整节点按需展开。

**Tech Stack:** Next.js 16.2.10 App Router、React 19、Prisma 7、PostgreSQL、Zod、TypeScript、Tailwind CSS、lucide-react。

---

## 前置要求

本项目 `AGENTS.md` 要求：写 Next.js 代码前必须阅读 `node_modules/next/dist/docs/` 中相关指南。执行代码任务前先读取：

```powershell
Get-Content -Raw -Encoding UTF8 node_modules\next\dist\docs\app\getting-started\updating-data.mdx
Get-Content -Raw -Encoding UTF8 node_modules\next\dist\docs\app\api-reference\functions\revalidatePath.mdx
Get-Content -Raw -Encoding UTF8 node_modules\next\dist\docs\app\api-reference\directives\use-client.mdx
```

当前代码已经实现了早期 `WorkItemType`、`PlanningTreatment`、`PlanItem.isPlanned` 和计划外工作池。不要重复实现旧模型，本计划只做新增和修正。

---

## 文件结构

- 修改：`D:\workspace-ai\AI2PmP\prisma\schema.prisma`
  - 增加计划生命周期、工作来源、执行流程、专项任务和阶段安排相关枚举。
  - 扩展 `Plan`、`PlanItem`。
  - 新增 `PlanItemStage`。
- 修改：`D:\workspace-ai\AI2PmP\src\lib\validations\plans.ts`
  - 扩展计划、工作项、阶段安排校验。
- 新建：`D:\workspace-ai\AI2PmP\src\lib\plans\workflow-templates.ts`
  - 统一保存内部研发流程、关键里程碑、交付流程、中文标签。
- 修改：`D:\workspace-ai\AI2PmP\src\actions\plans.ts`
  - 支持计划变动性、工作来源、执行流程、专项任务、阶段安排。
  - 增加管理者整体视图汇总查询。
- 修改：`D:\workspace-ai\AI2PmP\src\components\plans\plan-form.tsx`
  - 去掉半年度正式入口，保留年度、季度、月度。
  - 支持计划作废、调整、替换关系。
- 修改：`D:\workspace-ai\AI2PmP\src\components\plans\plan-item-modal.tsx`
  - 增加工作来源、执行流程、版本文本、专项任务字段。
  - 根据来源限制专项任务和项目交付的组合。
- 修改：`D:\workspace-ai\AI2PmP\src\components\plans\plan-details-client.tsx`
  - 展示工作来源、研发流程三大环节、四个关键里程碑、阶段安排。
- 新建：`D:\workspace-ai\AI2PmP\src\components\plans\plan-overview-client.tsx`
  - 管理者跨产品线小组年度/季度/月度整体视图。
- 新建：`D:\workspace-ai\AI2PmP\src\app\(dashboard)\plans\overview\page.tsx`
  - 整体计划视图页面。
- 修改：`D:\workspace-ai\AI2PmP\src\components\layout\dashboard-layout-client.tsx`
  - 增加“计划总览”入口，保留“计划管理”和“计划外工作”。
- 修改：`D:\workspace-ai\AI2PmP\scripts\assert-product-line-period-plans.mjs`
  - 增加数据边界断言。

---

### Task 1: 扩展 Prisma 数据模型

**Files:**
- Modify: `D:\workspace-ai\AI2PmP\prisma\schema.prisma`

- [ ] **Step 1: 在枚举区域加入新增枚举**

在 `PlanningTreatment` 后加入：

```prisma
/// 工作来源
enum WorkItemSource {
  PLATFORM_RND     // 平台研发规划
  LOCAL_DELIVERY   // 本地化项目交付
  UNPLANNED        // 计划外工作
}

/// 执行流程模板
enum ExecutionFlowTemplate {
  NONE                 // 不使用流程模板
  INTERNAL_RND          // 内部研发管理流程
  LOCAL_DEPLOYMENT      // 本地化部署流程
  DATA_MIGRATION        // 数据迁移流程
  SYSTEM_INTEGRATION    // 系统对接流程
  ONSITE_IMPLEMENTATION // 现场实施流程
}

/// 专项任务类型
enum SpecialTaskCategory {
  TECH_RESEARCH           // 技术研究
  SCENARIO_VALIDATION     // 场景验证
  INTELLECTUAL_PROPERTY   // 知识产权
}

/// 知识产权子类型
enum IntellectualPropertyType {
  PATENT             // 专利
  SOFTWARE_COPYRIGHT // 软著
  STANDARD           // 标准
}

/// 阶段所属环节
enum StageGroup {
  PRODUCT       // 产品环节
  DEVELOPMENT   // 研发环节
  TEST_RELEASE  // 测试与发布环节
  DELIVERY      // 项目交付环节
  OTHER         // 其他
}
```

- [ ] **Step 2: 扩展 `PlanStatus`**

将 `PlanStatus` 调整为：

```prisma
enum PlanStatus {
  DRAFT       // 草稿
  PUBLISHED   // 已发布
  IN_PROGRESS // 进行中
  ADJUSTED    // 已调整
  COMPLETED   // 已完成
  CANCELLED   // 已作废
  ARCHIVED    // 已归档
}
```

注意：保留 `CANCELLED` 作为数据库兼容值，前端中文统一显示“已作废”。

- [ ] **Step 3: 扩展 `Plan`**

在 `Plan` 中 `parentPlanId` 后加入：

```prisma
  sourcePlanId      String?
  replacementPlanId String?
  adjustedReason    String?   @db.Text
  voidedReason      String?   @db.Text
  voidedAt          DateTime?
```

在 `Plan` 关系区加入：

```prisma
  sourcePlan      Plan?  @relation("PlanSource", fields: [sourcePlanId], references: [id], onDelete: SetNull)
  derivedPlans    Plan[] @relation("PlanSource")
  replacementPlan Plan?  @relation("PlanReplacement", fields: [replacementPlanId], references: [id], onDelete: SetNull)
  replacedPlans   Plan[] @relation("PlanReplacement")
```

在索引区加入：

```prisma
  @@index([sourcePlanId])
  @@index([replacementPlanId])
```

- [ ] **Step 4: 扩展 `PlanItem`**

在 `PlanItem` 中 `type` 后加入：

```prisma
  source              WorkItemSource       @default(PLATFORM_RND)
  executionFlow       ExecutionFlowTemplate @default(NONE)
  versionNameText     String?
  specialTaskCategory SpecialTaskCategory?
  ipType              IntellectualPropertyType?
  specialSerialNo     String?
  specialTarget       String?              @db.Text
  specialOwnerText    String?
  plannedFinishText   String?
```

在关系区加入：

```prisma
  stages PlanItemStage[]
```

在索引区加入：

```prisma
  @@index([source])
  @@index([executionFlow])
  @@index([specialTaskCategory])
  @@index([ipType])
```

- [ ] **Step 5: 新增 `PlanItemStage` 模型**

放在 `PlanItem` 后、`Task` 前：

```prisma
/// 工作项阶段安排
model PlanItemStage {
  id          String         @id @default(cuid())
  planItemId  String
  group       StageGroup
  name        String
  isMilestone Boolean        @default(false)
  status      PlanItemStatus @default(TODO)
  plannedTime String?
  assigneeId  String?
  sortOrder   Int            @default(0)
  note        String?        @db.Text
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  planItem PlanItem @relation(fields: [planItemId], references: [id], onDelete: Cascade)
  assignee User?    @relation(fields: [assigneeId], references: [id], onDelete: SetNull)

  @@index([planItemId])
  @@index([group])
  @@index([isMilestone])
  @@index([status])
  @@index([assigneeId])
  @@map("plan_item_stages")
}
```

- [ ] **Step 6: 补充 `User` 关系**

在 `User` 中加入：

```prisma
  assignedPlanItemStages PlanItemStage[]
```

- [ ] **Step 7: 验证 Prisma schema**

Run:

```powershell
npx prisma validate
```

Expected: 输出包含 `The schema at prisma\schema.prisma is valid`。

- [ ] **Step 8: 生成迁移**

Run:

```powershell
npm run db:migrate -- --name plan_model_refinement
```

Expected: migration 生成成功。若本地库仍处于已 resolve 迁移状态，改用：

```powershell
npm run db:push
```

Expected: 输出包含数据库已同步或 push 成功。

---

### Task 2: 增加流程模板和中文标签

**Files:**
- Create: `D:\workspace-ai\AI2PmP\src\lib\plans\workflow-templates.ts`

- [ ] **Step 1: 新建模板文件**

写入：

```ts
import {
  ExecutionFlowTemplate,
  IntellectualPropertyType,
  SpecialTaskCategory,
  StageGroup,
  WorkItemSource,
} from "@prisma/client";

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
    { group: "DELIVERY", name: "校验", isMilestone: false, sortOrder: 40 },
    { group: "DELIVERY", name: "验收", isMilestone: true, sortOrder: 50 },
  ],
  SYSTEM_INTEGRATION: [
    { group: "DELIVERY", name: "接口确认", isMilestone: false, sortOrder: 10 },
    { group: "DELIVERY", name: "联调开发", isMilestone: false, sortOrder: 20 },
    { group: "DELIVERY", name: "测试", isMilestone: false, sortOrder: 30 },
    { group: "DELIVERY", name: "上线", isMilestone: false, sortOrder: 40 },
    { group: "DELIVERY", name: "验收", isMilestone: true, sortOrder: 50 },
  ],
  ONSITE_IMPLEMENTATION: [
    { group: "DELIVERY", name: "实施准备", isMilestone: false, sortOrder: 10 },
    { group: "DELIVERY", name: "现场配置", isMilestone: false, sortOrder: 20 },
    { group: "DELIVERY", name: "用户培训", isMilestone: false, sortOrder: 30 },
    { group: "DELIVERY", name: "问题处理", isMilestone: false, sortOrder: 40 },
    { group: "DELIVERY", name: "验收", isMilestone: true, sortOrder: 50 },
  ],
};
```

- [ ] **Step 2: 类型检查**

Run:

```powershell
npx tsc --noEmit
```

Expected: 没有 `workflow-templates.ts` 类型错误。

---

### Task 3: 扩展 Zod 校验

**Files:**
- Modify: `D:\workspace-ai\AI2PmP\src\lib\validations\plans.ts`

- [ ] **Step 1: 扩展 import**

改为：

```ts
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
```

- [ ] **Step 2: 扩展 `planSchema`**

在 `parentPlanId` 后加入：

```ts
  sourcePlanId: z.string().optional().nullable(),
  replacementPlanId: z.string().optional().nullable(),
  adjustedReason: z.string().optional(),
  voidedReason: z.string().optional(),
  voidedAt: z.string().or(z.date()).optional().nullable(),
```

- [ ] **Step 3: 扩展 `planItemSchema` 字段**

在 `type` 后加入：

```ts
    source: z.nativeEnum(WorkItemSource).default(WorkItemSource.PLATFORM_RND),
    executionFlow: z.nativeEnum(ExecutionFlowTemplate).default(ExecutionFlowTemplate.NONE),
    versionNameText: z.string().optional().nullable(),
    specialTaskCategory: z.nativeEnum(SpecialTaskCategory).optional().nullable(),
    ipType: z.nativeEnum(IntellectualPropertyType).optional().nullable(),
    specialSerialNo: z.string().optional().nullable(),
    specialTarget: z.string().optional().nullable(),
    specialOwnerText: z.string().optional().nullable(),
    plannedFinishText: z.string().optional().nullable(),
```

- [ ] **Step 4: 增加组合校验**

在 `superRefine` 末尾加入：

```ts
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
```

- [ ] **Step 5: 类型检查**

Run:

```powershell
npx tsc --noEmit
```

Expected: validation 类型通过。

---

### Task 4: 服务端动作支持新字段和阶段模板

**Files:**
- Modify: `D:\workspace-ai\AI2PmP\src\actions\plans.ts`

- [ ] **Step 1: 扩展 import**

改为：

```ts
import {
  ExecutionFlowTemplate,
  PlanStatus,
  PlanType,
  PlanningTreatment,
  WorkItemSource,
  WorkItemType,
} from "@prisma/client";
import { deliveryFlowStages } from "@/lib/plans/workflow-templates";
```

- [ ] **Step 2: 新增阶段创建 helper**

在 `summarizePlanItems` 后加入：

```ts
async function createDefaultStages(planItemId: string, flow: ExecutionFlowTemplate) {
  const templates = deliveryFlowStages[flow] ?? [];
  if (templates.length === 0) return;

  await prisma.planItemStage.createMany({
    data: templates.map((stage) => ({
      planItemId,
      group: stage.group,
      name: stage.name,
      isMilestone: stage.isMilestone,
      sortOrder: stage.sortOrder,
    })),
  });
}
```

- [ ] **Step 3: `createPlan` 和 `updatePlan` 保存变动字段**

在 `data` 中加入：

```ts
sourcePlanId: data.sourcePlanId ?? null,
replacementPlanId: data.replacementPlanId ?? null,
adjustedReason: data.adjustedReason ?? null,
voidedReason: data.voidedReason ?? null,
voidedAt: data.voidedAt ? new Date(data.voidedAt) : null,
```

- [ ] **Step 4: 扩展 `addPlanItem` create data**

在 `type` 后加入：

```ts
source: data.isPlanned ? data.source ?? WorkItemSource.PLATFORM_RND : WorkItemSource.UNPLANNED,
executionFlow: data.executionFlow ?? ExecutionFlowTemplate.NONE,
versionNameText: data.versionNameText ?? null,
specialTaskCategory: data.specialTaskCategory ?? null,
ipType: data.ipType ?? null,
specialSerialNo: data.specialSerialNo ?? null,
specialTarget: data.specialTarget ?? null,
specialOwnerText: data.specialOwnerText ?? null,
plannedFinishText: data.plannedFinishText ?? null,
```

创建完成后加入：

```ts
await createDefaultStages(item.id, item.executionFlow);
```

- [ ] **Step 5: 扩展 `updatePlanItem` update data**

在 `type` 后加入：

```ts
source: nextIsPlanned ? data.source ?? oldItem.source : WorkItemSource.UNPLANNED,
executionFlow: data.executionFlow ?? oldItem.executionFlow,
versionNameText: data.versionNameText ?? null,
specialTaskCategory: data.specialTaskCategory ?? null,
ipType: data.ipType ?? null,
specialSerialNo: data.specialSerialNo ?? null,
specialTarget: data.specialTarget ?? null,
specialOwnerText: data.specialOwnerText ?? null,
plannedFinishText: data.plannedFinishText ?? null,
```

更新后补充：

```ts
if (data.executionFlow && data.executionFlow !== oldItem.executionFlow) {
  await prisma.planItemStage.deleteMany({ where: { planItemId: itemId } });
  await createDefaultStages(itemId, data.executionFlow);
}
```

- [ ] **Step 6: 扩展查询 include**

在 `getPlanById` 的 `items.include` 中加入：

```ts
stages: {
  orderBy: { sortOrder: "asc" },
  include: {
    assignee: { select: { id: true, name: true } },
  },
},
```

- [ ] **Step 7: 新增管理者整体视图动作**

在文件末尾加入：

```ts
export async function getPlanOverview(type?: PlanType, year?: number) {
  try {
    const plans = await prisma.plan.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(year ? { year } : {}),
        status: { not: PlanStatus.CANCELLED },
      },
      include: {
        productLineTeam: { select: { id: true, name: true } },
        items: {
          select: {
            id: true,
            source: true,
            isPlanned: true,
            progress: true,
            specialTaskCategory: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { updatedAt: "desc" }],
    });

    const rows = plans.map((plan) => {
      const summary = summarizePlanItems(plan.items);
      return {
        id: plan.id,
        title: plan.title,
        type: plan.type,
        status: plan.status,
        year: plan.year,
        quarter: plan.quarter,
        month: plan.month,
        productLineTeam: plan.productLineTeam,
        progress: summary.plannedProgress,
        plannedCount: summary.plannedCount,
        unplannedCount: summary.unplannedCount,
        platformRndCount: plan.items.filter((item) => item.source === "PLATFORM_RND").length,
        localDeliveryCount: plan.items.filter((item) => item.source === "LOCAL_DELIVERY").length,
        specialTaskCount: plan.items.filter((item) => item.specialTaskCategory).length,
      };
    });

    return { success: true, data: rows };
  } catch (error) {
    console.error("[getPlanOverview] 获取计划整体视图失败:", error);
    return { success: false, error: "获取计划整体视图失败", data: [] };
  }
}
```

- [ ] **Step 8: 类型检查**

Run:

```powershell
npx tsc --noEmit
```

Expected: server action 类型通过。

---

### Task 5: 调整计划表单

**Files:**
- Modify: `D:\workspace-ai\AI2PmP\src\components\plans\plan-form.tsx`

- [ ] **Step 1: 隐藏半年度正式入口**

从计划类型 `<select>` 删除：

```tsx
<option value={PlanType.HALF_YEAR}>半年计划</option>
```

保留 `typeLabels.HALF_YEAR` 用于兼容历史数据展示。

- [ ] **Step 2: 增加作废和归档状态显示**

在状态下拉中将 `CANCELLED` 文案改为“已作废”，并加入归档：

```tsx
<option value={PlanStatus.CANCELLED}>已作废</option>
<option value={PlanStatus.ARCHIVED}>已归档</option>
```

- [ ] **Step 3: 增加变动说明字段**

在 `goals` state 后加入：

```ts
const [adjustedReason, setAdjustedReason] = useState(initialData?.adjustedReason || "");
const [voidedReason, setVoidedReason] = useState(initialData?.voidedReason || "");
```

在 payload 中加入：

```ts
adjustedReason: adjustedReason.trim() || undefined,
voidedReason: status === PlanStatus.CANCELLED ? voidedReason.trim() || undefined : undefined,
```

- [ ] **Step 4: 状态为作废时显示原因输入**

在核心目标输入后加入：

```tsx
{status === PlanStatus.CANCELLED && (
  <div className="space-y-1.5">
    <label htmlFor="voidedReason" className="block text-xs font-medium text-muted-foreground">
      作废原因
    </label>
    <textarea
      id="voidedReason"
      rows={3}
      value={voidedReason}
      onChange={(e) => setVoidedReason(e.target.value)}
      className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white focus:border-primary focus:outline-none resize-y"
      placeholder="说明该计划作废的原因"
    />
  </div>
)}
```

- [ ] **Step 5: 类型检查**

Run:

```powershell
npx tsc --noEmit
```

Expected: plan form 类型通过。

---

### Task 6: 调整工作项表单

**Files:**
- Modify: `D:\workspace-ai\AI2PmP\src\components\plans\plan-item-modal.tsx`

- [ ] **Step 1: 扩展 import**

改为：

```ts
import {
  ExecutionFlowTemplate,
  IntellectualPropertyType,
  PlanItemStatus,
  PlanningTreatment,
  SpecialTaskCategory,
  WorkItemSource,
  WorkItemType,
} from "@prisma/client";
import {
  executionFlowLabels,
  intellectualPropertyTypeLabels,
  specialTaskCategoryLabels,
  workItemSourceLabels,
} from "@/lib/plans/workflow-templates";
```

- [ ] **Step 2: 扩展 state**

加入：

```ts
const [source, setSource] = useState<WorkItemSource>(WorkItemSource.PLATFORM_RND);
const [executionFlow, setExecutionFlow] = useState<ExecutionFlowTemplate>(ExecutionFlowTemplate.NONE);
const [versionNameText, setVersionNameText] = useState("");
const [specialTaskCategory, setSpecialTaskCategory] = useState<SpecialTaskCategory | "">("");
const [ipType, setIpType] = useState<IntellectualPropertyType | "">("");
const [specialSerialNo, setSpecialSerialNo] = useState("");
const [specialTarget, setSpecialTarget] = useState("");
const [specialOwnerText, setSpecialOwnerText] = useState("");
const [plannedFinishText, setPlannedFinishText] = useState("");
```

- [ ] **Step 3: 自动设置流程模板**

在组件内部加入：

```ts
const handleSourceChange = (nextSource: WorkItemSource) => {
  setSource(nextSource);
  if (nextSource === WorkItemSource.LOCAL_DELIVERY) {
    setExecutionFlow(ExecutionFlowTemplate.LOCAL_DEPLOYMENT);
    setSpecialTaskCategory("");
    setIpType("");
  }
  if (nextSource === WorkItemSource.PLATFORM_RND) {
    setExecutionFlow(ExecutionFlowTemplate.NONE);
  }
};
```

- [ ] **Step 4: 扩展 payload**

加入：

```ts
source: isPlanned ? source : WorkItemSource.UNPLANNED,
executionFlow,
versionNameText: versionNameText.trim() || undefined,
specialTaskCategory: specialTaskCategory || undefined,
ipType: ipType || undefined,
specialSerialNo: specialSerialNo.trim() || undefined,
specialTarget: specialTarget.trim() || undefined,
specialOwnerText: specialOwnerText.trim() || undefined,
plannedFinishText: plannedFinishText.trim() || undefined,
```

- [ ] **Step 5: 添加工作来源和执行流程控件**

放在工作项类型后：

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
  <div className="space-y-1.5">
    <label className="text-muted-foreground font-medium">工作来源</label>
    <select
      value={source}
      onChange={(e) => handleSourceChange(e.target.value as WorkItemSource)}
      className="w-full rounded-lg border border-border bg-input py-2 px-3 text-white focus:border-primary focus:outline-none"
    >
      <option value={WorkItemSource.PLATFORM_RND}>{workItemSourceLabels.PLATFORM_RND}</option>
      <option value={WorkItemSource.LOCAL_DELIVERY}>{workItemSourceLabels.LOCAL_DELIVERY}</option>
    </select>
  </div>

  <div className="space-y-1.5">
    <label className="text-muted-foreground font-medium">执行流程</label>
    <select
      value={executionFlow}
      onChange={(e) => setExecutionFlow(e.target.value as ExecutionFlowTemplate)}
      className="w-full rounded-lg border border-border bg-input py-2 px-3 text-white focus:border-primary focus:outline-none"
    >
      {Object.entries(executionFlowLabels).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  </div>
</div>
```

- [ ] **Step 6: 平台研发规划显示专项任务字段**

在关联版本字段后加入：

```tsx
{source === WorkItemSource.PLATFORM_RND && (
  <div className="space-y-3 rounded-lg border border-border/60 bg-input/20 p-3">
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="space-y-1.5">
        <label className="text-muted-foreground font-medium">专项任务类型</label>
        <select
          value={specialTaskCategory}
          onChange={(e) => setSpecialTaskCategory(e.target.value as SpecialTaskCategory | "")}
          className="w-full rounded-lg border border-border bg-input py-2 px-3 text-white focus:border-primary focus:outline-none"
        >
          <option value="">非专项任务</option>
          {Object.entries(specialTaskCategoryLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {specialTaskCategory === SpecialTaskCategory.INTELLECTUAL_PROPERTY && (
        <div className="space-y-1.5">
          <label className="text-muted-foreground font-medium">知识产权类型</label>
          <select
            value={ipType}
            onChange={(e) => setIpType(e.target.value as IntellectualPropertyType | "")}
            className="w-full rounded-lg border border-border bg-input py-2 px-3 text-white focus:border-primary focus:outline-none"
          >
            <option value="">请选择</option>
            {Object.entries(intellectualPropertyTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>

    {specialTaskCategory && (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <input
          value={specialSerialNo}
          onChange={(e) => setSpecialSerialNo(e.target.value)}
          placeholder="编号"
          className="rounded-lg border border-border bg-input py-2 px-3 text-white focus:border-primary focus:outline-none"
        />
        <input
          value={plannedFinishText}
          onChange={(e) => setPlannedFinishText(e.target.value)}
          placeholder="完成时间，例如 第三季度 或 2025.12"
          className="rounded-lg border border-border bg-input py-2 px-3 text-white focus:border-primary focus:outline-none"
        />
        <input
          value={specialOwnerText}
          onChange={(e) => setSpecialOwnerText(e.target.value)}
          placeholder="承担机构或人员"
          className="rounded-lg border border-border bg-input py-2 px-3 text-white focus:border-primary focus:outline-none md:col-span-2"
        />
        <textarea
          rows={2}
          value={specialTarget}
          onChange={(e) => setSpecialTarget(e.target.value)}
          placeholder="目标"
          className="rounded-lg border border-border bg-input py-2 px-3 text-white focus:border-primary focus:outline-none md:col-span-2"
        />
      </div>
    )}
  </div>
)}
```

- [ ] **Step 7: 增加版本名称文本输入**

在产品版本选择后加入：

```tsx
<input
  value={versionNameText}
  onChange={(e) => setVersionNameText(e.target.value)}
  placeholder="未维护版本库时可直接填写版本名称，例如 大陆通平台 V1.9.6"
  className="w-full rounded-lg border border-border bg-input py-2 px-3 text-white focus:border-primary focus:outline-none"
/>
```

- [ ] **Step 8: 类型检查**

Run:

```powershell
npx tsc --noEmit
```

Expected: 工作项表单类型通过。

---

### Task 7: 计划详情页展示来源、流程和里程碑

**Files:**
- Modify: `D:\workspace-ai\AI2PmP\src\components\plans\plan-details-client.tsx`

- [ ] **Step 1: 扩展类型和 import**

从 `@prisma/client` 增加：

```ts
ExecutionFlowTemplate,
IntellectualPropertyType,
SpecialTaskCategory,
StageGroup,
WorkItemSource,
```

从模板文件引入：

```ts
import {
  executionFlowLabels,
  specialTaskCategoryLabels,
  workItemSourceLabels,
} from "@/lib/plans/workflow-templates";
```

- [ ] **Step 2: 扩展 `PlanItemDetails`**

加入：

```ts
source: WorkItemSource;
executionFlow: ExecutionFlowTemplate;
versionNameText?: string | null;
specialTaskCategory?: SpecialTaskCategory | null;
ipType?: IntellectualPropertyType | null;
specialSerialNo?: string | null;
specialTarget?: string | null;
specialOwnerText?: string | null;
plannedFinishText?: string | null;
stages: Array<{
  id: string;
  group: StageGroup;
  name: string;
  isMilestone: boolean;
  status: PlanItemStatus;
  plannedTime?: string | null;
  assignee?: { id: string; name: string } | null;
  sortOrder: number;
}>;
```

- [ ] **Step 3: 在工作项卡片显示来源和流程**

在类型标签后加入：

```tsx
<span className="rounded bg-cyan-500/10 px-2 py-0.5 font-medium text-cyan-400 border border-cyan-500/20">
  {workItemSourceLabels[item.source]}
</span>
{item.executionFlow !== "NONE" && (
  <span className="rounded bg-purple-500/10 px-2 py-0.5 font-medium text-purple-400 border border-purple-500/20">
    {executionFlowLabels[item.executionFlow]}
  </span>
)}
```

- [ ] **Step 4: 显示三大环节和关键里程碑**

在进度条上方加入：

```tsx
{item.stages.length > 0 && (
  <div className="grid grid-cols-1 gap-2 pt-2 md:grid-cols-3">
    {(["PRODUCT", "DEVELOPMENT", "TEST_RELEASE"] as const).map((group) => {
      const groupStages = item.stages.filter((stage) => stage.group === group);
      if (groupStages.length === 0) return null;
      const milestoneNames = groupStages.filter((stage) => stage.isMilestone).map((stage) => stage.name).join("、");
      const groupLabel = group === "PRODUCT" ? "产品环节" : group === "DEVELOPMENT" ? "研发环节" : "测试与发布环节";
      return (
        <div key={group} className="rounded-lg border border-border/50 bg-background/30 p-2">
          <div className="text-[10px] font-semibold text-white">{groupLabel}</div>
          <div className="mt-1 text-[10px] text-muted-foreground">{milestoneNames || "无关键里程碑"}</div>
        </div>
      );
    })}
  </div>
)}
```

- [ ] **Step 5: 显示专项任务元数据**

在关联版本显示附近加入：

```tsx
{item.specialTaskCategory && (
  <div className="rounded-lg border border-border/50 bg-input/20 p-2 text-[10px] text-muted-foreground">
    <span className="font-semibold text-white">{specialTaskCategoryLabels[item.specialTaskCategory]}</span>
    {item.specialSerialNo && <span className="ml-2">编号：{item.specialSerialNo}</span>}
    {item.plannedFinishText && <span className="ml-2">完成时间：{item.plannedFinishText}</span>}
    {item.specialOwnerText && <span className="ml-2">承担：{item.specialOwnerText}</span>}
    {item.specialTarget && <div className="mt-1">目标：{item.specialTarget}</div>}
  </div>
)}
```

- [ ] **Step 6: 类型检查**

Run:

```powershell
npx tsc --noEmit
```

Expected: 详情页类型通过。

---

### Task 8: 增加管理者整体视图

**Files:**
- Create: `D:\workspace-ai\AI2PmP\src\components\plans\plan-overview-client.tsx`
- Create: `D:\workspace-ai\AI2PmP\src\app\(dashboard)\plans\overview\page.tsx`
- Modify: `D:\workspace-ai\AI2PmP\src\components\layout\dashboard-layout-client.tsx`

- [ ] **Step 1: 创建整体视图组件**

新建 `plan-overview-client.tsx`：

```tsx
"use client";

import Link from "next/link";
import { PlanStatus, PlanType } from "@prisma/client";
import { BarChart3, Layers } from "lucide-react";

const typeLabels: Record<PlanType, string> = {
  ANNUAL: "年度计划",
  HALF_YEAR: "半年视图",
  QUARTERLY: "季度计划",
  MONTHLY: "月度计划",
};

const statusLabels: Record<PlanStatus, string> = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
  IN_PROGRESS: "进行中",
  ADJUSTED: "已调整",
  COMPLETED: "已完成",
  CANCELLED: "已作废",
  ARCHIVED: "已归档",
};

type OverviewRow = {
  id: string;
  title: string;
  type: PlanType;
  status: PlanStatus;
  year: number;
  quarter?: number | null;
  month?: number | null;
  productLineTeam: { id: string; name: string };
  progress: number;
  plannedCount: number;
  unplannedCount: number;
  platformRndCount: number;
  localDeliveryCount: number;
  specialTaskCount: number;
};

export default function PlanOverviewClient({ rows }: { rows: OverviewRow[] }) {
  const avgProgress = rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.progress, 0) / rows.length) : 0;
  const platformTotal = rows.reduce((sum, row) => sum + row.platformRndCount, 0);
  const deliveryTotal = rows.reduce((sum, row) => sum + row.localDeliveryCount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">计划总览</h1>
        <p className="mt-1 text-sm text-muted-foreground">跨产品线小组查看年度、季度、月度计划整体执行情况。</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="glass rounded-xl p-4">
          <div className="text-xs text-muted-foreground">计划数</div>
          <div className="mt-2 text-2xl font-bold text-white">{rows.length}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-xs text-muted-foreground">平均进度</div>
          <div className="mt-2 text-2xl font-bold text-indigo-400">{avgProgress}%</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-xs text-muted-foreground">平台研发工作项</div>
          <div className="mt-2 text-2xl font-bold text-cyan-400">{platformTotal}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-xs text-muted-foreground">项目交付工作项</div>
          <div className="mt-2 text-2xl font-bold text-amber-400">{deliveryTotal}</div>
        </div>
      </div>

      <div className="glass overflow-hidden rounded-xl">
        <div className="border-b border-border/60 px-4 py-3 text-sm font-semibold text-white">产品线小组计划明细</div>
        <div className="divide-y divide-border/60">
          {rows.map((row) => (
            <Link key={row.id} href={`/plans/${row.id}`} className="grid grid-cols-1 gap-3 p-4 hover:bg-muted/20 md:grid-cols-6">
              <div className="md:col-span-2">
                <div className="text-sm font-semibold text-white">{row.title}</div>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Layers className="h-3.5 w-3.5" />
                  {row.productLineTeam.name}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{typeLabels[row.type]}</div>
              <div className="text-xs text-muted-foreground">{statusLabels[row.status]}</div>
              <div className="text-xs text-muted-foreground">进度 {row.progress}%</div>
              <div className="text-xs text-muted-foreground">
                平台 {row.platformRndCount} / 交付 {row.localDeliveryCount} / 专项 {row.specialTaskCount}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建页面**

新建 `src\app\(dashboard)\plans\overview\page.tsx`：

```tsx
import type { Metadata } from "next";
import { getPlanOverview } from "@/actions/plans";
import PlanOverviewClient from "@/components/plans/plan-overview-client";

export const metadata: Metadata = {
  title: "AI2PmP - 计划总览",
  description: "跨产品线小组计划整体视图",
};

export default async function PlanOverviewPage() {
  const res = await getPlanOverview();
  return <PlanOverviewClient rows={res.data || []} />;
}
```

- [ ] **Step 3: 增加导航**

在 `dashboard-layout-client.tsx` 中引入 `BarChart3` 已存在，新增 nav item：

```ts
{ label: "计划总览", href: "/plans/overview", icon: BarChart3 },
```

放在“计划管理”后面。

- [ ] **Step 4: 类型检查**

Run:

```powershell
npx tsc --noEmit
```

Expected: 整体视图类型通过。

---

### Task 9: 扩展断言脚本

**Files:**
- Modify: `D:\workspace-ai\AI2PmP\scripts\assert-product-line-period-plans.mjs`

- [ ] **Step 1: 增加模型边界断言**

加入：

```js
const deliverySpecialCount = await prisma.planItem.count({
  where: {
    source: "LOCAL_DELIVERY",
    specialTaskCategory: { not: null },
  },
});

if (deliverySpecialCount > 0) {
  throw new Error(`发现 ${deliverySpecialCount} 个项目交付工作项错误承载专项任务`);
}

const customDevelopmentWithoutFlow = await prisma.planItem.count({
  where: {
    source: "LOCAL_DELIVERY",
    type: "PROJECT_MATTER",
    title: { contains: "定制" },
    executionFlow: { not: "INTERNAL_RND" },
  },
});

if (customDevelopmentWithoutFlow > 0) {
  throw new Error(`发现 ${customDevelopmentWithoutFlow} 个定制化开发事项未使用内部研发管理流程`);
}

const internalRndItems = await prisma.planItem.findMany({
  where: { executionFlow: "INTERNAL_RND" },
  select: {
    id: true,
    title: true,
    stages: { select: { name: true, isMilestone: true } },
  },
});

for (const item of internalRndItems) {
  const milestoneNames = item.stages.filter((stage) => stage.isMilestone).map((stage) => stage.name);
  for (const required of ["项目/任务启动会", "需求评审及宣讲", "研发启动", "提测"]) {
    if (!milestoneNames.includes(required)) {
      throw new Error(`工作项 ${item.title} 缺少关键里程碑：${required}`);
    }
  }
}
```

- [ ] **Step 2: 运行断言**

Run:

```powershell
npm run assert:plans
```

Expected: 输出已有计划检查结果，不抛出新增边界错误。

---

### Task 10: 验证与收尾

**Files:**
- 预期不需要新增文件。

- [ ] **Step 1: Prisma 验证**

Run:

```powershell
npx prisma validate
```

Expected: schema valid。

- [ ] **Step 2: 类型检查**

Run:

```powershell
npx tsc --noEmit
```

Expected: exit code 0。

- [ ] **Step 3: 定向 lint**

Run:

```powershell
npx eslint src/actions/plans.ts src/lib/validations/plans.ts src/components/plans/plan-form.tsx src/components/plans/plan-item-modal.tsx src/components/plans/plan-details-client.tsx src/components/plans/plan-overview-client.tsx src/components/layout/dashboard-layout-client.tsx scripts/assert-product-line-period-plans.mjs
```

Expected: 这些被修改文件无 lint 错误。

- [ ] **Step 4: Build**

Run:

```powershell
npm run build
```

Expected: build 成功。若出现 Next `middleware` deprecation warning，只记录为既有警告，不作为本次失败。

- [ ] **Step 5: 启动并冒烟验证**

Run:

```powershell
npm run dev
```

浏览器验证：

```text
/plans
/plans/overview
/plans/unplanned
/plans/[planId]
```

Expected:

- 半年度不再作为正式创建入口出现。
- 计划可显示已作废、已调整、已归档等状态。
- 工作项可区分平台研发规划、本地化项目交付、计划外工作。
- 项目交付计划不允许录入技术研究、场景验证、知识产权专项任务。
- 定制化开发可选择内部研发管理流程。
- 内部研发流程默认显示三大环节和四个关键里程碑。
- 管理者计划总览按产品线小组汇总展示。

---

## 自检结论

- 规格覆盖：覆盖产品线小组责任边界、管理者整体视图、年度/季度/月度关系、半年度非正式对象、计划变动性、平台研发规划、本地化项目交付、专项任务、统一内部研发流程、三大环节、四个关键里程碑、计划外工作和统计口径。
- 占位检查：没有未完成占位语句；没有依赖未定义文件。
- 范围控制：本计划不实现产出物管理，不建立项目交付线索到专项任务的系统转换关系，不恢复“项目管理”为主流程入口。
- 兼容策略：`PlanType.HALF_YEAR` 暂不从数据库删除，只从正式创建入口隐藏，避免破坏已有数据和枚举迁移。
