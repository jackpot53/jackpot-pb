---
phase: 04-history-charts
verified: 2026-04-13T15:38:30Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Navigate to /charts tab '연간' and confirm AnnualReturnChart renders (or InsufficientDataMessage appears when < 2 snapshots exist)"
    expected: "Either an AreaChart with return% Y-axis and year X-axis, or the Korean insufficient-data fallback message"
    why_human: "Chart rendering requires a browser with recharts; cannot verify SVG output programmatically without a running app"
  - test: "Navigate to /charts tab '월간' and confirm MonthlyPortfolioChart renders (or InsufficientDataMessage appears)"
    expected: "Either an AreaChart with compact KRW Y-axis and YY.MM X-axis, or the Korean insufficient-data fallback message"
    why_human: "Chart rendering requires a browser; automated checks cannot confirm recharts AreaChart renders correctly"
  - test: "Trigger the cron endpoint manually: curl -H 'Authorization: Bearer {CRON_SECRET}' https://{host}/api/cron/snapshot"
    expected: "Returns {\"ok\":true,\"snapshotDate\":\"YYYY-MM-DD\"} and a row appears in portfolio_snapshots table"
    why_human: "Requires live Supabase DB and CRON_SECRET env var; cannot test against production DB programmatically from this agent"
---

# Phase 4: History & Charts Verification Report

**Phase Goal:** Users can see how their total portfolio has grown over months and years, delivering the core year-end review feature
**Verified:** 2026-04-13T15:38:30Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                | Status     | Evidence                                                                                   |
|----|------------------------------------------------------------------------------------------------------|------------|--------------------------------------------------------------------------------------------|
| 1  | A nightly cron job automatically records a portfolio snapshot each day                               | VERIFIED   | vercel.json cron schedule `0 0 * * *` to `/api/cron/snapshot`; GET handler with full portfolio computation wired end-to-end |
| 2  | User can view an annual return chart showing year-over-year total asset growth                        | VERIFIED   | `AnnualReturnChart` component renders recharts AreaChart from `AnnualDataPoint[]`; `InsufficientDataMessage` fallback for < 2 data points |
| 3  | User can view a monthly chart showing total portfolio value across a rolling 12-month window          | VERIFIED   | `MonthlyPortfolioChart` component renders recharts AreaChart from `MonthlyDataPoint[]` with trailing-12-months filter |
| 4  | Charts load from pre-computed snapshots — no live price API calls are made when viewing history      | VERIFIED   | `charts/page.tsx` calls only `getAllSnapshots()` — no price API imports; aggregation layer is pure functions with no network calls |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact                                      | Expected                                          | Status     | Details                                                       |
|-----------------------------------------------|---------------------------------------------------|------------|---------------------------------------------------------------|
| `vercel.json`                                 | Cron schedule for /api/cron/snapshot              | VERIFIED   | `"path": "/api/cron/snapshot"`, `"schedule": "0 0 * * *"`    |
| `app/api/cron/snapshot/route.ts`              | Exports `GET`, CRON_SECRET auth                   | VERIFIED   | Exports `GET`; fail-closed CRON_SECRET check; full portfolio computation; calls `writePortfolioSnapshot` |
| `lib/snapshot/writer.ts`                      | Exports `writePortfolioSnapshot`                  | VERIFIED   | Exports `writePortfolioSnapshot(params: SnapshotParams): Promise<void>`; uses `onConflictDoNothing()` |
| `db/queries/portfolio-snapshots.ts`           | Exports `getAllSnapshots`                         | VERIFIED   | Exports `getAllSnapshots(): Promise<SnapshotRow[]>`; Drizzle SELECT ordered ASC |
| `lib/snapshot/aggregation.ts`                 | Exports `toAnnualData`, `toMonthlyData`           | VERIFIED   | Both functions exported; pure with no DB calls; trailing-12-month cutoff uses strict `>` per plan spec |
| `lib/snapshot/formatters.ts`                  | Exports `formatKrwCompact`, `formatMonthLabel`    | VERIFIED   | Both exported; threshold tiers correct; `formatMonthLabel` converts `YYYY-MM` to `YY.MM` |
| `app/(app)/charts/page.tsx`                   | Server Component, tabs, Suspense                  | VERIFIED   | No `'use client'`; Tabs with `연간`/`월간`; Suspense with skeleton; error state with Korean copy |
| `components/app/annual-return-chart.tsx`      | AnnualReturnChart + InsufficientDataMessage       | VERIFIED   | Exports `AnnualReturnChart` and `InsufficientDataMessage`; blue AreaChart; custom Korean tooltip |
| `components/app/monthly-portfolio-chart.tsx`  | MonthlyPortfolioChart                             | VERIFIED   | Exports `MonthlyPortfolioChart`; imports `InsufficientDataMessage` from annual chart; distinct gradient ID `monthlyGradient` |

### Key Link Verification

