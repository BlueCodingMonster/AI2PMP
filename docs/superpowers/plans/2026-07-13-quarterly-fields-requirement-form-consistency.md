# Quarterly Fields and Requirement Form Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make quarterly achievement fields optional and render requirement create, view, and edit with one shared form layout.

**Architecture:** Extend the existing source-contract script to lock the requested behavior. Add a read-only mode to `RequirementForm`, then replace the detail page's duplicate field layout with that component while retaining tasks and comments below it.

**Tech Stack:** Next.js 16 Server Components and Server Actions, React, TypeScript, Zod, Prisma.

---

### Task 1: Add failing source contracts

**Files:**
- Modify: `scripts/assert-quarterly-monthly-plans.mjs`
- Modify: `scripts/assert-requirement-pool-simplification.mjs`

- [ ] Add assertions that quarterly publish validation does not require `quarterlyStatus`, the two table headers lack `*`, and the requirement detail page renders `RequirementForm` with `mode="view"`.
- [ ] Run `npm run assert:plans` and `npm run assert:requirements`; expect both new assertions to fail for the missing behavior.

### Task 2: Make quarterly fields optional

**Files:**
- Modify: `src/lib/validations/quarterly-plans.ts`
- Modify: `src/components/plans/quarterly-plan-form.tsx`

- [ ] Remove `quarterlyStatus` from publish-required fields.
- [ ] Change the two headers to `达成率` and `季度状态` while retaining their controls and defaults.
- [ ] Run `npm run assert:plans`; expect PASS.

### Task 3: Unify requirement form modes

**Files:**
- Modify: `src/components/requirements/requirement-form.tsx`
- Modify: `src/app/(dashboard)/requirements/[requirementId]/page.tsx`

- [ ] Add `mode?: "create" | "edit" | "view"`, derive view state from the mode, disable all controls in view mode, and replace submit/cancel controls with the authorized edit link.
- [ ] Replace the detail page's separate summary and field cards with `RequirementForm mode="view"` using the same initial-data mapping as edit.
- [ ] Keep optional task associations and comments below the shared read-only form.
- [ ] Run `npm run assert:requirements`; expect PASS.

### Task 4: Verify and restart

**Files:**
- No source changes expected.

- [ ] Run `npm run assert:plans`, `npm run assert:requirements`, `npx tsc --noEmit`, targeted ESLint, `npm run build`, and `git diff --check`; expect exit code 0.
- [ ] Restart the workspace dev process, request `/login` and `/requirements`, and confirm there is no compile error in the current dev log.
