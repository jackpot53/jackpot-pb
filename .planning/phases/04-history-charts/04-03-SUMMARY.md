---
phase: 04-history-charts
plan: "03"
subsystem: charts-ui
tags: [recharts, area-chart, server-component, tabs, checkpoint]
dependency_graph:
  requires:
    - db/queries/portfolio-snapshots.ts (getAllSnapshots — Plan 02)
    - lib/snapshot/aggregation.ts (toAnnualData, toMonthlyData — Plan 02)
    - lib/snapshot/formatters.ts (formatKrwCompact, formatMonthLabel — Plan 02)
    - lib/portfolio.ts (formatKrw — existing)
    - components/ui/card.tsx (existing)
    - components/ui/tabs.tsx (existing)
    - components/ui/skeleton.tsx (existing)
  provides:
    - components/app/annual-return-chart.tsx (AnnualReturnChart, InsufficientDataMessage)
    - components/app/monthly-portfolio-chart.tsx (MonthlyPortfolioChart)
    - app/(app)/charts/page.tsx (ChartsPage Server Component)
  affects:
    - /charts route (new page accessible from sidebar)
tech_stack:
  added: []
  patterns:
    - recharts AreaChart with custom TooltipContentProps render function (TypeScript-safe)
    - Server Component async data fetch + Suspense boundary pattern
    - Shared InsufficientDataMessage sub-component with two variants (0 / 1 snapshots)
    - Distinct SVG gradient IDs per file to avoid DOM ID collisions
key_files:
  created:
    - components/app/annual-return-chart.tsx
    - components/app/monthly-portfolio-chart.tsx
    - app/(app)/charts/page.tsx
  modified: []
decisions:
  - "Used TooltipContentProps render function pattern (content={(props) => <Tooltip {...props} />}) instead of JSX element to avoid TypeScript payload missing-properties error"
  - "InsufficientDataMessage exported from annual-return-chart.tsx and imported into monthly-portfolio-chart.tsx (single definition, two consumers)"
metrics:
  duration_minutes: 8
  completed_date: "2026-04-13"
  tasks_completed: 2
  tasks_at_checkpoint: 1
  files_created: 3
  files_modified: 0
---

# Phase 04 Plan 03: /charts Page Summary

**One-liner:** recharts AreaChart UI layer with Server Component data fetch, tab navigation (연간/월간), custom Korean tooltips, and InsufficientDataMessage fallback for <2 snapshots.

---

## What Was Built

### Task 1 — AnnualReturnChart + MonthlyPortfolioChart (committed cfb7646)

**`components/app/annual-return-chart.tsx`**
- Client component (`'use client'`) following existing recharts pattern from `allocation-pie-chart.tsx`
- `AnnualReturnChart`: AreaChart with `returnPct` Y-axis, year X-axis, blue gradient fill (`#3B82F6`, id="areaGradient")
- `AnnualTooltip`: custom recharts tooltip showing year, ±return%, 자산 총액 (color-coded emerald/red)
- `InsufficientDataMessage`: exported for reuse; Variant A (0 snapshots) and Variant B (1 snapshot) with Korean copy per UI-SPEC copywriting contract
- TypeScript: uses `TooltipContentProps` render function to satisfy strict typing

**`components/app/monthly-portfolio-chart.tsx`**
- Client component (`'use client'`)
- `MonthlyPortfolioChart`: AreaChart with `totalValueKrw` Y-axis (compact KRW), month X-axis (YY.MM format), blue gradient fill (id="monthlyGradient")
- `MonthlyTooltip`: custom tooltip showing Korean "YYYY년 M월" label, full KRW value, optional MoM return (color-coded)
- Imports `InsufficientDataMessage` from `annual-return-chart.tsx`
- Y-axis width=72 to accommodate compact KRW labels

### Task 2 — /charts Server Component Page (committed 671797e)

**`app/(app)/charts/page.tsx`**
- Server Component (no `'use client'`) — fits existing `app/(app)/` authenticated layout
- Calls `getAllSnapshots()` server-side, passes through `toAnnualData()` and `toMonthlyData()`
- Tab navigation via shadcn `Tabs`, `defaultValue="annual"` (연간 default per D-08)
- Suspense boundary with `ChartPageSkeleton` (Card + h-[400px] Skeleton)
- Error state: catch block renders Korean error card per UI-SPEC copywriting contract
- Zero live price API calls — reads pre-computed snapshots only

---

## Verification

| Check | Result |
|-------|--------|
| TypeScript `npx tsc --noEmit` | PASS (exit 0) |
| `npx vitest run` | PASS (56/56 tests) |
| No `'use client'` in charts/page.tsx | PASS |
| No price API calls in charts/page.tsx | PASS |
| Gradient IDs distinct (areaGradient vs monthlyGradient) | PASS |
| InsufficientDataMessage in both chart files | PASS |
| Korean copy: 연간/월간 tabs | PASS |
| Error state copy: 차트 데이터를 불러오지 못했습니다 | PASS |

---

## Checkpoint Status

**Task 3 (checkpoint:human-verify) reached — awaiting user verification.**

The dev server must be started and the /charts page verified visually per the plan's `how-to-verify` steps before this plan can be marked complete.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed recharts TooltipContentProps TypeScript error**
- **Found during:** Task 1 TypeScript verification
- **Issue:** `<Tooltip content={<AnnualTooltip />} />` caused TS2739 — recharts `TooltipProps<number, string>` omits `payload`, `coordinate`, `active`, `accessibilityLayer`, `activeIndex` properties that are injected at render time by recharts context. TypeScript could not satisfy the type.
- **Fix:** Changed tooltip type from `TooltipProps` to `TooltipContentProps` and used render function pattern: `content={(props) => <AnnualTooltip {...props as TooltipContentProps<...>} />}` which satisfies the type contract.
- **Files modified:** `components/app/annual-return-chart.tsx`, `components/app/monthly-portfolio-chart.tsx`
- **Commit:** cfb7646

---

## Known Stubs

None — both chart components render actual data from `AnnualDataPoint[]` / `MonthlyDataPoint[]`. The `InsufficientDataMessage` fallback is not a stub — it is the correct production state when insufficient snapshots exist.

---

## Threat Surface Scan

No new network endpoints introduced. The `/charts` route is read-only and falls under the existing `app/(app)/` Supabase session authentication group (T-04-07: accepted). No new trust boundary surface identified.

---

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| components/app/annual-return-chart.tsx | FOUND |
| components/app/monthly-portfolio-chart.tsx | FOUND |
| app/(app)/charts/page.tsx | FOUND |
| commit cfb7646 (Task 1) | FOUND |
| commit 671797e (Task 2) | FOUND |
