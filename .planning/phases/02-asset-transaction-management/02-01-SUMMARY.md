---
phase: 02-asset-transaction-management
plan: "01"
subsystem: asset-crud
tags: [next.js, drizzle, supabase, shadcn, server-actions]
dependency_graph:
  requires: []
  provides:
    - app-shell-layout
    - asset-crud-pages
    - asset-server-actions
    - drizzle-asset-queries
  affects:
    - 02-02 (WAVG TDD uses same asset schema)
    - 02-03 (transaction pages reference asset detail shell)
    - 02-04 (manual valuations live inside asset detail tabs)
tech_stack:
  added:
    - shadcn table
    - shadcn select
    - shadcn tabs
    - shadcn dialog
    - shadcn badge
    - shadcn separator
  patterns:
    - Server Action pattern with requireUser() first, then zod safeParse, then Drizzle
    - buttonVariants + Link instead of Button asChild (base-ui incompatibility)
    - base-ui render prop pattern for DialogTrigger (no asChild support)
key_files:
  created:
    - components/app/sidebar.tsx
    - components/app/header.tsx
    - app/(app)/layout.tsx
    - app/(app)/page.tsx
    - components/app/asset-type-badge.tsx
    - components/app/asset-form.tsx
    - components/app/delete-asset-dialog.tsx
    - db/queries/assets.ts
    - app/actions/assets.ts
    - app/(app)/assets/page.tsx
    - app/(app)/assets/new/page.tsx
    - app/(app)/assets/[id]/page.tsx
    - app/(app)/assets/[id]/edit/page.tsx
    - components/ui/table.tsx
    - components/ui/select.tsx
    - components/ui/tabs.tsx
    - components/ui/dialog.tsx
    - components/ui/badge.tsx
    - components/ui/separator.tsx
  modified:
    - app/page.tsx (now redirects to /assets)
decisions:
  - shadcn v4 with base-ui does not support asChild; use buttonVariants on Link, and render prop pattern on DialogTrigger
  - deleteAsset manually cascade-deletes transactions then holdings then asset (no ON DELETE CASCADE in schema per plan decision)
metrics:
  duration: ~15 minutes
  completed: 2026-04-10
  tasks_completed: 2
  tasks_total: 2
  files_created: 19
  files_modified: 1
---

# Phase 02 Plan 01: App Shell + Asset CRUD Summary

**One-liner:** Full app shell with sidebar/header layout guard plus complete Asset CRUD (list table, create/edit form, delete dialog) using Drizzle queries and Server Actions with auth-first pattern.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | App shell — shadcn install, sidebar, header, layout | 4a19e3c | 11 files |
| 2 | Asset CRUD — badge, queries, actions, pages | 7aa13b9 | 9 files |

## What Was Built

**Task 1 — App Shell:**
- 6 shadcn components installed: table, select, tabs, dialog, badge, separator
- `Sidebar` with 5 nav items (대시보드/자산/거래내역/차트/목표), active highlight via `usePathname`
- `Header` with user email from `supabase.auth.getUser()` and 로그아웃 button
- `app/(app)/layout.tsx` — authenticated shell with Supabase auth guard (`redirect('/login')` if no user)
- `app/page.tsx` now redirects to `/assets`

**Task 2 — Asset CRUD:**
- `AssetTypeBadge` — maps all 7 asset types to colored Badge per UI-SPEC
- `db/queries/assets.ts` — `getAssets()` and `getAssetById()` Drizzle helpers
- `app/actions/assets.ts` — `createAsset`, `updateAsset`, `deleteAsset` Server Actions; each calls `requireUser()` first
- `deleteAsset` manually deletes child transactions and holdings before deleting asset (no cascade in DB schema)
- `AssetForm` — shared react-hook-form + zod form; conditional ticker field shown only for `priceType === 'live'`
- `/assets` list page — data table with type badges, "—" placeholders for 평단가/현재가/수익%, row edit/delete actions
- `/assets/new` create page, `/assets/[id]/edit` edit page with pre-filled form
- `/assets/[id]` detail page shell — 개요 and 거래내역 tabs (content wired in Plans 02-03/04)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] shadcn v4 base-ui Button has no `asChild` prop**
- **Found during:** Task 2 first build
- **Issue:** shadcn v4 uses `@base-ui/react` instead of Radix UI. The `Button` component wraps `ButtonPrimitive` from base-ui which does not expose an `asChild` prop. TypeScript error on `<Button asChild>`.
- **Fix:** Used `buttonVariants()` from `@/components/ui/button` directly on `<Link>` elements; used base-ui's `render` prop pattern on `DialogTrigger` (e.g., `<DialogTrigger render={<Button ... />}>`).
- **Files modified:** `app/(app)/assets/page.tsx`, `components/app/delete-asset-dialog.tsx`
- **Commits:** 7aa13b9

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| "개요 준비 중..." | app/(app)/assets/[id]/page.tsx | overview tab | Plan 02-04 wires manual valuations here |
| "거래내역 준비 중..." | app/(app)/assets/[id]/page.tsx | transactions tab | Plan 02-03 wires transaction list here |
| "—" for 평단가/현재가/수익% | app/(app)/assets/page.tsx | table cells | D-03: live prices in Phase 3; manual valuations in Phase 4 |

These stubs are intentional per plan decision D-03 — they will be replaced by Plans 02-02/03/04.

## Threat Surface

All new Server Actions are covered by the plan's threat model (T-02-01-S through T-02-01-E). No new surfaces beyond plan scope.

## Self-Check: PASSED

Files verified:
- components/app/sidebar.tsx: FOUND
- components/app/header.tsx: FOUND
- app/(app)/layout.tsx: FOUND
- components/app/asset-type-badge.tsx: FOUND
- db/queries/assets.ts: FOUND
- app/actions/assets.ts: FOUND
- app/(app)/assets/page.tsx: FOUND

Commits verified:
- 4a19e3c: FOUND
- 7aa13b9: FOUND
