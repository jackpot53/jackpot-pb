---
phase: 02-asset-transaction-management
plan: "02"
subsystem: holdings-computation
tags: [tdd, wavg, pure-function, financial-arithmetic]
dependency_graph:
  requires: []
  provides: [computeHoldings, upsertHoldings]
  affects: [02-03-transactions-server-actions]
tech_stack:
  added: []
  patterns: [weighted-average-cost-basis, integer-arithmetic, tdd-red-green]
key_files:
  created:
    - lib/holdings.ts
    - tests/holdings.test.ts
  modified: []
decisions:
  - "Math.round applied only at division boundary to preserve integer precision throughout WAVG calculation"
  - "Sell transactions leave avgCostPerUnit unchanged — matches Korean brokerage WAVG convention"
  - "upsertHoldings uses full re-read + recompute (not incremental) — acceptable for single-user app with small transaction counts"
  - "upsertHoldings is NOT unit tested — it is integration-tested manually via Plan 02-03"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-10"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 02 Plan 02: WAVG Holdings Computation (TDD) Summary

**One-liner:** Integer-safe WAVG pure function with full TDD coverage — 8 unit tests covering all edge cases including partial sell, buy-after-sell, and void exclusion.

## What Was Built

`lib/holdings.ts` implements the weighted average cost basis (WAVG) computation core:

- `computeHoldings(txns: TransactionInput[]): HoldingsResult` — pure function, no side effects, no DB access
- `upsertHoldings(assetId: string): Promise<void>` — DB write helper that reads transactions, calls computeHoldings, and upserts the holdings row
- `TransactionInput` and `HoldingsResult` interfaces exported for Plan 02-03 to use

`tests/holdings.test.ts` covers 8 edge cases with full TDD discipline (RED → GREEN).

## TDD Execution

**RED phase (Task 1):** Created test file with 8 failing tests. All failed with "Cannot find module '@/lib/holdings'" — confirmed RED.

**GREEN phase (Task 2):** Implemented `lib/holdings.ts`. All 8 tests pass — confirmed GREEN. No refactor needed; implementation was clean on first pass.

## Arithmetic Design

All calculations use integer-safe math:

- WAVG on buy: `Math.round((prevAvg * prevQty + newPrice * newQty) / (prevQty + newQty))`
- Sell cost deduction: `Math.round((qty / 1e8) * avgCostPerUnit)`
- `Math.round` applied only at the final division — no intermediate floating-point values

## Test Cases

| # | Case | Result |
|---|------|--------|
| 1 | Empty array | `{0, 0, 0}` |
| 2 | Single buy, no fee | qty=1e8, avg=50000, cost=50000 |
| 3 | Single buy, with fee | qty=1e8, avg=50000, cost=50500 |
| 4 | Two buys WAVG | qty=2e8, avg=55000, cost=110000 |
| 5 | Partial sell | qty=1.5e8, avg=55000 (unchanged), cost=82500 |
| 6 | Buy after sell | qty=1e8, avg=110000, cost=110000 |
| 7 | All voided | `{0, 0, 0}` |
| 8 | Mixed void | Only non-voided buy counted |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — `lib/holdings.ts` is fully functional. `upsertHoldings` makes live DB calls but is not stubbed; it requires a real Supabase connection (tested manually via Plan 02-03).

## Threat Surface

No new network endpoints, auth paths, or file access patterns introduced. `computeHoldings` is a pure function with no external surface. `upsertHoldings` accesses PostgreSQL via Drizzle parameterized queries — covered by T-02-02-T in the plan's threat model.

## Self-Check: PASSED

- [x] `lib/holdings.ts` exists
- [x] `tests/holdings.test.ts` exists
- [x] Commit `539edcd` (test RED) exists
- [x] Commit `39df3ee` (feat GREEN) exists
- [x] 8 tests pass: `npm test -- tests/holdings.test.ts` exits 0
