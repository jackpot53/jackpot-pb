---
phase: 05-goals-performance-comparison
fixed_at: 2026-04-13T00:00:00Z
review_path: .planning/phases/05-goals-performance-comparison/05-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 5: Code Review Fix Report

**Fixed at:** 2026-04-13T00:00:00Z
**Source review:** .planning/phases/05-goals-performance-comparison/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (1 Critical, 4 Warning)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: Division by Zero in Dashboard Goals Section

**Files modified:** `components/app/dashboard-goals-section.tsx`, `tests/goals/goal-crud.test.ts`
**Commit:** f1f8c61
**Applied fix:** Changed `achievementPct` computation to guard against zero target with a ternary (`goal.targetAmountKrw > 0 ? Math.round(...) : 0`). Also updated the `achievementPct` helper function in the test file to include the same guard, and added a new test case `'returns 0 when target is zero (guard against division by zero)'`.

### WR-01: Duplicate `<h1>` Heading on Goals Page

**Files modified:** `app/(app)/goals/page.tsx`
**Commit:** 0b20a0f
**Applied fix:** Removed the `<div className="flex items-center justify-between"><h1 ...>목표</h1></div>` block from `GoalsPage`. The heading and "목표 추가" button are owned by `GoalListClient` and remain there.

### WR-02: Client-Side Amount Validation Silently Truncates Float Input

**Files modified:** `components/app/goal-dialog.tsx`
**Commit:** 7dc29f8
**Applied fix:** Replaced `parseInt(v, 10)` with `Number(v)` in the `targetAmountKrw` refine callback, and reordered the checks to `!isNaN(n) && Number.isInteger(n) && n >= 1`. This causes `"1.5"` to fail validation (since `Number("1.5")` is not an integer) rather than silently truncating to `1`.

### WR-03: Performance Page Duplicates Dashboard Price-Loading Logic

**Files modified:** `lib/server/load-performances.ts` (new file), `app/(app)/performance/page.tsx`, `app/(app)/page.tsx`
**Commit:** 22f875e
**Applied fix:** Created `lib/server/load-performances.ts` containing the `PRICE_TTL_MS` constant, `isStalePrice` helper, and `loadPerformances()` async function that returns `{ performances, priceMap }`. Updated `performance/page.tsx` to call `loadPerformances()` and removed the duplicated block. Updated `app/(app)/page.tsx` to also call `loadPerformances()` and removed the duplicated constant, function, and loop. The dashboard still accesses `priceMap.get('USD_KRW')` for FX rate extraction, which the shared helper exposes. Also removed the now-unused `type AssetPerformance` import from the dashboard page.

### WR-04: `PerformanceFilterClient` Uses Single `TabsContent` for All Tabs

**Files modified:** `components/app/performance-filter-client.tsx`
**Commit:** 18124fc
**Applied fix:** Added `key={activeTab}` to the single `<TabsContent>` element. This forces React to unmount and remount the panel on every tab change, preventing stale content from appearing and enabling correct ARIA panel lifecycle behaviour.

---

_Fixed: 2026-04-13T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
