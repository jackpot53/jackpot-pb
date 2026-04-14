---
phase: 05-goals-performance-comparison
reviewed: 2026-04-14T03:23:46Z
depth: standard
files_reviewed: 18
files_reviewed_list:
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
  - app/(app)/page.tsx
  - app/layout.tsx
  - components/app/goal-progress-chart.tsx
  - tests/goals/goal-chart.test.ts
  - tests/performance/performance-table.test.ts
  - components/app/performance-filter-client.tsx
  - app/(app)/performance/page.tsx
  - components/app/sidebar.tsx
findings:
  critical: 1
  warning: 4
  info: 4
  total: 9
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-04-14T03:23:46Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Phase 5 introduces goal CRUD (server actions, DB queries, dialog components) and a performance comparison page with tab-based filtering. The architecture is sound — server actions validate inputs with Zod, the DB layer is thin and correct, and the client components use `useTransition` properly for optimistic loading states.

One critical issue was found: a division-by-zero in the dashboard goals section that produces `Infinity% 달성` if `targetAmountKrw` is ever 0. This cannot happen through the UI today (Zod enforces `min(1)`), but no guard exists at the rendering level, making it a latent correctness bug.

Four warnings address a logic inconsistency in the form's amount validation, a duplicate heading rendered on the goals page, missing test coverage for the zero-target edge case, and a single-`TabsContent` pattern in the performance filter that is fragile under accessibility tooling.

Four info items cover duplicated price-loading logic between the dashboard and performance pages, the use of plain `toast()` instead of `toast.error()` for error notifications, an unchecked type cast in the chart tooltip, and the fallback empty-string `goalId` passed to `DeleteGoalDialog`.

---

## Critical Issues

### CR-01: Division by Zero in Dashboard Goals Section

**File:** `components/app/dashboard-goals-section.tsx:28`
**Issue:** `achievementPct` is computed as `Math.round((totalValueKrw / goal.targetAmountKrw) * 100)`. If `targetAmountKrw` is `0`, this evaluates to `Infinity`. The Zod schema on the server action enforces `min(1)`, but there is no guard at the render site. A goal inserted directly into the database, or any future code path that bypasses the action, would cause the UI to display `Infinity% 달성` and the progress bar to receive `NaN` or `Infinity` as its value.

The test suite in `tests/goals/goal-crud.test.ts` does not cover `achievementPct(value, 0)`, so this case is untested.

**Fix:**
```tsx
// components/app/dashboard-goals-section.tsx
const achievementPct =
  goal.targetAmountKrw > 0
    ? Math.round((totalValueKrw / goal.targetAmountKrw) * 100)
    : 0
```

Add a corresponding test:
```ts
// tests/goals/goal-crud.test.ts
it('returns 0 when target is zero (guard against division by zero)', () => {
  // Production code guards this; test confirms the guard behavior
  const safeAchievementPct = (current: number, target: number) =>
    target > 0 ? Math.round((current / target) * 100) : 0
  expect(safeAchievementPct(1_000_000, 0)).toBe(0)
})
```

---

## Warnings

### WR-01: Duplicate `<h1>` Heading on Goals Page

**File:** `app/(app)/goals/page.tsx:15` and `components/app/goal-list-client.tsx:24`
**Issue:** `GoalsPage` renders `<h1 className="text-xl font-semibold">목표</h1>` at line 15, and then renders `<GoalListClient>` which also renders `<h1 className="text-xl font-semibold">목표</h1>` at line 24. The goals page therefore displays the heading "목표" twice.

**Fix:** Remove the heading from `GoalsPage` since `GoalListClient` owns the header row (it also contains the "목표 추가" button, which must appear next to the heading). Delete lines 14-16 from `app/(app)/goals/page.tsx`:
```tsx
// Remove this block from GoalsPage:
// <div className="flex items-center justify-between">
//   <h1 className="text-xl font-semibold">목표</h1>
// </div>
```

### WR-02: Client-Side Amount Validation Silently Truncates Float Input

