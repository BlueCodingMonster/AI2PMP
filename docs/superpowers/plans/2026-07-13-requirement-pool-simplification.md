# 需求池精简实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将需求池收缩为已确认的 11 个业务字段，直接删除旧数据库字段，同时保留产品线、计划和任务的可选关联。

**Architecture:** 保留 `Requirement` 的内部字符串主键，新增数据库自增序号并在展示层格式化为 `XQ0001`。通过 Prisma 迁移完成枚举映射和旧字段删除；Zod 统一约束六种状态及“已评审必须填写评审通过时间”；Server Actions 继续负责鉴权、写入和 `revalidatePath`；页面只消费精简后的查询形状。

**Tech Stack:** Next.js 16.2 App Router、React 19、Server Actions、TypeScript、Prisma 7、PostgreSQL、Zod、Node.js 断言脚本。

---

## 文件结构

- 创建 `prisma/migrations/20260713_simplify_requirement_pool/migration.sql`：迁移序号、评审时间、状态/来源和值映射，并删除旧列。
- 修改 `prisma/schema.prisma`：收缩枚举和 `Requirement` 模型，移除 User/Project 的旧反向关系。
- 修改 `prisma/seed.ts`：只写入精简字段。
- 创建 `src/lib/requirements/presentation.ts`：集中维护编号格式和中文枚举标签。
- 修改 `src/lib/validations/requirements.ts`：定义唯一的需求输入校验。
- 修改 `src/actions/requirements.ts`：收缩查询、创建、更新、状态更新及筛选参数。
- 修改 `src/components/requirements/requirement-form.tsx`：重做新建/编辑表单。
- 删除 `src/components/requirements/status-flow.tsx`：状态改由表单直接选择，不再保留顺序流转组件。
- 修改需求池 `new`、`edit`、列表和详情页面：去除旧数据依赖。
- 修改 `scripts/assert-requirements-table-columns.mjs`：锁定新列表列顺序。
- 创建 `scripts/assert-requirement-pool-simplification.mjs`：覆盖模型、校验、动作和页面的关键契约。
- 修改 `package.json`：增加 `assert:requirements` 命令。

## Task 1：先建立会失败的需求池契约测试

**Files:**
- Create: `scripts/assert-requirement-pool-simplification.mjs`
- Modify: `scripts/assert-requirements-table-columns.mjs`
- Modify: `package.json`

- [ ] **Step 1：写精简模型契约断言**

创建 `scripts/assert-requirement-pool-simplification.mjs`：

```js
import { existsSync, readFileSync } from "node:fs";

const read = (path) => existsSync(path) ? readFileSync(path, "utf8") : "";

const files = {
  schema: read("prisma/schema.prisma"),
  validation: read("src/lib/validations/requirements.ts"),
  actions: read("src/actions/requirements.ts"),
  form: read("src/components/requirements/requirement-form.tsx"),
  list: read("src/app/(dashboard)/requirements/page.tsx"),
  detail: read("src/app/(dashboard)/requirements/[requirementId]/page.tsx"),
  presentation: read("src/lib/requirements/presentation.ts"),
};
const requirementModel = files.schema.match(/model Requirement \{[\s\S]*?\n\}/)?.[0] ?? "";

const failures = [];
const expectIncludes = (source, text, message) => {
  if (!source.includes(text)) failures.push(message);
};
const expectExcludes = (source, text, message) => {
  if (source.includes(text)) failures.push(message);
};

for (const status of ["PENDING_REVIEW", "UNDER_REVIEW", "REVIEWED", "REJECTED", "SCHEDULED", "COMPLETED"]) {
  expectIncludes(files.schema, status, `缺少需求状态 ${status}`);
}
for (const source of ["PRODUCT_PLANNING", "CUSTOMER_FEEDBACK", "INTERNAL_REQUEST", "MARKET_REQUEST"]) {
  expectIncludes(files.schema, source, `缺少需求来源 ${source}`);
}
for (const field of ["sequenceNo", "reviewedAt", "productLineTeamId", "proposer", "proposedAt", "createdById", "createdAt"]) {
  expectIncludes(files.schema, field, `Requirement 缺少字段 ${field}`);
}
for (const removed of ["RequirementType", "businessValue", "complexity", "estimatedDays", "acceptanceCriteria", "assigneeId", "projectId"]) {
  if (removed === "RequirementType") {
    expectExcludes(files.schema, removed, `Schema 仍包含已删除需求枚举 ${removed}`);
  } else {
    expectExcludes(requirementModel, removed, `Requirement 仍包含已删除字段 ${removed}`);
  }
}
expectIncludes(files.validation, "状态为已评审时必须选择评审通过时间", "缺少已评审日期校验");
expectIncludes(files.actions, "sequenceNo", "查询未返回需求流水号");
expectIncludes(files.actions, "reviewedAt", "动作未读写评审通过时间");
expectIncludes(files.actions, "revalidatePath(\"/requirements\")", "动作未刷新需求池列表");
expectIncludes(files.presentation, "XQ", "缺少 XQ 编号格式化");
for (const removed of ["businessValue", "complexity", "estimatedDays", "acceptanceCriteria", "assigneeId", "projectId", "RequirementType"]) {
  expectExcludes(files.form, removed, `表单仍包含旧字段 ${removed}`);
  expectExcludes(files.list, removed, `列表仍包含旧字段 ${removed}`);
  expectExcludes(files.detail, removed, `详情仍包含旧字段 ${removed}`);
}

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log("需求池精简契约检查通过");
```

