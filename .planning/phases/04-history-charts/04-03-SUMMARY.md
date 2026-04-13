---
phase: 04-history-charts
plan: "03"
subsystem: charts-ui
tags: [recharts, area-chart, server-component, tabs]
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
requirements-completed: [CHART-01, CHART-02]
metrics:
  duration_minutes: 8
  completed_date: "2026-04-13"
  tasks_completed: 3
  files_created: 3
  files_modified: 0
---

# Phase 04 Plan 03: /charts Page Summary

**recharts AreaChart UI layer with Server Component data fetch, tab navigation (연간/월간), custom Korean tooltips, and InsufficientDataMessage fallback for <2 snapshots.**

---

## Performance

- **Duration:** 8 min
- **Completed:** 2026-04-13
- **Tasks:** 3 (2 auto + 1 human-verify)
- **Files created:** 3
- **Files modified:** 0

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

### Task 3 — Visual Verification (approved)

User visually verified the /charts page and confirmed charts render correctly. All plan success criteria met.

---

## Task Commits

1. **Task 1: Build AnnualReturnChart and MonthlyPortfolioChart** - `cfb7646` (feat)
2. **Task 2: Build /charts Server Component page** - `671797e` (feat)
3. **Task 3: Visual verification** - approved by user (no code commit)

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
| Human visual verification | APPROVED |

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

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Fix required for TypeScript compilation to pass. No scope creep.

---

## Known Stubs

None — both chart components render actual data from `AnnualDataPoint[]` / `MonthlyDataPoint[]`. The `InsufficientDataMessage` fallback is not a stub — it is the correct production state when insufficient snapshots exist.

---

## Threat Surface Scan

No new network endpoints introduced. The `/charts` route is read-only and falls under the existing `app/(app)/` Supabase session authentication group (T-04-07: accepted). No new trust boundary surface identified.

---

## User Setup Required

**CRON_SECRET must be set in Vercel project** (inherited from Plan 01 requirement, applies to the full phase):
- Generate: `openssl rand -hex 32`
- Set in Vercel Dashboard → Project → Settings → Environment Variables
- Also add to `.env.local` for local testing
- After setting, redeploy so the cron schedule in `vercel.json` is registered

---

## Next Phase Readiness

- `/charts` route fully functional: two tabs, area charts, insufficient-data fallbacks, no price API calls
- Requires live snapshot data (from Plan 01 cron) to show actual charts; InsufficientDataMessage displays until first two snapshots exist
- Phase 04 all plans complete — year-end review feature (CHART-01, CHART-02) delivered

---

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| components/app/annual-return-chart.tsx | FOUND |
| components/app/monthly-portfolio-chart.tsx | FOUND |
| app/(app)/charts/page.tsx | FOUND |
| commit cfb7646 (Task 1) | FOUND |
| commit 671797e (Task 2) | FOUND |
| Task 3 human-verify | APPROVED |

---
*Phase: 04-history-charts*
*Completed: 2026-04-13*
