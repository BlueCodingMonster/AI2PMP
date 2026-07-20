# Remove Requirement Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the requirement discussion feature and its database linkage without changing task or bug comments.

**Architecture:** Strengthen the requirement source contract, remove requirement-only UI/action/query code, then migrate the shared `comments` table by deleting requirement-linked rows and dropping only `requirementId` artifacts.

**Tech Stack:** Next.js 16, TypeScript, Prisma 7, PostgreSQL.

---

### Task 1: Define the failing contract

**Files:**
- Modify: `scripts/assert-requirement-pool-simplification.mjs`

- [ ] Assert that the requirement detail, action, and schema files contain no requirement-comment symbols while task and bug comment relations remain.
- [ ] Run `npm run assert:requirements`; expect failures for current requirement-comment remnants.

### Task 2: Remove requirement comment code

**Files:**
- Modify: `src/app/(dashboard)/requirements/[requirementId]/page.tsx`
- Modify: `src/actions/requirements.ts`
- Delete: `src/components/requirements/requirement-comments.tsx`

- [ ] Remove the detail component import/render, the `comments` query include, and `addRequirementComment`.
- [ ] Delete the requirement-only comment component.
- [ ] Run `npm run assert:requirements`; schema assertions should remain red while code assertions turn green.

### Task 3: Remove schema relation and migrate data

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260714100000_remove_requirement_comments/migration.sql`

- [ ] Remove `Requirement.comments`, `Comment.requirementId`, its relation, and index while retaining `taskId` and `bugId` comment structures.
- [ ] Create migration SQL that deletes rows with non-null `requirementId`, drops its foreign key and index, then drops the column.
- [ ] Record comment counts, run `npx prisma migrate deploy` and `npm run db:generate`, then verify task and bug comment counts are unchanged.

### Task 4: Verify and restart

**Files:**
- No source changes expected.

- [ ] Run requirement and plan contracts, Prisma validation/status, TypeScript, targeted ESLint, production build, and `git diff --check`; expect exit code 0.
- [ ] Restart the dev server and verify `/login` returns 200 and `/requirements` redirects unauthenticated users without compile errors.