- [ ] **Step 2：把列表表头断言改成确认后的顺序**

将 `scripts/assert-requirements-table-columns.mjs` 中 `expectedHeaders` 改为：

```js
const expectedHeaders = [
  "需求编号",
  "需求名称",
  "归属产品线",
  "优先级",
  "需求来源",
  "客户名称或需求方",
  "提出时间",
  "创建时间",
  "创建人",
  "需求状态",
  "评审通过时间",
  "操作",
];
```

并把空表格 `colSpan` 的契约纳入新脚本：

```js
expectIncludes(files.list, "colSpan={12}", "需求池空状态列数必须为 12");
```

- [ ] **Step 3：增加测试命令**

在 `package.json` 的 `scripts` 中加入：

```json
"assert:requirements": "node scripts/assert-requirement-pool-simplification.mjs && node scripts/assert-requirements-table-columns.mjs"
```

- [ ] **Step 4：运行测试并确认 RED**

Run: `npm run assert:requirements`

Expected: FAIL，至少报告旧状态、旧字段仍存在以及编号展示函数缺失；失败来自契约不满足，而不是脚本运行异常。

- [ ] **Step 5：提交 RED 测试**

```powershell
git add package.json scripts/assert-requirement-pool-simplification.mjs scripts/assert-requirements-table-columns.mjs
git commit -m "test: define simplified requirement pool contract"
```

## Task 2：迁移并收缩 Prisma 数据模型

**Files:**
- Create: `prisma/migrations/20260713_simplify_requirement_pool/migration.sql`
- Modify: `prisma/schema.prisma`

- [ ] **Step 1：写迁移 SQL**

创建迁移，按下列顺序执行：

