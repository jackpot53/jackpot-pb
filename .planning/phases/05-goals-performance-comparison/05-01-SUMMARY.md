---
phase: 05-goals-performance-comparison
plan: "01"
subsystem: goals
tags: [goals, crud, server-actions, dashboard, progress-bar, drizzle, react-hook-form]
one_liner: "Goal CRUD lifecycle with Server Actions, Zod validation, dialog UI, and dashboard achievement progress bars"

dependency_graph:
  requires:
    - "01-01: Supabase auth + requireUser() pattern"
    - "01-02: Drizzle DB client and schema (goals table)"
    - "02-01: shadcn dialog pattern, react-hook-form, asset CRUD pattern"
  provides:
    - "createGoal / updateGoal / deleteGoal Server Actions"
    - "listGoals / getGoalById Drizzle queries"
    - "GoalDialog (create/edit), DeleteGoalDialog, GoalListClient components"
    - "/goals page shell (Server Component)"
    - "DashboardGoalsSection with achievement % progress bars"
  affects:
    - "app/(app)/page.tsx — dashboard now includes goals section below performance table"

tech_stack:
  added:
    - "components/ui/progress.tsx — shadcn Progress (base-ui/react)"
    - "components/ui/sonner.tsx — shadcn Sonner toast"
    - "sonner package (added by shadcn)"
  patterns:
    - "Goal Server Actions pattern: requireUser() + Zod safeParse + revalidatePath (no redirect)"
    - "Dialog CRUD pattern: controlled open/onOpenChange with useTransition + sonner error toast"
    - "Dashboard goals section pattern: Server Component fetches goals, passes to pure display component"

key_files:
  created:
    - app/actions/goals.ts
    - db/queries/goals.ts
    - tests/goals/goal-crud.test.ts
    - components/app/goal-dialog.tsx
    - components/app/delete-goal-dialog.tsx
    - components/app/goal-list-client.tsx
    - components/app/dashboard-goals-section.tsx
    - app/(app)/goals/page.tsx
    - components/ui/progress.tsx
    - components/ui/sonner.tsx
  modified:
    - app/(app)/page.tsx
    - app/layout.tsx

decisions:
  - "D-03: Achievement % = Math.round((currentPortfolioTotalKrw / targetAmountKrw) * 100), computed at read time"
  - "D-04: Dashboard goals section hidden entirely (return null) when no goals exist — no empty state message"
  - "Client-side goalFormSchema uses z.string() for targetAmountKrw (not z.coerce.number()) to avoid zodResolver type inference issue; converted to int at submit time"
  - "Goal actions use only revalidatePath() — no redirect() — dialog parent closes on void return"

metrics:
  duration_minutes: 8
  completed_date: "2026-04-13"
  tasks_completed: 3
  tasks_total: 3
  files_created: 10
  files_modified: 2
---

# Phase 05 Plan 01: Goal CRUD — Server Actions, Dialog Components, Dashboard Integration

## Objective

Establish the complete lifecycle for investment goals: database queries, Server Actions with Zod validation and auth, dialog-based create/edit/delete UI, /goals page shell, and the dashboard section that shows per-goal achievement progress bars computed from the current portfolio total.

## Tasks Completed

### Task 1: Server Actions, DB Queries, Test Scaffold, shadcn Install

- Installed `components/ui/progress.tsx` (shadcn Progress via base-ui/react) and `components/ui/sonner.tsx`
- Added `<Toaster position="bottom-right" />` to `app/layout.tsx` (root layout)
- Created `tests/goals/goal-crud.test.ts` with 6 unit tests for `achievementPct()` and `progressBarValue()` — all passing
- Created `db/queries/goals.ts` with `listGoals()` and `getGoalById()` Drizzle queries
- Created `app/actions/goals.ts` with `createGoal`, `updateGoal`, `deleteGoal` Server Actions; each calls `requireUser()`, runs `goalSchema.safeParse()`, and calls `revalidatePath()` on both `/goals` and `/` — no `redirect()` in goal actions

**Commit:** `3fa1602`

### Task 2: Goal CRUD Dialog Components and /goals Page

