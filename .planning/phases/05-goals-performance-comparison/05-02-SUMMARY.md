---
phase: 05-goals-performance-comparison
plan: "02"
subsystem: goals
tags: [goals, recharts, area-chart, reference-line, portfolio-snapshots, goal-progress]
dependency_graph:
  requires:
    - phase: 05-01
      provides: "GoalListClient, GoalRow type, listGoals() query, /goals page shell"
    - phase: 04-history-charts
      provides: "getAllSnapshots() query, SnapshotRow type, recharts AreaChart pattern"
  provides:
    - "GoalProgressChart recharts AreaChart + horizontal/vertical ReferenceLine per goal"
    - "/goals page updated: GoalProgressChart rendered above GoalListClient"
    - "goal-chart.test.ts: 5 unit tests for prepareChartData and hasNoData"
  affects:
    - "05-03 performance comparison page"
tech-stack:
  added: []
  patterns:
    - "Goal progress chart pattern: ReferenceLine y=targetAmountKrw (horizontal dashed) + x=targetDate (vertical dashed) as direct children of AreaChart"
    - "Parallel Server Component fetch: Promise.all([listGoals(), getAllSnapshots()]) at page level"
    - "Date string invariant: snapshotDate and targetDate both ISO YYYY-MM-DD strings passed directly to recharts (no Date conversion)"
key-files:
  created:
    - components/app/goal-progress-chart.tsx
    - tests/goals/goal-chart.test.ts
  modified:
    - app/(app)/goals/page.tsx
key-decisions:
  - "D-05: Horizontal ReferenceLine y=targetAmountKrw per goal inside AreaChart as direct child"
  - "D-06: Vertical ReferenceLine x=targetDate per goal (only when targetDate !== null) -- date string passed directly"
  - "D-07: Empty state when snapshots.length === 0: Korean message card instead of chart"
  - "D-08: GoalProgressChart is primary visual anchor -- rendered before GoalListClient in JSX"
patterns-established:
  - "GoalProgressChart pattern: uses same AreaChart shell as annual-return-chart.tsx with ReferenceLine overlays"
  - "No date conversion rule: ISO date strings are passed directly as x= values to recharts ReferenceLine"
requirements-completed: [GOAL-02]
duration: 15min
completed: 2026-04-13
---

# Phase 05 Plan 02: Goal Progress Chart

**Recharts AreaChart on /goals showing portfolio KRW over time with horizontal ReferenceLine per goal target and vertical ReferenceLine per goal deadline**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2 of 2
- **Files modified:** 3
## Accomplishments
- Created GoalProgressChart component with recharts AreaChart, horizontal dashed ReferenceLine per goal target, vertical dashed ReferenceLine per goal deadline date
- Created goal-chart.test.ts with 5 unit tests for prepareChartData and hasNoData -- all passing (74/74 full suite)
- Updated /goals page Server Component with Promise.all fetch of both listGoals() and getAllSnapshots()
- GoalProgressChart renders as primary visual anchor above GoalListClient
- Korean empty state message when no snapshots exist
## Task Commits

1. **Task 1: Chart data prep test + GoalProgressChart** - `c41f87a` (test+feat)
2. **Task 2: Wire GoalProgressChart into /goals page** - `7b7405b` (feat)
## Files Created/Modified
- components/app/goal-progress-chart.tsx - GoalProgressChart: AreaChart + ReferenceLine overlays, empty state, custom tooltip
- tests/goals/goal-chart.test.ts - 5 unit tests for prepareChartData() and hasNoData() pure helpers
- app/(app)/goals/page.tsx - Updated Server Component: Promise.all fetch, GoalProgressChart above GoalListClient

## Decisions Made
1. **Date string invariant**: snapshotDate and targetDate are both ISO YYYY-MM-DD strings; passed directly to recharts x= value without Date conversion. Matching formats ensures vertical ReferenceLine renders at correct X position.
2. **ReferenceLine placement**: ReferenceLine elements are direct children of AreaChart JSX, not nested inside Area. This is required by recharts API.
3. **Empty state variant**: When snapshots.length === 0, returns a Card with Korean empty state message matching UI-SPEC exactly.
## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None -- all data flows from Drizzle queries (getAllSnapshots, listGoals) through Server Component props to GoalProgressChart.

## Issues Encountered
- Korean character encoding issue during file creation (template literal handling in Node.js -e commands): resolved using Unicode escape sequences in node -e calls.
- Initial file write had incorrect brace indentation: corrected by targeted line replacement.

## Next Phase Readiness
- GOAL-02 complete: GoalProgressChart renders on /goals with AreaChart + ReferenceLine overlays
- All 74 vitest tests passing
- TypeScript compiles cleanly (no new errors from this plan)
- Ready for Phase 05-03: performance comparison page

---
*Phase: 05-goals-performance-comparison*
*Completed: 2026-04-13*
## Self-Check: PASSED

### Files exist:
- components/app/goal-progress-chart.tsx: FOUND
- tests/goals/goal-chart.test.ts: FOUND
- app/(app)/goals/page.tsx: FOUND
- .planning/phases/05-goals-performance-comparison/05-02-SUMMARY.md: FOUND

### Commits exist:
- c41f87a: FOUND
- 7b7405b: FOUND