```sql
ALTER TABLE "requirements" ADD COLUMN "sequenceNo" INTEGER;
ALTER TABLE "requirements" ADD COLUMN "reviewedAt" TIMESTAMP(3);

CREATE SEQUENCE "requirements_sequence_no_seq";
WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS number
  FROM "requirements"
)
UPDATE "requirements" AS requirement
SET "sequenceNo" = numbered.number
FROM numbered
WHERE requirement."id" = numbered."id";

SELECT setval(
  'requirements_sequence_no_seq',
  GREATEST(COALESCE((SELECT MAX("sequenceNo") FROM "requirements"), 0), 1),
  EXISTS (SELECT 1 FROM "requirements")
);
ALTER SEQUENCE "requirements_sequence_no_seq" OWNED BY "requirements"."sequenceNo";
ALTER TABLE "requirements" ALTER COLUMN "sequenceNo" SET DEFAULT nextval('requirements_sequence_no_seq');
ALTER TABLE "requirements" ALTER COLUMN "sequenceNo" SET NOT NULL;
CREATE UNIQUE INDEX "requirements_sequenceNo_key" ON "requirements"("sequenceNo");

CREATE TYPE "RequirementStatus_new" AS ENUM (
  'PENDING_REVIEW', 'UNDER_REVIEW', 'REVIEWED', 'REJECTED', 'SCHEDULED', 'COMPLETED'
);
ALTER TABLE "requirements" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "requirements" ALTER COLUMN "status" TYPE "RequirementStatus_new"
USING (
  CASE "status"::text
    WHEN 'DRAFT' THEN 'PENDING_REVIEW'
    WHEN 'UNDER_REVIEW' THEN 'UNDER_REVIEW'
    WHEN 'APPROVED' THEN 'REVIEWED'
    WHEN 'REJECTED' THEN 'REJECTED'
    WHEN 'PLANNED' THEN 'SCHEDULED'
    WHEN 'IN_PROGRESS' THEN 'SCHEDULED'
    WHEN 'COMPLETED' THEN 'COMPLETED'
    WHEN 'DEFERRED' THEN 'PENDING_REVIEW'
  END
)::"RequirementStatus_new";
DROP TYPE "RequirementStatus";
ALTER TYPE "RequirementStatus_new" RENAME TO "RequirementStatus";
ALTER TABLE "requirements" ALTER COLUMN "status" SET DEFAULT 'PENDING_REVIEW';

CREATE TYPE "RequirementSource_new" AS ENUM (
  'PRODUCT_PLANNING', 'CUSTOMER_FEEDBACK', 'INTERNAL_REQUEST', 'MARKET_REQUEST'
);
ALTER TABLE "requirements" ALTER COLUMN "source" TYPE "RequirementSource_new"
USING (
  CASE "source"::text
    WHEN 'PRODUCT_PLANNING' THEN 'PRODUCT_PLANNING'
    WHEN 'CUSTOMER_FEEDBACK' THEN 'CUSTOMER_FEEDBACK'
    WHEN 'INTERNAL_SUGGESTION' THEN 'INTERNAL_REQUEST'
    WHEN 'MARKET_ANALYSIS' THEN 'MARKET_REQUEST'
    WHEN 'TECH_DEBT' THEN 'INTERNAL_REQUEST'
  END
)::"RequirementSource_new";
DROP TYPE "RequirementSource";
ALTER TYPE "RequirementSource_new" RENAME TO "RequirementSource";

UPDATE "requirements" SET "priority" = 'HIGH' WHERE "priority" = 'URGENT';

ALTER TABLE "requirements" DROP CONSTRAINT IF EXISTS "requirements_projectId_fkey";
ALTER TABLE "requirements" DROP CONSTRAINT IF EXISTS "requirements_assigneeId_fkey";
DROP INDEX IF EXISTS "requirements_projectId_idx";
DROP INDEX IF EXISTS "requirements_assigneeId_idx";
DROP INDEX IF EXISTS "requirements_type_idx";

ALTER TABLE "requirements"
  DROP COLUMN "description",
  DROP COLUMN "type",
  DROP COLUMN "businessValue",
  DROP COLUMN "complexity",
  DROP COLUMN "estimatedDays",
  DROP COLUMN "projectId",
  DROP COLUMN "assigneeId",
  DROP COLUMN "acceptanceCriteria";

DROP TYPE "RequirementType";
```

- [ ] **Step 2：更新 Prisma 枚举与 Requirement 模型**

把需求枚举改为：

```prisma
enum RequirementStatus {
  PENDING_REVIEW
  UNDER_REVIEW
  REVIEWED
  REJECTED
  SCHEDULED
  COMPLETED
}

enum RequirementSource {
  PRODUCT_PLANNING
  CUSTOMER_FEEDBACK
  INTERNAL_REQUEST
  MARKET_REQUEST
}
```

将 `Requirement` 收缩为：

```prisma
model Requirement {
  id                String            @id @default(cuid())
  sequenceNo        Int               @unique @default(autoincrement())
  title             String
  status            RequirementStatus @default(PENDING_REVIEW)
  source            RequirementSource
  priority          Priority          @default(MEDIUM)
  productLineTeamId String?
  proposer          String?
  proposedAt        DateTime?
  reviewedAt        DateTime?
  createdById       String
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  createdBy       User             @relation("RequirementCreator", fields: [createdById], references: [id])
  productLineTeam ProductLineTeam? @relation(fields: [productLineTeamId], references: [id], onDelete: SetNull)
  planItems       PlanItem[]
  tasks           Task[]
  comments        Comment[]

  @@index([status])
  @@index([priority])
  @@index([source])
  @@index([productLineTeamId])
  @@index([createdById])
  @@map("requirements")
}
```

从 `User` 移除 `assignedRequirements`，保留 `createdRequirements`；从 `Project` 移除 `requirements`。

- [ ] **Step 3：验证 Prisma 模型**

Run: `npx prisma format && npx prisma validate`

Expected: schema formatted；`The schema at prisma/schema.prisma is valid`。

- [ ] **Step 4：生成客户端并确认契约仍处于部分 RED**

Run: `npm run db:generate && npm run assert:requirements`

Expected: Prisma Client 生成成功；断言继续因校验、动作和页面未更新而失败，但不再报告 schema 旧字段。