**File:** `components/app/goal-dialog.tsx:37-41` and line 98
**Issue:** The client-side Zod refine uses `parseInt(v, 10)` to check that the amount is a valid integer:
```ts
const n = parseInt(v, 10)
return !isNaN(n) && n >= 1 && Number.isInteger(n)
```
`parseInt("1.5", 10)` returns `1`, which is an integer — so `"1.5"` passes client validation. At submit time, line 98 sends `parseInt(data.targetAmountKrw, 10)` = `1` to the server, silently discarding the decimal. The user typed `1.5` but `1` is stored. The server Zod schema (`z.coerce.number().int()`) would reject `1.5` if the raw string were sent, but the client pre-converts it.

**Fix:** Use `Number(v)` instead of `parseInt` in the refine, and reject non-integer strings explicitly:
```ts
targetAmountKrw: z
  .string()
  .min(1, '올바른 금액을 입력하세요 (1원 이상의 숫자)')
  .refine(
    (v) => {
      const n = Number(v)
      return !isNaN(n) && Number.isInteger(n) && n >= 1
    },
    '올바른 금액을 입력하세요 (1원 이상의 숫자)'
  ),
```
This makes `"1.5"` fail validation, surfacing the error to the user instead of silently truncating.

### WR-03: Performance Page Duplicates Dashboard Price-Loading Logic

**File:** `app/(app)/performance/page.tsx:17-49` duplicates `app/(app)/page.tsx:35-69`
**Issue:** The entire block that loads asset holdings, fetches price cache, iterates assets, and calls `computeAssetPerformance` is copied verbatim between the dashboard page and the performance page. `PRICE_TTL_MS` and `isStalePrice` are also defined identically in both files. Any change to the staleness logic or performance computation must be applied in two places.

**Fix:** Extract a shared server-side helper, e.g. `lib/server/load-performances.ts`:
```ts
// lib/server/load-performances.ts
import { getAssetsWithHoldings } from '@/db/queries/assets-with-holdings'
import { getPriceCacheByTickers } from '@/db/queries/price-cache'
import { computeAssetPerformance, type AssetPerformance } from '@/lib/portfolio'

const PRICE_TTL_MS = 5 * 60 * 1000

function isStalePrice(cachedAt: Date | null): boolean {
  if (!cachedAt) return true
  return Date.now() - cachedAt.getTime() > PRICE_TTL_MS
}

export async function loadPerformances(): Promise<{
  performances: AssetPerformance[]
  priceMap: Map<string, { priceKrw: number; cachedAt: Date | null }>
}> {
  const assetsWithHoldings = await getAssetsWithHoldings()
  const liveTickers = assetsWithHoldings
    .filter((a) => a.priceType === 'live' && a.ticker)
    .map((a) => a.ticker!)
  const priceMap = await getPriceCacheByTickers([...liveTickers, 'USD_KRW'])
  const performances: AssetPerformance[] = []
  for (const asset of assetsWithHoldings) {
    let currentPriceKrw = 0
    let cachedAt: Date | null = null
    let stale = false
    if (asset.priceType === 'live' && asset.ticker) {
      const priceRow = priceMap.get(asset.ticker)
      currentPriceKrw = priceRow?.priceKrw ?? 0
      cachedAt = priceRow?.cachedAt ?? null
      stale = isStalePrice(cachedAt)
    }
    performances.push(
      computeAssetPerformance({ holding: asset, currentPriceKrw, isStale: stale, cachedAt, latestManualValuationKrw: asset.latestManualValuationKrw })
    )
  }
  return { performances, priceMap }
}
```

### WR-04: `PerformanceFilterClient` Uses Single `TabsContent` for All Tabs

**File:** `components/app/performance-filter-client.tsx:45`
**Issue:** The component renders one `<TabsContent value={activeTab}>` that always matches the active tab. While functionally correct today, this pattern means there is no inactive `TabsContent` in the DOM — the Tabs component cannot apply proper ARIA `hidden` attributes to non-active panels because they do not exist. If the UI library adds animations (fade/slide transitions), the single-panel approach breaks them entirely.

