# 季度与月度计划模块重建实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除现有通用计划体系，建立互不关联的季度里程碑计划和月度项目经营计划两套专用模块。

**Architecture:** 使用 `QuarterlyPlan` 聚合季度目标与季度风险，使用 `MonthlyPlan` 聚合八类月度经营明细；两类聚合只关联产品线小组及制定/修改用户。Server Actions 负责鉴权、周期唯一性、草稿宽松保存和发布完整校验，React 客户端表格负责行内编辑与排序。

**Tech Stack:** Next.js 16 App Router、React、TypeScript、Prisma 7、PostgreSQL、Zod、Tailwind CSS、Node 契约断言

---

## 执行前约束

- 当前分支为 `codex/requirement-pool-simplification`，工作区包含用户原有未提交修改；不得执行 `git reset --hard`、`git checkout --` 或整体覆盖文件。
- 修改 Next.js 页面和 Server Actions 前，先读取 `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` 与 `node_modules/next/dist/docs/01-app/02-guides/forms.md`。
- 数据库迁移会删除 `plans`、`plan_items`、`plan_item_stages` 及其全部数据，执行前必须再次输出旧表记录数作为操作证据。
- 各任务提交时只暂存本任务确认过的文件；对 `prisma/schema.prisma`、`src/actions/product-lines.ts`、`src/actions/requirements.ts` 等混合改动文件必须先检查差异，禁止把无关修改误提交。

## 文件结构

新建文件：

- `scripts/assert-quarterly-monthly-plans.mjs`：新模块契约检查。
- `src/lib/plans/dictionaries.ts`：季度目标域、目标状态、风险等级、风险状态、资源类型的唯一展示映射。
- `src/lib/plans/permissions.ts`：产品线组长和管理员权限查询。
- `src/lib/validations/quarterly-plans.ts`：季度草稿与发布校验。
- `src/lib/validations/monthly-plans.ts`：月度八板块草稿与发布校验。
- `src/actions/quarterly-plans.ts`：季度列表、详情、创建、更新、发布、退回、删除。
- `src/actions/monthly-plans.ts`：月度列表、详情、创建、更新、发布、退回、删除。
- `src/components/plans/plan-list-client.tsx`：双页签统一列表。
- `src/components/plans/quarterly-plan-form.tsx`：季度目标及风险行内表格。
- `src/components/plans/quarterly-plan-detail.tsx`：季度只读详情。
- `src/components/plans/monthly-plan-form.tsx`：月度八板块行内表格。
- `src/components/plans/monthly-plan-detail.tsx`：月度只读详情。
- `src/app/(dashboard)/plans/quarterly/new/page.tsx`
- `src/app/(dashboard)/plans/quarterly/[planId]/page.tsx`
- `src/app/(dashboard)/plans/quarterly/[planId]/edit/page.tsx`
- `src/app/(dashboard)/plans/monthly/new/page.tsx`
- `src/app/(dashboard)/plans/monthly/[planId]/page.tsx`
- `src/app/(dashboard)/plans/monthly/[planId]/edit/page.tsx`
- `prisma/migrations/20260713190000_rebuild_quarterly_monthly_plans/migration.sql`

删除文件：

- `src/actions/plans.ts`
- `src/lib/validations/plans.ts`
- `src/lib/plans/workflow-templates.ts`
- `src/components/plans/plan-form.tsx`
- `src/components/plans/plan-details-client.tsx`
- `src/components/plans/plan-item-modal.tsx`
- `src/components/plans/plan-overview-client.tsx`
- `src/components/plans/unplanned-work-client.tsx`
- `src/app/(dashboard)/plans/new/page.tsx`
- `src/app/(dashboard)/plans/[planId]/page.tsx`
- `src/app/(dashboard)/plans/[planId]/edit/page.tsx`
- `src/app/(dashboard)/plans/overview/page.tsx`
- `src/app/(dashboard)/plans/unplanned/page.tsx`
- `scripts/import-five-q3-plans.ts`
- `scripts/assert-product-line-period-plans.mjs`
- `scripts/assert-product-version-plan-link.mjs`

### Task 1: 建立新计划模块契约

**Files:**
- Create: `scripts/assert-quarterly-monthly-plans.mjs`
- Modify: `package.json`

- [ ] **Step 1: 写失败契约**

创建脚本读取 Prisma、校验、动作、页面和导航文件，至少断言：

