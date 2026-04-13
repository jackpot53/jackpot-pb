---
phase: "03"
plan: "01"
subsystem: price-adapter
tags: [price-api, finnhub, bok-ecos, cache, server-action, tdd]
one_liner: "Server-side Finnhub + BOK ECOS price adapters with TTL+stale-fallback DB cache and refreshAllPrices Server Action"

dependency_graph:
  requires: []
  provides:
    - lib/price/finnhub.ts → fetchFinnhubQuote
    - lib/price/bok-fx.ts → fetchBokFxRate
    - lib/price/cache.ts → refreshPriceIfStale, refreshFxIfStale, getPriceFromCache
    - db/queries/price-cache.ts → getPriceCacheByTicker, upsertPriceCache
    - app/actions/prices.ts → refreshAllPrices (Server Action)
  affects:
    - Plan 03-02: portfolio computation uses getPriceFromCache
    - Plan 03-03/04: dashboard calls refreshAllPrices on load

tech_stack:
  added: []
  patterns:
    - TDD (RED → GREEN cycle)
    - TTL cache with stale fallback (D-01, D-02)
    - Server-side API key isolation (env vars only)
    - Drizzle upsert with onConflictDoUpdate
    - Next.js Server Action with requireUser() auth guard

key_files:
  created:
    - lib/price/finnhub.ts
    - lib/price/bok-fx.ts
    - lib/price/cache.ts
    - db/queries/price-cache.ts
    - app/actions/prices.ts
    - lib/price/__tests__/finnhub.test.ts
    - lib/price/__tests__/bok.test.ts
    - lib/price/__tests__/cache.test.ts
  modified: []

decisions:
  - "bok-fx.ts created in Task 2 instead of Task 3 (Rule 3: cache.ts imports it, needed for tests to resolve)"
  - "Test env vars (FINNHUB_API_KEY, BOK_API_KEY) set to 'test-key' in test files so fetch logic is reachable"
  - "cache.test.ts updated to mock USD_KRW FX response in stale-upsert test (plan omitted second mock)"
  - "PriceCacheRow requires id field; mock return values updated with id: 'test-uuid' for TypeScript compliance"

metrics:
  duration_minutes: 4
  completed_date: "2026-04-13"
  tasks_completed: 3
  tasks_total: 3
  files_created: 8
  files_modified: 0
---

# Phase 03 Plan 01: Price API Adapter Layer Summary

Server-side Finnhub + BOK ECOS price adapters with TTL+stale-fallback DB cache and refreshAllPrices Server Action.

## What Was Built

Three adapter modules and supporting infrastructure for automatic price refreshing:

- **`lib/price/finnhub.ts`** — `fetchFinnhubQuote(ticker)` fetches from Finnhub REST API, returns USD cents (integer) or null. Explicitly guards c=0 (unknown ticker) and non-ok responses.

- **`lib/price/bok-fx.ts`** — `fetchBokFxRate()` fetches USD/KRW daily reference rate from BOK ECOS API (stat code 036Y001, item 0000001). Returns rate × 10000 as integer (e.g. 1356.5 → 13565000) per D-17.

- **`lib/price/cache.ts`** — `refreshPriceIfStale(ticker, assetType)` with 5-minute TTL; `refreshFxIfStale()` with 1-hour TTL. Both implement D-02 stale fallback: if API returns null, existing cache row is preserved unchanged.

- **`db/queries/price-cache.ts`** — `getPriceCacheByTicker` and `upsertPriceCache` Drizzle helpers using `onConflictDoUpdate` on ticker.

- **`app/actions/prices.ts`** — `refreshAllPrices()` Server Action guarded by `requireUser()`. Refreshes FX rate first (needed for USD→KRW conversion), then iterates all LIVE assets sequentially.

## Test Results

11 unit tests across 3 files — all GREEN:
- `finnhub.test.ts`: 3 tests (c > 0 → cents, c = 0 → null, non-ok → null)
- `bok.test.ts`: 3 tests (DATA_VALUE → rate×10000, missing → null, non-ok → null)
- `cache.test.ts`: 5 tests (TTL skip, stale upsert, null stale-fallback × 2 adapters)

