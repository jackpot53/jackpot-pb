---
phase: 05-goals-performance-comparison
plan: 03
subsystem: performance-comparison
tags: [performance, filtering, navigation, tabs, server-component]
dependency_graph:
  requires:
    - 03-03 (PerformanceTable component)
    - 03-04 (price-cache queries)
  provides:
    - /performance route with asset-type filter tabs
    - Sidebar 성과 nav item
  affects:
    - components/app/sidebar.tsx
tech_stack:
  added: []
  patterns:
    - Server Component with Client island (PerformanceFilterClient)
    - shadcn Tabs with single TabsContent + useState filtering
    - Read-only price cache access (no price refresh on performance page)
key_files:
  created:
    - tests/performance/performance-table.test.ts
    - components/app/performance-filter-client.tsx
    - app/(app)/performance/page.tsx
  modified:
    - components/app/sidebar.tsx
decisions:
  - "D-09: Route under app/(app)/ group — Supabase middleware handles auth, no extra code needed"
  - "D-10: TAB_FILTER maps tabs to assetType arrays; unknown tabs fall back to all (show all)"
  - "D-11: No TanStack Table — existing PerformanceTable component reused as-is"
  - "D-12: /performance reads from price cache only; refreshAllPrices() only called from dashboard"
metrics:
  duration: ~5 min
  completed_date: "2026-04-13T07:47:16Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 1
---

# Phase 5 Plan 3: Performance Comparison Page Summary

**One-liner:** /performance route with shadcn Tabs asset-type filter and cached-price Server Component, reusing existing PerformanceTable without TanStack Table.

## Objective

Create a /performance page accessible via the sidebar showing all holdings ranked by return % descending, filterable by asset type via shadcn Tabs (전체 / 주식 / 코인 / 예적금 / 부동산). Data comes from the existing price cache — no redundant price refresh.

## What Was Built

### Files Created

**`tests/performance/performance-table.test.ts`**
7 unit tests for the `filterByTab` filter logic: all, stocks (4 asset types), crypto, savings, real_estate, empty input, and unknown tab fallback. All 7 pass.

**`components/app/performance-filter-client.tsx`**
Client Component with `PerformanceFilterClient` export. Uses shadcn `Tabs` with `onValueChange` to update `activeTab` state. `filterByTab()` computes filtered rows from `TAB_FILTER` mapping. Single `TabsContent` keyed to `activeTab` (not one per tab) preserves `PerformanceTable` sort state when switching tabs.

**`app/(app)/performance/page.tsx`**
Server Component. Mirrors dashboard data fetch (Steps 1-4) but intentionally omits `refreshAllPrices()`. Fetches `getAssetsWithHoldings()` + `getPriceCacheByTickers()`, computes `AssetPerformance[]`, passes to `PerformanceFilterClient`. Heading: "성과 비교".

### Files Modified

**`components/app/sidebar.tsx`**
Added `{ label: '성과', href: '/performance' }` to `NAV_ITEMS` after the '목표' entry.

## Decisions Implemented

| Decision | Description |
|----------|-------------|
| D-09 | Route under `app/(app)/` group — Supabase middleware enforces auth, no page-level auth code needed |
| D-10 | `TAB_FILTER` maps tab keys to `AssetType[]`; unknown tabs return all rows (fallback) |
| D-11 | No TanStack Table introduced — existing `PerformanceTable` reused as-is |
| D-12 | `/performance` reads from price cache only; `refreshAllPrices()` only called from dashboard |

## Test Results

- New: 7/7 tests in `tests/performance/performance-table.test.ts` passing
- Full suite: 63/63 tests passing (no regressions)

## Deviations from Plan

None — plan executed exactly as written. The `filterByTab` logic in the test file and the `PerformanceFilterClient` are identical, confirming the TDD cycle (tests defined the contract, implementation satisfied it).

## Threat Surface Scan

No new threat surface beyond what the plan's threat model covers. The `/performance` route is under `app/(app)/` (auth enforced by middleware). Filter logic operates on server-provided data only — no client-side data escalation possible.

## Self-Check

- [x] `tests/performance/performance-table.test.ts` exists and passes 7/7
- [x] `components/app/performance-filter-client.tsx` exports `PerformanceFilterClient`
- [x] `app/(app)/performance/page.tsx` exists as Server Component (no 'use client')
- [x] `components/app/sidebar.tsx` contains '성과' and '/performance'
- [x] No `refreshAllPrices()` call in performance page
- [x] Full vitest suite green: 63/63
- [x] TypeScript compiles cleanly (`npx tsc --noEmit` — no errors in new files)
