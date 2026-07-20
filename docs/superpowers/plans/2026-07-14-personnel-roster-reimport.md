# Personnel Roster Reimport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild team members from the 49-row personnel roster while preserving the admin account and all business records.

**Architecture:** Add nullable personnel classification fields to `User`, expose them through existing team actions and UI, then run an auditable one-time transactional importer with a fixed roster and username mapping verified against the Excel source.

**Tech Stack:** Next.js 16, TypeScript, Prisma 7, PostgreSQL, bcryptjs, artifact-tool for source workbook verification.

---

### Task 1: Add failing personnel contracts

**Files:**
- Create: `scripts/assert-personnel-roster.mjs`
- Modify: `package.json`

- [ ] Check that `User` has `level` and `position`, team validation/actions/UI carry both fields, and the importer contains exactly 49 unique roster entries with the approved department distribution.
- [ ] Run `npm run assert:personnel`; expect failure because fields and importer do not exist.

### Task 2: Add personnel fields and UI

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/validations/team.ts`
- Modify: `src/actions/team.ts`
- Modify: `src/components/team/member-modal.tsx`
- Modify: `src/components/team/team-client.tsx`
- Create: `prisma/migrations/20260714113000_add_user_level_position/migration.sql`

- [ ] Add nullable `level` and `position` columns and migration.
- [ ] Read/write both fields in team schemas and actions.
- [ ] Display and edit both fields in team management.
- [ ] Run Prisma validation, generation, TypeScript, and the personnel contract.

### Task 3: Build and run the transactional importer

**Files:**
- Create: `scripts/import-personnel-roster.ts`
- Modify: `package.json`

- [ ] Define 49 source rows with explicit unique pinyin usernames and validate counts, names, departments, managers, and usernames before writes.
- [ ] In one transaction retain `admin`, clear product-line memberships and secondments, reassign required historical creator/updater links to `admin`, clear optional assignees/memberships for removable users, delete the 3 demo users, and create the 49 roster users with bcrypt password `123456`.
- [ ] Record business and comment counts before import, deploy the migration, execute the importer, and verify all protected counts are unchanged.

### Task 4: Final verification and restart

**Files:**
- No source changes expected.

- [ ] Run personnel, requirement, and plan contracts; Prisma validation/status; TypeScript; targeted ESLint; production build; and `git diff --check`.
- [ ] Query the database to verify 50 users, 49 roster rows, department distribution 32/11/6, and 4 administrators including retained `admin`.
- [ ] Restart the development server and smoke-test `/login` and `/team`.
