---
phase: 04-history-charts
plan: 02
subsystem: snapshot-aggregation
tags: [tdd, pure-functions, data-layer, charts]
dependency_graph:
  requires:
    - db/schema/portfolio-snapshots.ts (Phase 1 — schema)
  provides:
    - db/queries/portfolio-snapshots.ts (getAllSnapshots — consumed by Plan 03 charts page)
    - lib/snapshot/aggregation.ts (toAnnualData, toMonthlyData — consumed by Plan 03)
    - lib/snapshot/formatters.ts (formatKrwCompact, formatMonthLabel — consumed by Plan 03)
  affects: []
tech_stack:
  added: []
  patterns:
    - Pure function aggregation (no DB calls in aggregation layer)
    - TDD RED → GREEN cycle
    - Strict trailing-12-months window cutoff
key_files:
  created:
    - tests/snapshot-aggregation.test.ts
    - db/queries/portfolio-snapshots.ts
    - lib/snapshot/aggregation.ts
    - lib/snapshot/formatters.ts
  modified: []
decisions:
  - Trailing 12 months uses strict cutoff (`>` not `>=`) so snapshot at exactly 12 months ago is excluded from the window
  - First-year annual data uses overall return vs. cost basis per plan spec (not returnBps from DB)
metrics:
  duration_minutes: 2
  completed_date: "2026-04-13"
  tasks_completed: 2
  files_created: 4
  files_modified: 0
---

# Phase 4 Plan 02: Snapshot Aggregation + Chart Formatters Summary

**One-liner:** TDD-implemented pure functions for snapshot querying (`getAllSnapshots`), YoY/MoM aggregation (`toAnnualData`, `toMonthlyData`), and KRW/month formatters (`formatKrwCompact`, `formatMonthLabel`) — complete data layer for CHART-01 and CHART-02.

---

## What Was Built

### `db/queries/portfolio-snapshots.ts`
Drizzle query helper that SELECTs `snapshotDate`, `totalValueKrw`, `totalCostKrw`, `returnBps` from `portfolio_snapshots` ordered ASC by date. Exports the `SnapshotRow` interface used throughout the aggregation layer.

### `lib/snapshot/aggregation.ts`
Two pure functions:
- **`toAnnualData(snapshots)`** — groups by year (last snapshot per year wins), computes YoY return from consecutive year-end `totalValueKrw` values; first year uses overall return vs. cost basis since no prior year exists.
- **`toMonthlyData(snapshots)`** — filters to trailing 12 months (strict cutoff), groups by `YYYY-MM` (last per month), computes MoM return for consecutive months; first month in window has `returnPct: undefined`.

Both functions accept `SnapshotRow[]` and return typed arrays. No DB calls, no side effects.

### `lib/snapshot/formatters.ts`
Two pure formatters:
- **`formatKrwCompact(n)`** — compact KRW for Y-axis labels: `₩1.5억` / `₩5천만` / `₩5백만` / `₩500,000`
- **`formatMonthLabel(s)`** — X-axis ticks: `"2025-04"` → `"25.04"`

### `tests/snapshot-aggregation.test.ts`
14 test cases covering all specified behaviors — all pass.

---

## TDD Cycle

| Phase | Commit | Status |
|-------|--------|--------|
| RED (failing tests) | `8dbcc6f` | 14 tests fail — modules not found |
| GREEN (implementation) | `b6e1f72` | 14 tests pass |

Full suite: 56 tests across 10 files — all green.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed trailing 12 months boundary condition**
- **Found during:** GREEN phase, test run
- **Issue:** The filter `>= cutoffStr` included the snapshot at exactly 12 months ago, giving 13 entries when 14 months of data were provided. The plan says "oldest 2 months excluded" meaning the window should be strictly less than 12 months old.
- **Fix:** Changed filter from `>= cutoffStr` to `> cutoffStr` so the snapshot at exactly the cutoff month is excluded.
- **Files modified:** `lib/snapshot/aggregation.ts`
- **Commit:** `b6e1f72`

---

## Known Stubs

None — all functions are fully implemented and wired. No placeholder data.

---

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. `getAllSnapshots()` is a read-only SELECT called only from authenticated Server Components under `app/(app)/`. Consistent with threat model T-04-05 (accepted) and T-04-06 (accepted).

---

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| tests/snapshot-aggregation.test.ts | FOUND |
| db/queries/portfolio-snapshots.ts | FOUND |
| lib/snapshot/aggregation.ts | FOUND |
| lib/snapshot/formatters.ts | FOUND |
| commit 8dbcc6f (RED) | FOUND |
| commit b6e1f72 (GREEN) | FOUND |
