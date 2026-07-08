# Username Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace enterprise-email login with username login for team members and update the current admin account to use `admin`.

**Architecture:** Add `User.username` as the unique login identifier while keeping `email` nullable for compatibility with NextAuth and existing display code. Update authentication, team member creation/editing, registration, seed data, and visible user labels to use username.

**Tech Stack:** Next.js 16 App Router, Auth.js credentials provider, Prisma 7, PostgreSQL, Zod, React client components.

---

### Task 1: Regression Guard

**Files:**
- Create: `scripts/assert-username-login-flow.mjs`

- [ ] Write a script that verifies schema, auth, validation, and UI use `username` instead of required login `email`.
- [ ] Run it before implementation and confirm it fails because the current code still uses email.
- [ ] Run it after implementation and confirm it passes.

### Task 2: Data Model And Auth

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/auth.ts`
- Modify: `src/types/next-auth.d.ts`
- Modify: `prisma/seed.ts`

- [ ] Add `username String @unique` to `User`.
- [ ] Change `email` to nullable compatibility metadata.
- [ ] Change credentials provider from `email` to `username`.
- [ ] Return username on the session user.
- [ ] Update seed users to set username values and admin username `admin`.

### Task 3: Team And Auth UI

**Files:**
- Modify: `src/lib/validations/team.ts`
- Modify: `src/actions/team.ts`
- Modify: `src/components/team/member-modal.tsx`
- Modify: `src/components/team/team-client.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify user display sites that show login identity.

- [ ] Validate username with a conservative login-name rule.
- [ ] Create and edit users by username uniqueness.
- [ ] Replace email labels/placeholders/icons where they represent login accounts.
- [ ] Keep optional email out of the primary workflow.

### Task 4: Database Update

**Files:**
- Database: `public.users`

- [ ] Push Prisma schema changes.
- [ ] Update existing admin row to `username = 'admin'` and `email = null`.
- [ ] Regenerate Prisma client.

### Task 5: Verification

**Commands:**
- `node scripts/assert-username-login-flow.mjs`
- `npx prisma validate`
- `Invoke-WebRequest http://localhost:3000/login`
- `Invoke-WebRequest http://localhost:3000/team`

- [ ] Report lint separately if existing unrelated lint debt remains.
- [ ] No Git commit: this directory is not a Git repository.
