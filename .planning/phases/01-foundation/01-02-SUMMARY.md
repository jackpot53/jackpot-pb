---
phase: 01-foundation
plan: 02
subsystem: database
tags: [drizzle-orm, postgres, supabase, bigint, schema, migration]

# Dependency graph
requires:
  - phase: 01-01
    provides: Next.js scaffold with drizzle-orm and postgres packages installed
provides:
  - "7 Drizzle ORM schema files: assets, transactions, manual-valuations, holdings, price-cache, portfolio-snapshots, goals"
  - "Drizzle db client at db/index.ts exporting `db`"
  - "Generated SQL migration file (db/migrations/0000_sparkling_echo.sql)"
  - "Schema smoke test passing (tests/schema.test.ts)"
affects: [02-assets-crud, 03-price-api, 04-cron, 05-goals]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BIGINT for all monetary columns (KRW in won, no decimals) — D-04"
    - "is_voided boolean soft-delete on transactions instead of DELETE — D-05"
    - "append-only manual_valuations with no updatedAt column — D-06"
    - "quantity stored as units × 10^8 for fractional share/crypto support"
    - "exchange_rate_at_time stored as KRW/USD × 10000 (4 decimal places as integer)"

key-files:
  created:
    - db/index.ts
    - db/schema/assets.ts
    - db/schema/transactions.ts
    - db/schema/manual-valuations.ts
    - db/schema/holdings.ts
    - db/schema/price-cache.ts
    - db/schema/portfolio-snapshots.ts
    - db/schema/goals.ts
    - db/migrations/0000_sparkling_echo.sql
    - db/migrations/meta/0000_snapshot.json
    - db/migrations/meta/_journal.json
  modified: []

key-decisions:
  - "All monetary columns use bigint (not numeric/decimal/float) — D-04 enforced at schema level"
  - "transactions.is_voided pattern: records are never deleted, only voided — D-05"
  - "manual_valuations has no updatedAt column by design — append-only constraint — D-06"
  - "holdings aggregate table predefined in Phase 1 to avoid later migration cost"
  - "portfolio_snapshots predefined in Phase 1 even though Phase 4 cron populates it"
  - "Migration apply deferred to manual step — db.szzrujyuusunbjprehdn.supabase.co DNS not resolving from CI/agent environment"

patterns-established:
  - "Schema-first: all 7 domain tables defined in Phase 1 to front-load migration risk"
  - "BIGINT integers for all money: KRW amounts in won, USD amounts in cents, rates ×10000"
  - "Append-only signal: absence of updatedAt column indicates INSERT-only table"
  - "Soft-delete via is_voided boolean rather than DELETE for financial ledger integrity"

requirements-completed: [AUTH-01, AUTH-02]

# Metrics
duration: 30min
completed: 2026-04-09
---

# Phase 01 Plan 02: Drizzle Schema + Migration Summary

**7-table Drizzle ORM schema with BIGINT money types, is_voided soft-delete, append-only manual valuations, and generated SQL migration file for Supabase PostgreSQL**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-04-09T15:51:00Z
- **Completed:** 2026-04-09T16:19:00Z
- **Tasks:** 2 (Task 1 complete, Task 2 migration generated but not applied)
- **Files modified:** 11

## Accomplishments
- All 7 Drizzle schema files created with correct BIGINT monetary types — no NUMERIC/DECIMAL/FLOAT
- Schema smoke test passes green (`tests/schema.test.ts` — all 7 table symbols export without error)
- SQL migration generated (`db/migrations/0000_sparkling_echo.sql`) covering all 7 tables with correct types, constraints, and foreign keys
- Key domain invariants enforced at schema level: `is_voided` on transactions (D-05), no `updatedAt` on manual_valuations (D-06)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create all 7 Drizzle schema files and db client** - `141c7af` (feat)
2. **Task 2: Generate migration SQL** - `19c678a` (feat)