- Created `components/app/goal-dialog.tsx`: GoalDialog controlled via open/onOpenChange, react-hook-form with zodResolver, useEffect to reset on mode/goal change, sonner toast on error
- Created `components/app/delete-goal-dialog.tsx`: DeleteGoalDialog confirm dialog, useTransition wrapping deleteGoal Server Action
- Created `components/app/goal-list-client.tsx`: GoalListClient manages dialog state (dialogMode, selectedGoal, deleteOpen, goalToDelete), renders goals table with Pencil/Trash2 icon buttons
- Created `app/(app)/goals/page.tsx`: Server Component calling `listGoals()`, renders `<GoalListClient goals={goals} />`
- All Korean copy matches UI-SPEC: 새 목표 추가, 목표 수정, 목표 추가, 변경 저장, 입력 취소, 수정 취소, 목표 삭제

**Commit:** `7ef5d27`

### Task 3: Dashboard Goals Section

- Created `components/app/dashboard-goals-section.tsx`: pure display component, returns `null` when goals empty (D-04), renders per-goal rows with name, target KRW, achievement % label (text-emerald-600 when >= 100%), and Progress bar capped at 100
- Updated `app/(app)/page.tsx`: added `listGoals()` call after portfolio summary, appended `<DashboardGoalsSection goals={goalsList} totalValueKrw={summary.totalValueKrw} />` below the performance table Card

**Commit:** `b1e7cb5`

## Test Results

- `tests/goals/goal-crud.test.ts`: 6/6 passing
- Full suite: 62/62 passing (no regressions)
- TypeScript: clean (`npx tsc --noEmit` exits 0)

## Decisions Made

1. **No redirect in goal actions** — Goal Server Actions call only `revalidatePath('/goals')` and `revalidatePath('/')`. The dialog parent component closes itself when the action returns void (no error). This differs from asset actions which use `redirect()` because they navigate away from the current page.

2. **Client-side schema uses z.string() for targetAmountKrw** — `z.coerce.number()` in zodResolver produces `unknown` as input type due to Zod v4/react-hook-form type inference, causing TypeScript errors. Pattern follows `transaction-form.tsx` which uses string inputs with `.refine()` for validation. Conversion to `parseInt(data.targetAmountKrw, 10)` happens at submit time before calling the Server Action.

3. **Achievement % computed at read time** — No stored column; formula `Math.round((totalValueKrw / targetAmountKrw) * 100)` runs in `DashboardGoalsSection` using the current `summary.totalValueKrw` from the portfolio computation already performed on the dashboard page.

4. **Empty section guard** — `DashboardGoalsSection` returns `null` when `goals.length === 0`. No "no goals" empty state message appears on the dashboard (D-04).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed zodResolver TypeScript type errors in GoalDialog**

- **Found during:** Task 2 TypeScript verification
- **Issue:** `z.coerce.number()` in the client-side goalFormSchema caused TypeScript errors because Zod's coerce produces `unknown` as the input type, which is incompatible with react-hook-form's `TFieldValues` constraint
- **Fix:** Changed `targetAmountKrw` field to `z.string().refine(...)` pattern (same as transaction-form.tsx), and convert to `parseInt()` at submit time before calling Server Action
- **Files modified:** `components/app/goal-dialog.tsx`
- **Commit:** included in Task 2 commit `7ef5d27`

## Known Stubs

None — all goal data flows from Drizzle queries to Server Components to client components. No hardcoded empty values or placeholder data.

## Threat Flags

None — all threat model mitigations from the plan's `<threat_model>` were implemented:
- T-05-01-01: `requireUser()` in every goal action
- T-05-01-02: `goalSchema.safeParse(data)` on all inputs
- T-05-01-03: `min(1)` validation on targetAmountKrw
- T-05-01-04: `regex(/^\d{4}-\d{2}-\d{2}$/)` validation on targetDate

## Self-Check

### Files exist:
- app/actions/goals.ts: FOUND
- db/queries/goals.ts: FOUND
- tests/goals/goal-crud.test.ts: FOUND
- components/app/goal-dialog.tsx: FOUND
- components/app/delete-goal-dialog.tsx: FOUND
- components/app/goal-list-client.tsx: FOUND
- components/app/dashboard-goals-section.tsx: FOUND
- app/(app)/goals/page.tsx: FOUND
- components/ui/progress.tsx: FOUND
- components/ui/sonner.tsx: FOUND

### Commits exist:
- 3fa1602: FOUND
- 7ef5d27: FOUND
- b1e7cb5: FOUND

## Self-Check: PASSED
