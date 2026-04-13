---
phase: 04-history-charts
plan: "01"
subsystem: cron-infrastructure
tags: [cron, snapshot, tdd, vitest, vercel, middleware]
dependency_graph:
  requires:
    - db/schema/portfolio-snapshots.ts
    - lib/price/cache.ts
    - db/queries/assets-with-holdings.ts
    - db/queries/price-cache.ts
    - lib/portfolio/portfolio.ts
  provides:
    - lib/snapshot/writer.ts (writePortfolioSnapshot)
    - app/api/cron/snapshot/route.ts (GET handler)
  affects:
    - middleware.ts (added api/cron exclusion)
    - vercel.json (added cron schedule)
    - .env.local.example (added CRON_SECRET documentation)
tech_stack:
  added: []
  patterns:
    - Vercel Cron Route Handler with CRON_SECRET Bearer token auth
    - Drizzle onConflictDoNothing for idempotent upsert
    - Middleware exclusion for unauthenticated cron routes
    - TDD RED/GREEN: tests committed before implementation
key_files:
  created:
    - tests/cron-snapshot.test.ts
    - tests/snapshot-writer.test.ts
    - lib/snapshot/writer.ts
    - app/api/cron/snapshot/route.ts
  modified:
    - middleware.ts
    - vercel.json
    - .env.local.example
decisions:
  - "Cron route calls portfolio assembly logic directly (getAssetsWithHoldings + getPriceCacheByTickers + computePortfolio) instead of calling refreshAllPrices() which would call requireUser() and redirect to /login"
  - "Tests mocked getAssetsWithHoldings and getPriceCacheByTickers to prevent DB calls in unit tests"
  - "No stub zeros in route — actual portfolio computation wired end-to-end from Task 2 onward"
metrics:
  duration_seconds: 101
  completed_date: "2026-04-13"
  tasks_completed: 2
  files_changed: 7
---

# Phase 04 Plan 01: Nightly Cron Infrastructure Summary

**One-liner:** Vercel Cron pipeline with CRON_SECRET auth, idempotent Drizzle snapshot upsert, and full portfolio computation via direct DB queries bypassing Supabase session.

## What Was Built

### Task 1 — TDD RED: Failing Tests
Two test files written before implementation:
- `tests/cron-snapshot.test.ts`: Three tests covering 401 (missing header), 401 (wrong token), 200 (correct token) for the cron route
- `tests/snapshot-writer.test.ts`: One test verifying `writePortfolioSnapshot` calls `db.insert().values().onConflictDoNothing()` with correct params

Both files failed at RED phase with "module not found" confirming correct TDD workflow.

### Task 2 — Implementation (TDD GREEN)
Four files created/modified to make all tests green:

**`lib/snapshot/writer.ts`**
- Exports `writePortfolioSnapshot(params: SnapshotParams): Promise<void>`
- Calls `db.insert(portfolioSnapshots).values(params).onConflictDoNothing()`
- Handles Vercel's at-least-once delivery guarantee safely

**`app/api/cron/snapshot/route.ts`**
- Exports `GET(request: NextRequest)`
- Security: `!process.env.CRON_SECRET || authHeader !== Bearer ${secret}` → 401 (fail-closed per T-04-01, T-04-02)
- Refreshes FX rate and all LIVE asset prices via `refreshFxIfStale` + `Promise.allSettled(refreshPriceIfStale...)` with stale fallback (D-03)
- Assembles portfolio without Supabase session: `getAssetsWithHoldings()` + `getPriceCacheByTickers()` + `computePortfolio()`
- Writes snapshot with `returnBps = Math.round((returnPct / 100) * 10000)`
- UTC date used for `snapshotDate` (consistent with 00:00 UTC execution time)

**`middleware.ts`**
- Added `api/cron` to the regex exclusion group in the matcher
- Prevents Supabase `updateSession` from redirecting Vercel's unauthenticated GET to `/login`

**`vercel.json`**
- Added `{"path": "/api/cron/snapshot", "schedule": "0 0 * * *"}` (D-01, D-02)

## Verification

```
Test Files  9 passed (9)
Tests       42 passed (42)
```

All existing tests (holdings, middleware, schema, portfolio, etc.) remain green. New tests (cron-snapshot, snapshot-writer) pass.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written with one clarification:

The plan's `tests/cron-snapshot.test.ts` template mocked `@/db` with a basic object and expected the route to call `db.select().from().where()` directly. The actual route implementation imports `getAssetsWithHoldings` from `@/db/queries/assets-with-holdings`, so the test mocks were adjusted to mock that module instead. This keeps tests decoupled from internal DB call patterns while still verifying the auth behavior the tests are designed for.

## Known Stubs

None. The route computes actual `totalValueKrw`, `totalCostKrw`, and `returnBps` from the live portfolio state. No hardcoded placeholder values remain.

## Threat Flags

No new security surface beyond what was planned:
- T-04-01: Mitigated — `CRON_SECRET` header check implemented and tested
- T-04-02: Mitigated — fail-closed guard `!process.env.CRON_SECRET` implemented
- T-04-04: Accepted — `onConflictDoNothing()` confirmed in implementation and tested

## Self-Check: PASSED

- [x] `tests/cron-snapshot.test.ts` — exists, 3 tests pass
- [x] `tests/snapshot-writer.test.ts` — exists, 1 test passes
- [x] `lib/snapshot/writer.ts` — exists, exports `writePortfolioSnapshot`
- [x] `app/api/cron/snapshot/route.ts` — exists, exports `GET`, contains CRON_SECRET guard
- [x] `middleware.ts` — contains `api/cron` in exclusion pattern
- [x] `vercel.json` — contains `"path": "/api/cron/snapshot"` and `"schedule": "0 0 * * *"`
- [x] `604b447`: test(04-01): add failing tests for cron auth and snapshot idempotency
- [x] `80886e8`: feat(04-01): implement snapshot writer, cron route, middleware exclusion, vercel.json schedule
