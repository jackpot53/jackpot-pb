---
phase: "03"
plan: "02"
subsystem: portfolio-computation
tags: [portfolio, computation, tdd, drizzle, query-helpers, math, formatting]
one_liner: "Pure portfolio computation library (D-15/D-16/D-17 math) with TDD coverage and Drizzle query helpers for holdings + latest manual valuation"

dependency_graph:
  requires:
    - Plan 03-01: db/queries/price-cache.ts → PriceCacheRow type used in AssetHoldingInput context
    - db/schema/assets.ts → assetTypeEnum, priceTypeEnum
    - db/schema/holdings.ts → holdings table
    - db/schema/manual-valuations.ts → manual_valuations table
  provides:
    - lib/portfolio/portfolio.ts → computeAssetPerformance, computePortfolio, aggregateByType, formatKrw, formatUsd, formatReturn, formatQty
    - lib/portfolio.ts → re-export barrel for @/lib/portfolio alias
    - db/queries/holdings.ts → getHoldingByAssetId, HoldingRow
    - db/queries/assets-with-holdings.ts → getAssetsWithHoldings, AssetWithHolding
  affects:
    - Plan 03-03/04: dashboard Server Component calls getAssetsWithHoldings() + computePortfolio()

tech_stack:
  added: []
  patterns:
    - TDD (RED → GREEN cycle, 14 tests)
    - Pure function design (no DB calls in computation layer)
    - Drizzle correlated subquery via sql`` template literal
    - Divide-by-zero guards (T-03-02-T, T-03-02-T2 threat mitigations)
    - Intl.NumberFormat for locale-aware currency formatting

key_files:
  created:
    - lib/portfolio/portfolio.ts
    - lib/portfolio.ts
    - lib/portfolio/__tests__/compute.test.ts
    - db/queries/holdings.ts
    - db/queries/assets-with-holdings.ts
  modified: []

decisions:
  - "lib/portfolio/portfolio.ts at submodule path so test import '../portfolio' resolves correctly from __tests__/"
  - "lib/portfolio.ts barrel re-export added so @/lib/portfolio alias works from dashboard Server Component"
  - "getAssetsWithHoldings uses correlated SQL subquery (not lateral join) for latest manual valuation — Drizzle does not expose DISTINCT ON in simple API"

metrics:
  duration_minutes: 6
  completed_date: "2026-04-13"
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 0
---

# Phase 03 Plan 02: Portfolio Computation Library Summary

Pure portfolio computation library (D-15/D-16/D-17 math) with TDD coverage and Drizzle query helpers for holdings + latest manual valuation.

## What Was Built

### Task 1: TDD — computeAssetPerformance, computePortfolio, aggregateByType (RED → GREEN)

**`lib/portfolio/portfolio.ts`** — Core computation functions:
- `computeAssetPerformance` — D-15: `currentValueKrw = (totalQuantity / 1e8) × priceKrw` for LIVE assets; D-16: uses `latestManualValuationKrw` directly for MANUAL assets. Divide-by-zero guard: `returnPct = 0` when `totalCostKrw = 0`.
- `computePortfolio` — Aggregates all assets to portfolio totals. D-17: `totalValueUsd = totalValueKrw / (fxRateInt / 10000)`. Guard: `totalValueUsd = 0` when `fxRate = 0`.
- `aggregateByType` — Groups `AssetPerformance[]` by `assetType`, sums `currentValueKrw`, computes `sharePct` per type.
- `formatKrw` — Intl.NumberFormat ko-KR, currency KRW, 0 decimals.
- `formatUsd` — Intl.NumberFormat en-US, currency USD, 2 decimals.
- `formatReturn` — `+N.N%` / `-N.N%` / `0.0%` with mandatory sign and 1 decimal.
- `formatQty` — Non-crypto: integer display; crypto: up to 8 decimals, trailing zeros stripped.

**`lib/portfolio.ts`** — Barrel re-export so dashboard can `import { computePortfolio } from '@/lib/portfolio'`.

**`lib/portfolio/__tests__/compute.test.ts`** — 14 tests covering all computation paths and formatting edge cases.

### Task 2: Drizzle Query Helpers

**`db/queries/holdings.ts`** — `getHoldingByAssetId(assetId)` → `HoldingRow | null`. Fetches a single holdings aggregate row by `asset_id`.

**`db/queries/assets-with-holdings.ts`** — `getAssetsWithHoldings()` → `AssetWithHolding[]`. Inner join of `assets` + `holdings` with a correlated subquery returning `latestManualValuationKrw` (latest `value_krw` ordered by `valued_at DESC, created_at DESC`). Assets without a holdings row are excluded.

## Test Results

14 unit tests — all GREEN (TDD cycle completed):
- `computeAssetPerformance`: 3 tests (LIVE valuation, MANUAL valuation D-16, zero-cost guard)
- `computePortfolio`: 3 tests (totalValueKrw, totalValueUsd D-17, gainLossKrw + returnPct)
- `aggregateByType`: 1 test (grouping + sharePct)
- `formatKrw`: 2 tests
- `formatReturn`: 3 tests (positive, negative, zero)
- `formatQty`: 2 tests (non-crypto, crypto)

TypeScript: `npx tsc --noEmit` exits clean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] lib/portfolio/portfolio.ts path adjusted to match test import resolution**
- **Found during:** Task 1 RED phase
- **Issue:** Plan specified artifact at `lib/portfolio.ts` but test file at `lib/portfolio/__tests__/compute.test.ts` imports `'../portfolio'` — which resolves to `lib/portfolio/portfolio.ts`, not `lib/portfolio.ts`.
- **Fix:** Created `lib/portfolio/portfolio.ts` (main implementation) + `lib/portfolio.ts` (barrel re-export). Both paths work: tests import from `../portfolio`, dashboard will import from `@/lib/portfolio`.
- **Files modified:** `lib/portfolio/portfolio.ts` (created), `lib/portfolio.ts` (created as re-export)
- **Commits:** 70de768

## Known Stubs

None — all exports are fully implemented.

## Threat Flags

All threat model mitigations from the plan are correctly applied:
- **T-03-02-T** (Tampering — divide by zero in `computeAssetPerformance`): `totalCostKrw > 0` guard, returns `returnPct = 0` when zero cost basis.
- **T-03-02-T2** (Tampering — fxRateInt = 0): `fxRate > 0` guard in `computePortfolio`, returns `totalValueUsd = 0`.
- **T-03-02-T3** (Tampering — SQL injection): Drizzle `sql\`\`` template with `${assets.id}` parameterization, no user-controlled string interpolation.
- **T-03-02-I** (Information Disclosure): `getAssetsWithHoldings` is server-side only, consumed by Server Component.

No new security surface introduced beyond the plan's threat model.

## Self-Check: PASSED

Files verified:
- lib/portfolio/portfolio.ts: FOUND
- lib/portfolio.ts: FOUND
- lib/portfolio/__tests__/compute.test.ts: FOUND
- db/queries/holdings.ts: FOUND
- db/queries/assets-with-holdings.ts: FOUND

Commits verified:
- 70de768: feat(03-02): portfolio computation library with full test coverage — FOUND
- baad2b7: feat(03-02): Drizzle query helpers for holdings and assets-with-holdings — FOUND
