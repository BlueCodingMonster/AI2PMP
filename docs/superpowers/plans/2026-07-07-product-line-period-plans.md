# Product-Line Period Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add product-line-owned annual, half-year, quarterly, and monthly plans with optional related-plan links and optional requirement-backed plan items.

**Architecture:** Extend the existing Prisma `Plan` model and reuse the current Server Actions pattern in `src/actions/plans.ts`. Keep interactive plan editing in the existing client components while server pages fetch product lines and plan options.

**Tech Stack:** Next.js 16 App Router, React 19, Server Actions, Prisma 7, Zod, Node assertion scripts.

---

### Task 1: Assertion Coverage

**Files:**
- Create: `scripts/assert-product-line-period-plans.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing assertion script**

Create `scripts/assert-product-line-period-plans.mjs` that reads the schema, validation, actions, and plan components, then fails until product-line period plan support is implemented.

- [ ] **Step 2: Run the assertion and verify RED**

Run: `node scripts/assert-product-line-period-plans.mjs`

Expected: FAIL with messages for missing `HALF_YEAR`, `halfYear`, required `productLineTeamId`, product-line relation, and half-year UI.

### Task 2: Data Model And Validation

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/validations/plans.ts`

- [ ] **Step 1: Add Prisma fields**

Add `HALF_YEAR` to `PlanType`, add `halfYear Int?` and required `productLineTeamId String` to `Plan`, add the relation to `ProductLineTeam`, and add `plans Plan[]` to `ProductLineTeam`.

- [ ] **Step 2: Add validation**

Update `planSchema` so `productLineTeamId` is required, `halfYear` is optional nullable with values 1-2, and existing period fields remain type-specific optional inputs.

### Task 3: Server Actions

**Files:**
- Modify: `src/actions/plans.ts`

- [ ] **Step 1: Query product line metadata**

Include `productLineTeam` in plan list/detail queries and expose a `getPlanProductLineOptions` action for the form.

- [ ] **Step 2: Persist new fields**

Persist `productLineTeamId` and `halfYear` in create/update actions.

- [ ] **Step 3: Relax related plan options**

Update `getParentPlanOptions` to accept product line and return same-product-line, same-year larger-period candidates, while keeping the relationship optional.

### Task 4: Plan UI

**Files:**
- Modify: `src/components/plans/plan-form.tsx`
- Modify: `src/app/(dashboard)/plans/page.tsx`
- Modify: `src/app/(dashboard)/plans/new/page.tsx`
- Modify: `src/app/(dashboard)/plans/[planId]/edit/page.tsx`
- Modify: `src/app/(dashboard)/plans/[planId]/page.tsx`
- Modify: `src/components/plans/plan-details-client.tsx`

- [ ] **Step 1: Form controls**

Add product line selection, half-year type/field, optional related-plan copy, and auto date presets for half-year periods.

- [ ] **Step 2: List and detail display**

Add half-year tabs/counts and display product line and half-year period labels in plan cards and detail headers.

### Task 5: Verification

**Files:**
- No production files.

- [ ] **Step 1: Run targeted assertion**

Run: `node scripts/assert-product-line-period-plans.mjs`

Expected: PASS.

- [ ] **Step 2: Run TypeScript/build checks**

Run: `npm run build`

Expected: Either PASS, or report concrete existing blockers if the repository has unrelated compile failures.