TypeScript: `npx tsc --noEmit` exits clean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] bok-fx.ts created in Task 2 instead of Task 3**
- **Found during:** Task 2 (running tests)
- **Issue:** `cache.ts` imports `@/lib/price/bok-fx`. Vite resolves imports even for vi.mocked modules at compile time. cache.test.ts failed with "Failed to resolve import @/lib/price/bok-fx".
- **Fix:** Created `lib/price/bok-fx.ts` during Task 2 alongside `cache.ts`. Full implementation, not a stub.
- **Files modified:** `lib/price/bok-fx.ts` (created early)
- **Commits:** 4f19e9f

**2. [Rule 1 - Bug] Missing FINNHUB_API_KEY/BOK_API_KEY in test environment**
- **Found during:** Task 2 (finnhub test failing)
- **Issue:** `fetchFinnhubQuote` returns null early if `FINNHUB_API_KEY` is not set. Test stubs fetch but didn't set env var, so the function exited before reaching the stubbed fetch.
- **Fix:** Added `process.env.FINNHUB_API_KEY = 'test-key'` to `finnhub.test.ts` and `process.env.BOK_API_KEY = 'test-key'` to `bok.test.ts`.
- **Files modified:** `lib/price/__tests__/finnhub.test.ts`, `lib/price/__tests__/bok.test.ts`
- **Commits:** 4f19e9f

**3. [Rule 1 - Bug] cache.test.ts stale-upsert test missing USD_KRW FX mock**
- **Found during:** Task 2 (test design review)
- **Issue:** The "calls API and upserts when stale" test only mocked one `getPriceCacheByTicker` call (AAPL). The implementation fetches USD_KRW FX rate on a second call for conversion. Without this mock, fxCache was undefined → function returned early without calling upsertPriceCache → test would fail.
- **Fix:** Added `.mockResolvedValueOnce(...)` for USD_KRW FX cache in the stale-upsert test.
- **Files modified:** `lib/price/__tests__/cache.test.ts`
- **Commits:** 4f19e9f

**4. [Rule 1 - Bug] PriceCacheRow mock missing required `id` field**
- **Found during:** Task 3 (TypeScript compile)
- **Issue:** `PriceCacheRow` (inferred from Drizzle schema) requires `id: string`. Test mock objects omitted `id`, causing TypeScript error TS2345 on all 6 mock return values.
- **Fix:** Added `id: 'test-uuid'` (or numbered variants) to all mock objects in `cache.test.ts`.
- **Files modified:** `lib/price/__tests__/cache.test.ts`
- **Commits:** 6e8a151

## Known Stubs

None — all exports are fully implemented.

## Threat Flags

All trust boundaries from the plan's threat model are correctly mitigated:
- `FINNHUB_API_KEY` and `BOK_API_KEY` accessed only in server-side files (`lib/price/`, `app/actions/`)
- `refreshAllPrices` protected by `requireUser()` → redirect to `/login` if unauthenticated
- Finnhub c=0 guard prevents writing zero price to cache
- BOK DATA_VALUE validated with `parseFloat + isNaN + > 0` before storage

No new security surface introduced beyond the plan's threat model.

## Self-Check: PASSED

Files verified:
- lib/price/finnhub.ts: FOUND
- lib/price/bok-fx.ts: FOUND
- lib/price/cache.ts: FOUND
- db/queries/price-cache.ts: FOUND
- app/actions/prices.ts: FOUND
- lib/price/__tests__/finnhub.test.ts: FOUND
- lib/price/__tests__/bok.test.ts: FOUND
- lib/price/__tests__/cache.test.ts: FOUND

Commits verified:
- c679e3b: test(03-01): add failing test scaffolds — FOUND
- 4f19e9f: feat(03-01): implement Finnhub adapter, cache layer... — FOUND
- 6e8a151: feat(03-01): add refreshAllPrices Server Action... — FOUND