## Files Created/Modified
- `db/index.ts` - Drizzle client using postgres driver, exports `db`
- `db/schema/assets.ts` - Asset table with `assetTypeEnum` and `priceTypeEnum` pgEnums
- `db/schema/transactions.ts` - Transaction table with `is_voided` (D-05) and `exchange_rate_at_time`
- `db/schema/manual-valuations.ts` - Append-only valuation table (no `updatedAt` — D-06)
- `db/schema/holdings.ts` - Aggregate holdings with `avg_cost_per_unit`, `total_quantity`, `total_cost_krw`
- `db/schema/price-cache.ts` - Price cache with `cached_at` for TTL support
- `db/schema/portfolio-snapshots.ts` - Snapshot table for Phase 4 nightly cron (predefined)
- `db/schema/goals.ts` - Investment goal table with `target_amount_krw`
- `db/migrations/0000_sparkling_echo.sql` - Generated DDL: 7 tables, 3 ENUMs, 3 foreign keys, 15 bigint columns
- `db/migrations/meta/0000_snapshot.json` - Drizzle migration snapshot metadata
- `db/migrations/meta/_journal.json` - Drizzle migration journal

## Decisions Made
- Confirmed `quantity` stored as units × 10^8 (supports 0.5 BTC as 50_000_000, fractional shares)
- `exchange_rate_at_time` stored as KRW/USD × 10000 (e.g. 1300.5678 → 13005678)
- `return_bps` in portfolio_snapshots uses basis points (return% × 10000) for integer storage
- `holdings` uses `unique()` constraint on `asset_id` (one row per asset)
- `price_cache` uses `unique()` constraint on `ticker` (one row per ticker)

## Deviations from Plan

### Migration Application Not Completed

**[Network Gate] db.szzrujyuusunbjprehdn.supabase.co DNS does not resolve from this environment**
- **Found during:** Task 2 (Apply migration)
- **Issue:** The Supabase direct connection hostname `db.<ref>.supabase.co` does not resolve via DNS from this agent environment. The Supabase REST API is reachable (confirming the project exists), but the PostgreSQL port 5432 is inaccessible.
- **Root cause:** This may be a newer Supabase project format where `db.<ref>.supabase.co` is not available; or the agent environment has port 5432 outbound blocked.
- **Action taken:** Migration SQL file generated and committed. Manual application required.
- **Files needed:** `db/migrations/0000_sparkling_echo.sql` (contains complete DDL)

### Manual Step Required

To apply the migration to Supabase, run from your local machine:

```bash
# Option 1: drizzle-kit migrate (from project root with .env.local loaded)
npx drizzle-kit migrate

# Option 2: Supabase Dashboard → SQL Editor → paste contents of:
# db/migrations/0000_sparkling_echo.sql
# (replace "--> statement-breakpoint" with newlines before pasting)
```

After applying, verify in Supabase Table Editor that all 7 tables appear: `assets`, `transactions`, `manual_valuations`, `holdings`, `price_cache`, `portfolio_snapshots`, `goals`.

---

**Total deviations:** 1 (migration application blocked by DNS/network gate)
**Impact on plan:** Schema generation complete. Tables in Supabase not yet created — requires manual step from local environment.

## Issues Encountered
- `npx drizzle-kit migrate` requires `DATABASE_URL` from `.env.local` — must use `export $(cat .env.local | xargs)` prefix or configure dotenv support in drizzle.config.ts
- Supabase direct connection hostname DNS not resolving from agent environment

## Known Stubs
None — no UI components or data-rendering code created in this plan.

## Threat Flags
None — no new network endpoints or auth paths introduced. `db/index.ts` is server-only (no `'use client'` component can import it without Next.js build error).

## User Setup Required

**Manual migration application needed:**

1. From your local machine (where `db.szzrujyuusunbjprehdn.supabase.co` resolves):
   ```bash
   cd /path/to/jackpot-pb
   npx drizzle-kit migrate
   ```
   OR

2. Via Supabase Dashboard SQL Editor — paste the contents of `db/migrations/0000_sparkling_echo.sql` (remove the `--> statement-breakpoint` markers first).

3. Verify in Supabase → Table Editor: all 7 tables should appear.

## Next Phase Readiness
- Schema definitions complete and test-verified — Plan 03 (Auth) can proceed immediately
- Migration application to Supabase required before Plan 03 auth tests against the DB
- All 7 domain tables pre-defined: no schema changes expected through Phase 5

---
*Phase: 01-foundation*
*Completed: 2026-04-09*