| From                              | To                                         | Via                                   | Status   | Details                                                  |
|-----------------------------------|--------------------------------------------|---------------------------------------|----------|----------------------------------------------------------|
| `route.ts` (cron)                 | `lib/snapshot/writer.ts`                   | import + function call                | WIRED    | `import { writePortfolioSnapshot }` + called in handler  |
| `route.ts` (cron)                 | `db/queries/assets-with-holdings`          | import + call                         | WIRED    | `getAssetsWithHoldings()` called to assemble portfolio   |
| `route.ts` (cron)                 | `lib/portfolio` (computePortfolio)         | import + call                         | WIRED    | `computePortfolio(performances, fxRateInt)` called       |
| `middleware.ts`                   | `/api/cron/snapshot` (exclusion)           | regex matcher                         | WIRED    | `api/cron` in exclusion group — prevents session redirect|
| `charts/page.tsx`                 | `db/queries/portfolio-snapshots`           | import + await call                   | WIRED    | `getAllSnapshots()` awaited in `ChartsPageContent`        |
| `charts/page.tsx`                 | `lib/snapshot/aggregation`                 | import + calls                        | WIRED    | `toAnnualData(snapshots)` and `toMonthlyData(snapshots)` called |
| `charts/page.tsx`                 | `AnnualReturnChart`                        | JSX prop `data={annualData}`          | WIRED    | Data flows from `toAnnualData` result to component prop  |
| `charts/page.tsx`                 | `MonthlyPortfolioChart`                    | JSX prop `data={monthlyData}`         | WIRED    | Data flows from `toMonthlyData` result to component prop |
| `monthly-portfolio-chart.tsx`     | `annual-return-chart.tsx`                  | import InsufficientDataMessage        | WIRED    | Single definition, shared across both charts             |

### Data-Flow Trace (Level 4)

| Artifact                              | Data Variable   | Source                               | Produces Real Data                         | Status     |
|---------------------------------------|-----------------|--------------------------------------|--------------------------------------------|------------|
| `charts/page.tsx`                     | `snapshots`     | `getAllSnapshots()` — Drizzle SELECT | Yes — `SELECT` from `portfolio_snapshots`  | FLOWING    |
| `annual-return-chart.tsx`             | `data` prop     | `toAnnualData(snapshots)` pure fn    | Yes — transforms real snapshot rows        | FLOWING    |
| `monthly-portfolio-chart.tsx`         | `data` prop     | `toMonthlyData(snapshots)` pure fn   | Yes — filters + transforms snapshot rows   | FLOWING    |

### Behavioral Spot-Checks

| Behavior                                   | Command                                          | Result         | Status |
|--------------------------------------------|--------------------------------------------------|----------------|--------|
| All 56 tests pass                          | `npx vitest run`                                 | 10 files, 56 tests pass | PASS  |
| Cron route module exports GET              | file read — function `GET` exported at line 36   | Exported       | PASS   |
| No live price calls in charts page         | grep — no price API imports in charts/page.tsx   | 0 matches      | PASS   |
| middleware excludes api/cron               | grep — `api/cron` in matcher exclusion           | Found line 10  | PASS   |

### Requirements Coverage

| Requirement | Description                                                    | Status         | Evidence                                                              |
|-------------|----------------------------------------------------------------|----------------|-----------------------------------------------------------------------|
| CHART-01    | Annual return chart (YoY total asset growth)                   | SATISFIED      | `AnnualReturnChart` + `toAnnualData` implemented and tested           |
| CHART-02    | Monthly chart (rolling 12-month portfolio value)               | SATISFIED      | `MonthlyPortfolioChart` + `toMonthlyData` implemented and tested      |
| CHART-03    | (Roadmap references CHART-03 for Phase 4; not detailed in plan)| NEEDS HUMAN    | Not found in plan specs — may be the snapshot infrastructure requirement |

Note: ROADMAP.md lists requirements CHART-01, CHART-02, CHART-03 for Phase 4. The plan files only explicitly reference CHART-01 and CHART-02. CHART-03 is not described in the requirements document referenced; the four success criteria are all addressed by the implementation.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | -    | -       | -        | -      |

No TODOs, FIXMEs, placeholder returns, or hardcoded empty arrays found in any phase 4 files.

### Human Verification Required

#### 1. Annual Return Chart Renders in Browser

**Test:** Navigate to `/charts` in a running app; confirm the 연간 tab is active by default and the AnnualReturnChart (or InsufficientDataMessage) renders without JavaScript errors
**Expected:** Either a recharts AreaChart with percentage Y-axis and year X-axis labels, or the Korean copy "데이터를 수집하고 있습니다" / "데이터가 충분하지 않습니다"
**Why human:** Recharts renders SVG in the browser; automated checks cannot confirm the chart renders without a running Next.js dev server

#### 2. Monthly Portfolio Chart Renders in Browser

**Test:** Click the 월간 tab on `/charts` and confirm MonthlyPortfolioChart (or InsufficientDataMessage) renders correctly with compact KRW Y-axis labels and YY.MM X-axis ticks
**Expected:** Either a recharts AreaChart with `₩1.5억` style Y-axis labels and `25.04` style X-axis ticks, or the Korean insufficient-data fallback
**Why human:** Same browser rendering constraint as above

#### 3. Live Cron Endpoint Integration

**Test:** With `CRON_SECRET` set in environment, send: `curl -H "Authorization: Bearer {CRON_SECRET}" https://{deployed-host}/api/cron/snapshot`
**Expected:** Response `{"ok":true,"snapshotDate":"YYYY-MM-DD"}` and a new row in `portfolio_snapshots` table in Supabase
**Why human:** Requires live Supabase database connection and deployed Vercel environment; cannot run against production DB from this agent

### Gaps Summary

No gaps found. All four roadmap success criteria are implemented, all key artifacts exist with substantive real implementations, all data flows are wired end-to-end, and all 56 tests pass including the 19 new tests added in this phase (3 cron-snapshot + 1 snapshot-writer + 14 snapshot-aggregation + 1 existing middleware regression for cron exclusion).

The three human verification items are integration/rendering checks that require a running browser or live Vercel environment — they do not indicate missing implementation.

---

_Verified: 2026-04-13T15:38:30Z_
_Verifier: Claude (gsd-verifier)_