- [ ] **Step 5：提交模型和迁移**

```powershell
git add prisma/schema.prisma prisma/migrations/20260713_simplify_requirement_pool/migration.sql
git commit -m "refactor: simplify requirement data model"
```

## Task 3：建立展示映射与输入校验

**Files:**
- Create: `src/lib/requirements/presentation.ts`
- Modify: `src/lib/validations/requirements.ts`

- [ ] **Step 1：创建集中展示映射**

```ts
import { Priority, RequirementSource, RequirementStatus } from "@prisma/client";

export const formatRequirementNo = (sequenceNo: number) => `XQ${String(sequenceNo).padStart(4, "0")}`;

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

export const requirementPriorityLabels: Pick<Record<Priority, string>, "HIGH" | "MEDIUM" | "LOW"> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};
```

- [ ] **Step 2：重写 Zod 输入校验**

```ts
import { z } from "zod";
import { Priority, RequirementSource, RequirementStatus } from "@prisma/client";

const requirementPrioritySchema = z.enum([Priority.HIGH, Priority.MEDIUM, Priority.LOW]);

export const requirementSchema = z
  .object({
    title: z.string().min(2, "需求名称至少2个字符").max(100, "需求名称最多100个字符").trim(),
    status: z.nativeEnum(RequirementStatus).default(RequirementStatus.PENDING_REVIEW),
    source: z.nativeEnum(RequirementSource),
    priority: requirementPrioritySchema.default(Priority.MEDIUM),
    productLineTeamId: z.string().optional().nullable(),
    proposer: z.string().max(100, "客户名称或需求方最多100个字符").trim().optional().nullable(),
    proposedAt: z.string().or(z.date()).optional().nullable(),
    reviewedAt: z.string().or(z.date()).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.status === RequirementStatus.REVIEWED && !value.reviewedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reviewedAt"],
        message: "状态为已评审时必须选择评审通过时间",
      });
    }
  });

export type RequirementInput = z.input<typeof requirementSchema>;
```

- [ ] **Step 3：运行契约测试确认继续按预期失败**

Run: `npm run assert:requirements`

Expected: schema、presentation、validation 相关断言通过；动作和页面断言仍失败。

- [ ] **Step 4：提交展示和校验层**

```powershell
git add src/lib/requirements/presentation.ts src/lib/validations/requirements.ts
git commit -m "feat: validate simplified requirement fields"
```

## Task 4：收缩需求 Server Actions

**Files:**
- Modify: `src/actions/requirements.ts`

- [ ] **Step 1：精简过滤类型和查询条件**

`getRequirements` 只接受：

```ts
export type RequirementFilters = {
  status?: RequirementStatus;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  productLineTeamId?: string;
  search?: string;
};
```

关键字条件改为：

```ts
if (search?.trim()) {
  const normalized = search.trim();
  const sequence = /^XQ(\d+)$/i.exec(normalized)?.[1];
  where.OR = [
    { title: { contains: normalized, mode: "insensitive" } },
    { proposer: { contains: normalized, mode: "insensitive" } },
    ...(sequence ? [{ sequenceNo: Number(sequence) }] : []),
  ];
}
```

默认查询使用 `orderBy: { createdAt: "desc" }`，只 include `createdBy`、`productLineTeam` 以及详情真正需要的 `planItems`、`tasks`。

- [ ] **Step 2：精简创建和更新写入**

创建数据必须只包含：

```ts
data: {
  title: data.title,
  status: data.status,
  source: data.source,
  priority: data.priority,
  productLineTeamId: data.productLineTeamId || null,
  proposer: data.proposer || null,
  proposedAt: data.proposedAt ? new Date(data.proposedAt) : null,
  reviewedAt: data.reviewedAt ? new Date(data.reviewedAt) : null,
  createdById: session.user.id,
}
```

更新使用相同业务字段，但不得写 `sequenceNo`、`createdById` 或 `createdAt`。

- [ ] **Step 3：把状态直接切换纳入需求更新动作**

删除 `changeRequirementStatus`。`updateRequirement` 使用完整 `requirementSchema` 校验状态与人工日期，在同一次更新中写入二者。更新前读取原需求并校验当前用户是创建者或管理员；状态变化后沿用现有通知类型向创建人发送通知。不得根据状态自动生成、覆盖或清空日期，写入值只能来自本次表单 payload。

- [ ] **Step 4：删除不再使用的列表动作**