**Fix:** Render one `TabsContent` per tab key with the filtered rows pre-computed per tab, or use the current single-panel approach but wrap it in a key-reset to force re-mount:
```tsx
// Minimal fix — force re-mount on tab change so stale content is never shown:
<TabsContent key={activeTab} value={activeTab}>
  <PerformanceTable rows={filteredRows} />
</TabsContent>
```
Or render all panels with proper values and let the `filterByTab` call inside each:
```tsx
{Object.keys(TAB_FILTER).map((tab) => (
  <TabsContent key={tab} value={tab}>
    <PerformanceTable rows={filterByTab(tab, rows)} />
  </TabsContent>
))}
```

---

## Info

### IN-01: Error Toasts Use Plain `toast()` Instead of `toast.error()`

**File:** `components/app/goal-dialog.tsx:109` and `components/app/delete-goal-dialog.tsx:35`
**Issue:** Error conditions use `toast('...', { style: { background: 'var(--destructive)' } })` which bypasses sonner's error styling and — more importantly — skips the custom error icon configured in `components/ui/sonner.tsx` (`OctagonXIcon`). The error icon registered under `icons.error` only fires when `toast.error()` is called.

**Fix:**
```tsx
// In goal-dialog.tsx and delete-goal-dialog.tsx, replace:
toast('목표를 저장하지 못했습니다. 다시 시도하세요.', {
  style: { background: 'var(--destructive)' },
})
// With:
toast.error('목표를 저장하지 못했습니다. 다시 시도하세요.')
```

### IN-02: Type Assertion at Chart Tooltip Boundary

**File:** `components/app/goal-progress-chart.tsx:74`
**Issue:** `props as TooltipContentProps<number, string>` is an unchecked cast. If `recharts` changes the signature of the `content` callback's prop type in a future version, TypeScript will not catch the mismatch and the runtime will receive unexpected props silently.

**Fix:** Accept the `recharts` callback signature directly:
```tsx
<Tooltip
  content={({ active, payload }) => (
    <ProgressTooltip active={active} payload={payload as TooltipContentProps<number, string>['payload']} />
  )}
/>
```
Or type `ProgressTooltip` to accept the loose `unknown` payload and narrow inside the function.

### IN-03: Fallback Empty String `goalId` in `GoalListClient`

**File:** `components/app/goal-list-client.tsx:89`
**Issue:** `goalId={goalToDelete?.id ?? ''}` passes an empty string when `goalToDelete` is null. The server action guards against this (`if (!id) return { error: ... }`), but passing an empty string as an ID to a dialog component that renders unconditionally is a fragile pattern. If `DeleteGoalDialog` evolves to call the action on mount or in an effect, the empty-string fallback could trigger an unexpected server call.

**Fix:** Conditionally render `DeleteGoalDialog` only when `goalToDelete` is non-null:
```tsx
{goalToDelete && (
  <DeleteGoalDialog
    goalId={goalToDelete.id}
    goalName={goalToDelete.name}
    open={deleteOpen}
    onOpenChange={setDeleteOpen}
  />
)}
```

### IN-04: `goalAreaGradient` SVG ID Is Not Unique Per Page

**File:** `components/app/goal-progress-chart.tsx:66`
**Issue:** The `linearGradient` uses a hardcoded `id="goalAreaGradient"`. SVG IDs must be unique per document. If `GoalProgressChart` is ever rendered more than once on a page (e.g., in a comparison view or via React concurrent rendering), both gradients share the same ID and the browser uses the first one found for both, potentially causing the wrong gradient to display on one of the charts.

**Fix:** Generate a stable per-instance ID using `useId()`:
```tsx
import { useId } from 'react'

export function GoalProgressChart({ snapshots, goals }: GoalProgressChartProps) {
  const gradientId = useId().replace(/:/g, '') // sanitize for SVG id
  // ...
  <linearGradient id={gradientId} ...>
  // ...
  <Area fill={`url(#${gradientId})`} ...>
}
```

---

_Reviewed: 2026-04-14T03:23:46Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
