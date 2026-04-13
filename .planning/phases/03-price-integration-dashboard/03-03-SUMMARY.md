---
phase: "03"
plan: "03"
subsystem: dashboard-ui
tags: [dashboard, recharts, server-component, stat-cards, pie-chart, skeleton, ui]
one_liner: "Dashboard page with 4 stat cards, recharts donut allocation chart, breakdown list, and loading skeletons wired to live price + portfolio data"

dependency_graph:
  requires:
    - Plan 03-01: app/actions/prices.ts → refreshAllPrices
    - Plan 03-01: db/queries/price-cache.ts → getPriceCacheByTicker
    - Plan 03-02: db/queries/assets-with-holdings.ts → getAssetsWithHoldings
    - Plan 03-02: lib/portfolio.ts → computeAssetPerformance, computePortfolio, aggregateByType, formatKrw, formatUsd, formatReturn
  provides:
    - app/(app)/page.tsx → DashboardPage Server Component
    - components/app/dashboard-stat-card.tsx → DashboardStatCard
    - components/app/allocation-pie-chart.tsx → AllocationPieChart, AllocationSlice
    - components/app/stale-price-badge.tsx → StalePriceBadge
    - components/app/price-loading-skeleton.tsx → StatCardSkeleton, PieChartSkeleton, BreakdownSkeleton
  affects:
    - Plan 03-04: performance table component replaces placeholder in Row 3

tech_stack:
  added:
    - recharts@3.8.1 (PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer)
    - components/ui/skeleton.tsx (shadcn skeleton component)
    - components/ui/tooltip.tsx (shadcn tooltip via @base-ui/react/tooltip)
  patterns:
    - Next.js App Router Server Component with async data fetching
    - On-demand price refresh pattern (D-01): refreshAllPrices on page render
    - Stale cache detection with 5-minute TTL threshold
    - recharts ResponsiveContainer for fluid pie chart sizing

key_files:
  created:
    - components/app/dashboard-stat-card.tsx
    - components/app/allocation-pie-chart.tsx
    - components/app/stale-price-badge.tsx
    - components/app/price-loading-skeleton.tsx
    - components/ui/skeleton.tsx
    - components/ui/tooltip.tsx
  modified:
    - app/(app)/page.tsx (replaced redirect with full dashboard)
    - package.json (added recharts dependency)

decisions:
  - "recharts Tooltip formatter typed with runtime typeof check instead of cast — TypeScript 'Formatter<ValueType>' uses ValueType | undefined, not number"
  - "AssetTypeBadge takes local AssetType union, AllocationSlice.assetType is string — type assertion used at call site (data always valid enum values)"
  - "skeleton.tsx and tooltip.tsx added via shadcn CLI (not pre-existing) — Rule 3 auto-fix for missing dependencies"
  - "Row 3 performance table is a placeholder stub pending Plan 04"

metrics:
  duration_minutes: 15
  completed_date: "2026-04-13"
  tasks_completed: 2
  tasks_total: 3
  files_created: 6
  files_modified: 2
---

# Phase 03 Plan 03: Dashboard UI Summary

Dashboard page with 4 stat cards, recharts donut allocation chart, breakdown list, and loading skeletons wired to live price + portfolio data.

## What Was Built

### Task 1: Install recharts + build display components

**`components/app/dashboard-stat-card.tsx`** — `DashboardStatCard` component with label (14px muted), primary value (28px semibold), and optional secondary value line with color coding:
- `text-emerald-600` for positive return
- `text-red-600` for negative return
- `text-muted-foreground` for neutral/zero

**`components/app/allocation-pie-chart.tsx`** — `'use client'` component wrapping recharts `PieChart` with donut style (`innerRadius=60, outerRadius=100`), `Cell` coloring per asset type (blue for stocks, indigo for ETFs, orange for crypto, green for real estate, gray for savings), `Tooltip` with KRW currency formatting, and `Legend`. Exports `AllocationSlice` interface.

**`components/app/stale-price-badge.tsx`** — `'use client'` amber badge with `Intl.RelativeTimeFormat` relative time ('3시간 전') and shadcn `Tooltip` showing absolute timestamp on hover. Uses `@base-ui/react/tooltip` API via `components/ui/tooltip.tsx`.

**`components/app/price-loading-skeleton.tsx`** — Three exports: `StatCardSkeleton` (mimics Card structure with pulse skeleton lines), `PieChartSkeleton` (full-height placeholder), `BreakdownSkeleton` (3 skeleton rows).