删除 `getAssignees` 和 `getProjectsList`；保留鉴权、权限检查、通知、评论以及 `revalidatePath("/requirements")`、`revalidatePath(`/requirements/${id}`)`。

- [ ] **Step 5：运行类型检查前置验证**

Run: `npx tsc --noEmit`

Expected: 此时页面仍引用旧动作和旧字段，因此允许出现针对需求页面的编译错误；记录错误清单，确认没有迁移或 Prisma 类型生成错误。

- [ ] **Step 6：提交动作层**

```powershell
git add src/actions/requirements.ts
git commit -m "refactor: simplify requirement actions"
```

## Task 5：重做新建和编辑表单

**Files:**
- Modify: `src/components/requirements/requirement-form.tsx`
- Modify: `src/app/(dashboard)/requirements/new/page.tsx`
- Modify: `src/app/(dashboard)/requirements/[requirementId]/edit/page.tsx`
- Delete: `src/components/requirements/status-flow.tsx`

- [ ] **Step 1：把表单 props 收缩为产品线和精简初始值**

```ts
interface RequirementFormProps {
  productLineTeams: { id: string; name: string }[];
  initialData?: {
    id: string;
    sequenceNo: number;
    title: string;
    status: RequirementStatus;
    source: RequirementSource;
    priority: Priority;
    productLineTeamId: string | null;
    proposer: string | null;
    proposedAt: Date | null;
    reviewedAt: Date | null;
    createdAt: Date;
    createdBy: { name: string };
  };
  currentUserName: string;
}
```

- [ ] **Step 2：只保留确认后的控件**

表单依次渲染：只读需求编号、状态、需求名称、产品线、优先级、来源、需求方、提出时间、只读创建人、只读创建时间、人工评审通过时间。状态选择包含六个枚举值；优先级只包含高、中、低；来源只包含四个值。

提交前执行：

```ts
if (status === RequirementStatus.REVIEWED && !reviewedAt) {
  setError("请选择评审通过时间");
  return;
}
```

payload 只包含 `RequirementInput` 的八个可写字段。

- [ ] **Step 3：精简新建页面加载**

新建页只并行读取会话和产品线；不再调用用户/项目列表。文案改为“登记、评审并跟踪需求；需求可独立存在，关联均为可选”。

- [ ] **Step 4：精简编辑页面初始值**

编辑页只传入 Task 5 Step 1 定义的初始值。继续执行创建者或管理员权限判断，不把用户可编辑字段写入隐藏 input。

- [ ] **Step 5：删除顺序状态流组件**

删除 `status-flow.tsx` 及所有引用。状态改为表单直接选择，不保留旧的下一步按钮逻辑。

- [ ] **Step 6：运行契约和类型检查**

Run: `npm run assert:requirements && npx tsc --noEmit`

Expected: 表单相关断言通过；类型错误只可能剩在列表、详情或 seed。

- [ ] **Step 7：提交表单改造**

```powershell
git add src/components/requirements/requirement-form.tsx src/app/(dashboard)/requirements/new/page.tsx src/app/(dashboard)/requirements/[requirementId]/edit/page.tsx src/components/requirements/status-flow.tsx
git commit -m "refactor: simplify requirement form"
```

## Task 6：重做列表与详情页

**Files:**
- Modify: `src/app/(dashboard)/requirements/page.tsx`
- Modify: `src/app/(dashboard)/requirements/[requirementId]/page.tsx`

- [ ] **Step 1：收缩列表筛选**

`searchParams` 只保留：

```ts
status?: string;
priority?: string;
productLineTeamId?: string;
search?: string;
```

筛选条渲染关键字、产品线、状态、优先级和按钮；删除负责人、类型及旧来源筛选。

- [ ] **Step 2：按确认顺序重写 12 列**

使用 `formatRequirementNo` 和集中标签映射；空值统一显示 `—`。日期按 `yyyy-MM-dd`，创建时间按 `yyyy-MM-dd HH:mm`。空状态行使用 `colSpan={12}`。

- [ ] **Step 3：重写详情页属性卡片**

详情页只显示 11 个业务字段。保留创建者/管理员的编辑入口和评论区。计划、任务关联仅在数组非空时显示；空数组不渲染对应面板。删除描述、验收标准、项目、负责人、工期、价值/复杂度和 `StatusFlow`。

- [ ] **Step 4：运行需求池契约到 GREEN**

Run: `npm run assert:requirements`

Expected: `需求池精简契约检查通过`，列表表头断言通过。

- [ ] **Step 5：运行类型检查**

Run: `npx tsc --noEmit`