```js
const requiredModels = [
  "QuarterlyPlan", "QuarterlyGoal", "QuarterlyRisk", "MonthlyPlan",
  "MonthlyProductDelivery", "MonthlyProjectDelivery", "MonthlyMarketAction",
  "MonthlyCostOptimization", "MonthlyAiProductEnablement", "MonthlyAiEfficiency",
  "MonthlyRisk", "MonthlyResourceRequest",
];
const removedModels = ["model Plan ", "model PlanItem ", "model PlanItemStage "];
const requiredRoutes = [
  "plans/quarterly/new", "plans/quarterly/[planId]",
  "plans/monthly/new", "plans/monthly/[planId]",
];
```

脚本还要检查旧导航“计划总览”“计划外工作”和旧枚举 `PlanType`、`PlanItemStatus` 不再存在；季度和月度模型互不包含对方 ID。

- [ ] **Step 2: 注册命令**

在 `package.json` 增加：

```json
"assert:plans": "node scripts/assert-quarterly-monthly-plans.mjs"
```

- [ ] **Step 3: 运行并确认 RED**

Run: `npm run assert:plans`

Expected: FAIL，报告缺少新模型、动作和页面，并报告旧通用模型仍存在。

- [ ] **Step 4: 提交测试契约**

Run: `git add package.json scripts/assert-quarterly-monthly-plans.mjs && git commit -m "test: define quarterly and monthly plan contract"`

