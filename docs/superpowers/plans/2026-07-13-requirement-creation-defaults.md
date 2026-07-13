# 需求创建默认值实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为需求增加可选内容简述、必填且可编辑的创建时间，并在用户仅属于一个固定产品线小组时默认该小组。

**Architecture:** Prisma 负责持久化 `summary` 和显式传入的 `createdAt`；Zod 在服务端动作入口校验日期时间；新建 Server Component 根据会话用户查询固定小组数量并把唯一值传给客户端表单。编辑页只回显已有值，不重新计算默认产品线。

**Tech Stack:** Next.js 16 App Router、React、TypeScript、Prisma、PostgreSQL、Zod、Node 契约断言

---

### Task 1: 用契约测试固定新增行为

**Files:**
- Modify: `scripts/assert-requirement-pool-simplification.mjs`

- [ ] **Step 1: 写失败断言**

在契约脚本中断言 Requirement 包含 `summary`，校验层包含必填 `createdAt`，动作层创建和更新均写入 `createdAt`，新建页查询 `productLineMemberships` 并只在长度等于 1 时传入默认小组。

- [ ] **Step 2: 运行测试确认 RED**

Run: `npm run assert:requirements`

Expected: FAIL，分别报告缺少 `summary`、创建时间校验和产品线默认逻辑。

- [ ] **Step 3: 提交测试契约**

Run: `git add scripts/assert-requirement-pool-simplification.mjs && git commit -m "test: define requirement creation defaults"`

### Task 2: 扩展数据模型和校验

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260713170000_add_requirement_summary/migration.sql`
- Modify: `src/lib/validations/requirements.ts`

- [ ] **Step 1: 新增可空文本列**

在 `Requirement` 中加入 `summary String? @db.Text`，迁移执行：

```sql
ALTER TABLE "requirements" ADD COLUMN "summary" TEXT;
```

- [ ] **Step 2: 校验创建时间**

在 `requirementSchema` 增加必填 `createdAt`，使用日期解析检查拒绝空值和无效日期；`summary` 允许空值并限制合理长度。

- [ ] **Step 3: 生成客户端并验证 schema**

Run: `npx prisma validate && npm run db:generate`

Expected: schema valid，Prisma Client 生成成功。

### Task 3: 更新保存逻辑与产品线默认值

**Files:**
- Modify: `src/actions/requirements.ts`
- Modify: `src/app/(dashboard)/requirements/new/page.tsx`

- [ ] **Step 1: 保存新增字段**

创建与更新动作都把 `summary` 规范化为空值或文本，并将校验后的 `createdAt` 转为 `Date` 写入数据库。

- [ ] **Step 2: 计算唯一产品线默认值**

新建页通过会话用户查询 `productLineMemberships`；只有查询结果长度严格等于 1 时才把该 `teamId` 作为 `defaultProductLineTeamId` 传给表单。

- [ ] **Step 3: 保持可选关系**

不在保存动作中强行补产品线；最终值始终以表单提交值为准，因此用户可以切换或清空。

### Task 4: 更新表单与详情页

**Files:**
- Modify: `src/components/requirements/requirement-form.tsx`
- Modify: `src/app/(dashboard)/requirements/[requirementId]/edit/page.tsx`
- Modify: `src/app/(dashboard)/requirements/[requirementId]/page.tsx`

- [ ] **Step 1: 增加内容简述**

新增可选多行文本框，并在编辑页回显，在详情页以保留换行的方式展示。

- [ ] **Step 2: 创建时间可编辑且必填**

使用 `datetime-local` 控件；新建时初始化为浏览器当前本地时间，编辑时把数据库时间格式化为控件值，提交时阻止空值。

- [ ] **Step 3: 应用默认产品线**

仅在无 `initialData` 的新建模式下，以 `defaultProductLineTeamId` 初始化选择框；编辑模式仍使用已有需求值。

### Task 5: 迁移与验证

**Files:**
- Verify: `prisma/migrations/20260713170000_add_requirement_summary/migration.sql`

- [ ] **Step 1: 确认 GREEN**

Run: `npm run assert:requirements`

Expected: `需求池精简契约检查通过`。

- [ ] **Step 2: 执行数据库迁移**

Run: `npx prisma migrate deploy`

Expected: 新迁移成功应用，现有需求记录保持不变。

- [ ] **Step 3: 静态验证**

Run: `npx tsc --noEmit`，再对需求相关目标文件运行 ESLint。

Expected: 两者退出码均为 0。

- [ ] **Step 4: 生产构建与运行态检查**

Run: `npm run build`，重启开发服务后检查 `/requirements/new` 和需求编辑、详情路由。

Expected: 构建成功；路由正常响应或在未登录状态返回预期鉴权跳转。