Expected: 需求池页面无旧字段或旧枚举类型错误；若 seed 仍失败，错误必须只来自下一任务计划修改的字段。

- [ ] **Step 6：提交页面改造**

```powershell
git add src/app/(dashboard)/requirements/page.tsx src/app/(dashboard)/requirements/[requirementId]/page.tsx
git commit -m "refactor: simplify requirement views"
```

## Task 7：更新种子数据并执行数据库迁移

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1：精简 seed 的需求写入**

移除 `RequirementType` 导入和所有已删除字段。两条示例需求分别使用新来源、新状态及人工日期：

```ts
status: RequirementStatus.REVIEWED,
source: RequirementSource.PRODUCT_PLANNING,
priority: Priority.HIGH,
reviewedAt: new Date("2026-07-01"),
```

```ts
status: RequirementStatus.SCHEDULED,
source: RequirementSource.INTERNAL_REQUEST,
priority: Priority.MEDIUM,
reviewedAt: null,
```

- [ ] **Step 2：迁移前记录保护性计数**

Run:

```powershell
@'
SELECT COUNT(*) AS requirement_count FROM "requirements";
SELECT COUNT(*) AS plan_links FROM "plan_items" WHERE "requirementId" IS NOT NULL;
SELECT COUNT(*) AS task_links FROM "tasks" WHERE "requirementId" IS NOT NULL;
'@ | npx prisma db execute --stdin
```

记录三项结果；不得在未取得计数的情况下继续。

- [ ] **Step 3：应用迁移并生成客户端**

Run: `npx prisma migrate deploy && npm run db:generate`

Expected: `20260713_simplify_requirement_pool` 迁移成功，数据库与 schema 一致，Prisma Client 生成成功。若迁移检测到其他未部署迁移，先核对迁移顺序；不得改用 `db push --accept-data-loss` 绕过迁移脚本。

- [ ] **Step 4：迁移后验证数量和关联**

重复 Step 2 的三条计数，并确认三项均与迁移前相等；再验证：

```sql
SELECT COUNT(*) FROM "requirements" WHERE "sequenceNo" IS NULL;
SELECT COUNT(*) FROM "requirements" WHERE "sequenceNo" <> FLOOR("sequenceNo");
SELECT COUNT(*) FROM "requirements" WHERE "status" = 'REVIEWED' AND "reviewedAt" IS NULL;
```

前两项必须为 0；第三项允许存在历史迁移例外，但记录数量并在交付说明中披露。

- [ ] **Step 5：提交 seed 更新**

```powershell
git add prisma/seed.ts
git commit -m "chore: update requirement seed data"
```

## Task 8：全量验证与运行时冒烟

**Files:**
- No production file changes expected

- [ ] **Step 1：运行静态和模型验证**

Run:

```powershell
npx prisma validate
npm run assert:requirements
npx tsc --noEmit
npm run lint
```

Expected: 所有命令退出码 0。lint 若存在与本次无关的历史错误，必须单独列出文件和规则；不得把历史错误描述为本次通过。

- [ ] **Step 2：运行生产构建**

Run: `npm run build`

Expected: Next.js 16.2.10 构建成功，无需求池旧字段类型错误。

- [ ] **Step 3：重启开发服务**

停止当前 AI2PmP 开发进程后执行 `npm run dev`，等待日志出现 `Ready in ...`。不要用固定睡眠替代 Ready 条件检查。

- [ ] **Step 4：冒烟测试需求池路由**

Run:

```powershell
Invoke-WebRequest http://localhost:3000/requirements -UseBasicParsing
Invoke-WebRequest http://localhost:3000/requirements/new -UseBasicParsing
```

Expected: 已登录会话下页面返回 200；未登录环境允许跳转登录页，但不得返回 500。

- [ ] **Step 5：人工验证关键行为**

1. 新建不选产品线的待评审需求并保存。
2. 确认编号格式为 `XQ` 加至少四位数字。
3. 编辑为已评审但不填日期，确认被拒绝。
4. 填写人工日期并保存成功。
5. 直接切换为已完成并保存成功。
6. 用编号、名称和需求方分别搜索到该记录。
7. 验证详情页只显示精简字段；没有计划/任务关联时不显示空关联面板。

- [ ] **Step 6：检查工作区范围并提交验证修正**

Run: `git status --short && git diff --check`

只提交本计划涉及的文件；不得覆盖或带入工作区中既有的计划、产品线或产品目录改动。若验证过程中无需修正，不创建空提交。