### Task 2: 用专用 Prisma 聚合替换旧模型

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260713190000_rebuild_quarterly_monthly_plans/migration.sql`

- [ ] **Step 1: 增加固定枚举**

在 Prisma 中定义：

```prisma
enum PlanPublicationStatus { DRAFT PUBLISHED }
enum QuarterlyGoalDomain { PRODUCT_ITERATION PRODUCT_DELIVERY PRODUCT_RESEARCH MARKET_SUPPORT OPERATIONS_STABILITY TECHNICAL_INNOVATION AI_ENABLEMENT }
enum PlanTrackingStatus { NOT_STARTED IN_PROGRESS COMPLETED DELAY_RISK DELAYED PAUSED }
enum PlanRiskLevel { HIGH MEDIUM LOW }
enum QuarterlyRiskStatus { NOT_TRIGGERED TRIGGERED HANDLING CLOSED }
enum ResourceRequestType { PEOPLE TECHNOLOGY BUDGET MANAGEMENT_COORDINATION }
```

- [ ] **Step 2: 建立季度聚合**

实现 `QuarterlyPlan`、`QuarterlyGoal`、`QuarterlyRisk`，关键约束为：

```prisma
model QuarterlyPlan {
  id String @id @default(cuid())
  productLineTeamId String
  year Int
  quarter Int
  status PlanPublicationStatus @default(DRAFT)
  createdById String
  updatedById String
  publishedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  goals QuarterlyGoal[]
  risks QuarterlyRisk[]
  productLineTeam ProductLineTeam @relation(fields: [productLineTeamId], references: [id], onDelete: Cascade)
  createdBy User @relation("QuarterlyPlanCreator", fields: [createdById], references: [id])
  updatedBy User @relation("QuarterlyPlanUpdater", fields: [updatedById], references: [id])
  @@unique([productLineTeamId, year, quarter])
  @@map("quarterly_plans")
}
```

`QuarterlyGoal` 包含设计文档中 14 个业务字段与 `sortOrder`；`achievementRate` 使用 `Int @default(0)`。`QuarterlyRisk` 包含风险字段与 `sortOrder`，风险编号由行排序派生展示，不存储可漂移的字符串编号。

- [ ] **Step 3: 建立月度聚合**

实现 `MonthlyPlan` 及八类明细表；每个明细表包含 `id`、`monthlyPlanId`、对应业务字段、`sortOrder`、时间戳，并通过 `onDelete: Cascade` 归属月度计划。计划头约束：

```prisma
@@unique([productLineTeamId, year, month])
```

- [ ] **Step 4: 清除旧关系**

从 `User`、`Requirement`、`Task`、`ProductLineTeam`、`ProductVersion` 删除 `Plan`、`PlanItem`、`PlanItemStage` 关系，增加季度/月度制定人、修改人和产品线关系。不得修改这些模型的非计划字段。

- [ ] **Step 5: 编写破坏性迁移**

迁移按顺序：删除旧外键和旧表；删除旧计划枚举；创建新枚举、2 个计划头表、10 个明细表、唯一约束和索引。迁移不插入或转换旧计划数据。

- [ ] **Step 6: 静态验证**

Run: `npx prisma validate && npm run db:generate`

Expected: Prisma schema valid，客户端生成成功。

### Task 3: 集中数据字典、权限与校验

**Files:**
- Create: `src/lib/plans/dictionaries.ts`
- Create: `src/lib/plans/permissions.ts`
- Create: `src/lib/validations/quarterly-plans.ts`
- Create: `src/lib/validations/monthly-plans.ts`

- [ ] **Step 1: 建立唯一字典映射**

导出类型安全的标签映射，例如：

```ts
export const quarterlyGoalDomainLabels = {
  PRODUCT_ITERATION: "产品迭代",
  PRODUCT_DELIVERY: "产品交付",
  PRODUCT_RESEARCH: "产品调研",
  MARKET_SUPPORT: "市场支持",
  OPERATIONS_STABILITY: "运维稳定",
  TECHNICAL_INNOVATION: "技术创新",
  AI_ENABLEMENT: "AI赋能",
} as const;
```

同文件导出目标状态、风险等级、风险状态、资源需求类型标签；页面禁止重复定义映射。

- [ ] **Step 2: 实现权限查询**

`getPlanAccess(userId, isAdmin)` 返回可管理小组和可查看小组；固定成员 `role === LEADER` 才能管理，管理员可管理全部小组。提供 `assertCanManagePlanTeam(teamId, sessionUser)` 给所有写动作复用。

- [ ] **Step 3: 实现季度校验**

建立 `quarterlyDraftSchema` 和 `quarterlyPublishSchema`。发布 schema 强制至少一条目标、所有目标必填、达成率 `0..100`；风险存在时校验必填字段。草稿 schema 接受空字符串，但年度、季度、产品线必须有效。

- [ ] **Step 4: 实现月度校验**

用八个明确的行 schema 组成 `monthlyDraftSchema` 和 `monthlyPublishSchema`。发布 schema 使用 `superRefine` 确认八板块总行数至少为 1，并逐行定位错误路径，例如 `productDeliveries.0.deliveryContent`。

- [ ] **Step 5: 运行类型检查**

Run: `npx tsc --noEmit`

Expected: 若动作和页面尚未完成，只允许出现由旧计划引用造成的预期错误；记录清单并在 Task 8 清零。

### Task 4: 实现季度计划 Server Actions

**Files:**
- Create: `src/actions/quarterly-plans.ts`

- [ ] **Step 1: 实现只读动作**

实现：

```ts
getQuarterlyPlans(filters)
getQuarterlyPlanById(id)
getQuarterlyPlanFormContext()
```

列表查询返回小组、组长、目标数、风险数、发布时间和修改时间；普通成员只能看所属小组，管理员看全部。

- [ ] **Step 2: 实现草稿写入**

`createQuarterlyPlanDraft(input)` 与 `updateQuarterlyPlanDraft(id, input)` 使用事务写计划头，并按提交数组整体替换目标和风险行；先鉴权，再校验周期唯一性，最后 `revalidatePath("/plans")` 和详情路径。

- [ ] **Step 3: 实现发布和退回**

`publishQuarterlyPlan(id, input)` 使用发布 schema，事务保存完整内容并设置 `status=PUBLISHED`、`publishedAt=now()`。`returnQuarterlyPlanToDraft(id)` 仅管理员可调用，设置草稿但保留 `publishedAt` 作为最后一次发布时间。

- [ ] **Step 4: 实现删除**

`deleteQuarterlyPlan(id)` 只允许草稿，且调用者必须是本组组长或管理员；已发布返回明确错误。

- [ ] **Step 5: 目标 lint**

Run: `npx eslint src/actions/quarterly-plans.ts`

Expected: exit 0。

### Task 5: 实现月度计划 Server Actions

**Files:**
- Create: `src/actions/monthly-plans.ts`

- [ ] **Step 1: 实现只读动作**

实现 `getMonthlyPlans(filters)`、`getMonthlyPlanById(id)`、`getMonthlyPlanFormContext()`；列表统计八板块总数、风险数和资源需求数。

- [ ] **Step 2: 实现八板块事务写入**

创建内部函数 `replaceMonthlySections(tx, monthlyPlanId, input)`，依次删除并重建八类行，统一按数组位置写 `sortOrder`，避免行序号漂移。

- [ ] **Step 3: 实现草稿、发布、退回、删除**

实现与季度相同的权限和状态规则；发布使用 `monthlyPublishSchema`，周期唯一冲突返回“该产品线小组在当前月份已存在计划”。

- [ ] **Step 4: 目标 lint**

Run: `npx eslint src/actions/monthly-plans.ts`

Expected: exit 0。

### Task 6: 替换统一列表和导航

**Files:**
- Rewrite: `src/app/(dashboard)/plans/page.tsx`
- Create: `src/components/plans/plan-list-client.tsx`
- Modify: `src/components/layout/dashboard-layout-client.tsx`

- [ ] **Step 1: 移除旧导航**

导航只保留 `{ label: "计划管理", href: "/plans" }`，删除计划总览和计划外工作入口。

- [ ] **Step 2: 实现双页签列表**

`/plans?tab=quarterly` 和 `/plans?tab=monthly` 使用同一 Server Component 拉取对应数据，客户端组件呈现筛选器、统计列和操作按钮。默认页签为季度。

- [ ] **Step 3: 实现权限化新建按钮**

只有至少管理一个产品线小组的组长或管理员看到新建按钮；普通成员仍能查看有权限的列表。

- [ ] **Step 4: 验证列表契约**

Run: `npm run assert:plans`

Expected: 仍可能因详情表单缺失失败，但导航与列表相关断言通过。

### Task 7: 实现季度表单和详情

**Files:**
- Create: `src/components/plans/quarterly-plan-form.tsx`
- Create: `src/components/plans/quarterly-plan-detail.tsx`
- Create: `src/app/(dashboard)/plans/quarterly/new/page.tsx`
- Create: `src/app/(dashboard)/plans/quarterly/[planId]/page.tsx`
- Create: `src/app/(dashboard)/plans/quarterly/[planId]/edit/page.tsx`

- [ ] **Step 1: 实现计划头部**

年度、季度、产品线小组按权限上下文初始化：仅一个可管理小组时默认；多个时选择；编辑时使用已保存小组。

- [ ] **Step 2: 实现目标表格**

表格列严格使用设计字段；新增行使用 `crypto.randomUUID()` 作为仅前端 key；M1/M2/M3 标题根据季度对应真实月份显示；行移动后更新数组顺序。

- [ ] **Step 3: 实现风险表格**

风险编号按当前数组位置显示 `R${index + 1}`；概率、影响、综合级和状态使用集中字典；删除行后自动重新编号。

- [ ] **Step 4: 实现保存草稿和发布**

两个按钮调用不同动作；服务端错误展示具体板块与行。页面上下均提供返回、草稿、发布按钮。

- [ ] **Step 5: 实现只读详情**

详情沿用目标看板和风险登记布局，不显示编辑控件；按权限展示编辑、退回草稿、删除操作。

- [ ] **Step 6: 目标验证**

Run: `npx eslint src/components/plans/quarterly-plan-form.tsx src/components/plans/quarterly-plan-detail.tsx 'src/app/(dashboard)/plans/quarterly/**/*.tsx'`

Expected: exit 0。

### Task 8: 实现月度八板块表单和详情

**Files:**
- Create: `src/components/plans/monthly-plan-form.tsx`
- Create: `src/components/plans/monthly-plan-detail.tsx`
- Create: `src/app/(dashboard)/plans/monthly/new/page.tsx`
- Create: `src/app/(dashboard)/plans/monthly/[planId]/page.tsx`
- Create: `src/app/(dashboard)/plans/monthly/[planId]/edit/page.tsx`

- [ ] **Step 1: 实现月度头部**

使用 `type="month"` 维护年度月份，并按权限初始化产品线小组；提交时拆为 `year` 和 `month` 数字。

- [ ] **Step 2: 实现五个带完成日期板块**

产品交付、项目交付、市场动作、AI+赋能产品、AI+效能提升使用行内日期控件；客户名称只在项目交付中可空。

- [ ] **Step 3: 实现三个无完成日期板块**

成本优化、项目风险、资源需求按附件字段实现；风险等级、需求类型、紧急程度从集中字典渲染。

- [ ] **Step 4: 实现统一操作**

八板块分别新增、删除、排序；草稿和发布发送完整聚合输入。删除只改变客户端数组，保存时由事务整体替换。

- [ ] **Step 5: 实现详情**

始终展示八个板块，空板块显示“暂无数据”；禁止隐藏空板块或展示旧计划关联。

- [ ] **Step 6: 目标验证**

Run: `npx eslint src/components/plans/monthly-plan-form.tsx src/components/plans/monthly-plan-detail.tsx 'src/app/(dashboard)/plans/monthly/**/*.tsx'`

Expected: exit 0。

### Task 9: 删除旧计划实现并清理跨模块引用

**Files:**
- Delete: 本计划“删除文件”清单中的全部旧文件
- Modify: `src/actions/requirements.ts`
- Modify: `src/app/(dashboard)/requirements/[requirementId]/page.tsx`
- Modify: `src/actions/product-lines.ts`
- Modify: `src/components/product-lines/product-versions-manager.tsx`
- Modify: `src/components/product-catalog/product-catalog-client.tsx`
- Modify: `prisma/seed.ts`

- [ ] **Step 1: 删除旧页面、动作和组件**

使用 `apply_patch` 删除清单文件，禁止保留不可达的旧代码。

- [ ] **Step 2: 清理需求引用**

需求详情查询和页面删除 `planItems` include 与“关联计划”区块，保留任务关联和评论。

- [ ] **Step 3: 清理产品线和版本引用**

删除产品版本的 `planItems` 计数、展示文字及相关查询；保留产品平台、模块、版本维护功能。

- [ ] **Step 4: 重写种子数据**

从 `prisma/seed.ts` 删除旧计划枚举 import、旧计划删除和旧计划创建，仅保留用户、产品线、需求、项目、任务及其他非计划种子。

- [ ] **Step 5: 清理类型错误**

Run: `npx tsc --noEmit`

Expected: exit 0，无 `Plan`、`PlanItem` 或旧计划枚举引用。

- [ ] **Step 6: 全契约 GREEN**

Run: `npm run assert:plans`

Expected: `季度与月度计划模块契约检查通过`。

### Task 10: 执行破坏性迁移并验证数据边界

**Files:**
- Verify: `prisma/migrations/20260713190000_rebuild_quarterly_monthly_plans/migration.sql`

- [ ] **Step 1: 记录删除前计数**

用只读 SQL 或 Prisma 查询输出 `plans`、`plan_items`、`plan_item_stages` 数量，并同时记录 requirements、projects、tasks、product_versions 数量。

- [ ] **Step 2: 执行迁移**

Run: `npx prisma migrate deploy && npm run db:generate`

Expected: 新迁移成功应用，迁移状态为最新。

- [ ] **Step 3: 验证非计划数据未删除**

再次查询 requirements、projects、tasks、product_versions 数量，与 Step 1 相等；确认新计划表初始为空。

- [ ] **Step 4: 验证唯一约束和权限**

通过动作级测试或受控数据库测试确认同一小组同一周期重复创建失败，普通成员写入失败，组长和管理员写入成功；测试数据在验证后删除。

### Task 11: 最终静态、构建和运行态验证

**Files:**
- Verify: all changed files

- [ ] **Step 1: 运行完整目标验证**

Run:

```powershell
npm run assert:requirements
npm run assert:plans
npx prisma validate
npx prisma migrate status
npx tsc --noEmit
```

Expected: 全部 exit 0，数据库 schema up to date。

- [ ] **Step 2: 运行目标 lint**

对新计划动作、校验、组件、路由和本次清理的跨模块文件运行 ESLint；不得用全项目历史 lint 错误掩盖目标文件问题。

- [ ] **Step 3: 生产构建**

Run: `npm run build`

Expected: Next.js 构建成功；只允许记录项目现有的 `middleware` 命名弃用提醒。

- [ ] **Step 4: 重启服务**

安全停止当前工作区 3000 端口的 Next.js 进程，重新以隐藏窗口启动 `npm run dev`，等待日志出现 `Ready`。

- [ ] **Step 5: 路由烟雾测试**

检查：

```text
/plans
/plans/quarterly/new
/plans/monthly/new
```

有效登录会话应返回 200；未登录会话应返回预期鉴权跳转。还要确认旧 `/plans/overview`、`/plans/unplanned` 和 `/plans/new` 不再提供旧功能。

- [ ] **Step 6: 差异检查**

Run: `git diff --check && git status --short`

Expected: 无空白错误；明确区分用户原有未提交修改与本次计划模块重构文件。