**`components/ui/skeleton.tsx`** — Added via `npx shadcn add skeleton`.
**`components/ui/tooltip.tsx`** — Added via `npx shadcn add tooltip`.

**recharts@3.8.1** — Installed via npm.

### Task 2: Dashboard Server Component

**`app/(app)/page.tsx`** — Full async Server Component replacing the previous `redirect('/assets')`. Execution flow:

1. `refreshAllPrices()` — on-demand price refresh (D-01)
2. `getAssetsWithHoldings()` — loads all positions from DB
3. `getPriceCacheByTicker('USD_KRW')` — loads FX rate
4. Per-asset loop: fetches price cache for LIVE assets, calls `computeAssetPerformance`
5. `computePortfolio` + `aggregateByType` — portfolio totals and type breakdown
6. Renders 3-row dashboard layout per 03-UI-SPEC.md Layout Contract

**Row 1:** 4 stat cards — 총 자산 (KRW), 총 자산 (USD), 전체 수익률, 평가손익 (KRW). Satisfies DASH-01 (total value + return on one screen) and DASH-04 (dual KRW/USD display).

**Row 2:** Left card — recharts donut pie chart with asset-type allocation (DASH-02). Right card — breakdown list with `AssetTypeBadge` + KRW total + share % per type, separated by `<Separator />`.

**Row 3:** Placeholder card "종목별 성과" with stub text — `PerformanceTable` wired in Plan 04.

### Task 3: Human Verification Checkpoint

Paused for visual verification of the dashboard at http://localhost:3000/.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] skeleton.tsx and tooltip.tsx not pre-existing**
- **Found during:** Task 1
- **Issue:** Plan references `components/ui/skeleton.tsx` and `components/ui/tooltip.tsx` as "already installed" but neither file existed in the codebase.
- **Fix:** Ran `npx shadcn add skeleton` and `npx shadcn add tooltip` to install both components.
- **Files modified:** `components/ui/skeleton.tsx` (created), `components/ui/tooltip.tsx` (created)
- **Commits:** 22086af

**2. [Rule 1 - Bug] recharts Tooltip formatter TypeScript error**
- **Found during:** Task 1 (tsc --noEmit)
- **Issue:** `formatter={(value: number, name: string) => [...]}` fails because recharts types `value` as `ValueType | undefined`. TypeScript error TS2322.
- **Fix:** Changed to `formatter={(value, name) => [typeof value === 'number' ? format(value) : String(value), name]}` runtime guard.
- **Files modified:** `components/app/allocation-pie-chart.tsx`
- **Commits:** 22086af

**3. [Rule 1 - Bug] AssetTypeBadge assetType type mismatch**
- **Found during:** Task 2 (tsc --noEmit)
- **Issue:** `AllocationSlice.assetType` is typed as `string`, but `AssetTypeBadge` expects the specific union `'stock_kr' | 'stock_us' | ...`. TypeScript error TS2322.
- **Fix:** Added type assertion at call site. Data values are always from the DB enum, so the assertion is safe.
- **Files modified:** `app/(app)/page.tsx`
- **Commits:** 482bd80

## Known Stubs

**Row 3 performance table** — `app/(app)/page.tsx` line 135: `<p className="text-sm text-muted-foreground">로딩 중...</p>` placeholder text. This is intentional — `PerformanceTable` component is built in Plan 04.

## Threat Flags

All trust boundaries from the plan's threat model are correctly mitigated:
- **T-03-03-S** (Spoofing): `app/(app)/layout.tsx` enforces Supabase auth middleware; `refreshAllPrices` also has `requireUser()` guard as secondary.
- **T-03-03-I** (Information Disclosure): Portfolio data passes as serializable props only — no API keys, secrets, or cross-user data exposure.
- **T-03-03-T** (Tampering): `refreshAllPrices` called from Server Component, guarded by `requireUser()`.
- **T-03-03-D** (DoS): Asset types capped at 7 enum values; rendering load is negligible.

No new security surface introduced beyond the plan's threat model.

## Self-Check: PASSED

Files verified:
- components/app/dashboard-stat-card.tsx: FOUND
- components/app/allocation-pie-chart.tsx: FOUND
- components/app/stale-price-badge.tsx: FOUND
- components/app/price-loading-skeleton.tsx: FOUND
- components/ui/skeleton.tsx: FOUND
- components/ui/tooltip.tsx: FOUND
- app/(app)/page.tsx: FOUND (contains DashboardPage async function, no redirect)

Commits verified:
- 22086af: feat(03-03): install recharts + build display components — FOUND
- 482bd80: feat(03-03): dashboard server component with stat cards and allocation chart — FOUND
