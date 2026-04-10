---
phase: 01-foundation
fixed_at: 2026-04-10T00:00:00Z
review_path: .planning/phases/01-foundation/01-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 5
skipped: 1
status: partial
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-04-10T00:00:00Z
**Source review:** .planning/phases/01-foundation/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (CR-01, CR-02, WR-01, WR-02, WR-03, WR-04)
- Fixed: 5
- Skipped: 1

## Fixed Issues

### CR-01: Open Redirect via Unvalidated `redirectPath`

**Files modified:** `app/login/actions.ts`
**Commit:** bcd2d47
**Applied fix:** Added `safeRedirectPath()` guard function that rejects paths not starting with `/` or starting with `//` (protocol-relative URLs), falling back to `/`. The `signIn` server action now calls `redirect(safeRedirectPath(redirectPath))` instead of `redirect(redirectPath)` directly.

---

### CR-02: Unconstrained Postgres Connection Pool in Serverless Context

**Files modified:** `db/index.ts`
**Commit:** 1507004
**Applied fix:** Added `max: 1`, `idle_timeout: 20`, `connect_timeout: 10` options to the `postgres()` call, limiting each serverless function instance to a single connection and preventing pool exhaustion under concurrent invocations.

---

### WR-01: `signOut` Silently Ignores Supabase Errors

**Files modified:** `app/actions/auth.ts`
**Commit:** 503b6ed
**Applied fix:** Destructured the return value of `supabase.auth.signOut()` to capture `error`, added a `console.error` log when an error is present. The `redirect('/login')` still runs unconditionally so the user is never stuck on a broken state.

---

### WR-03: `currency` Column Has No Enum Constraint

**Files modified:** `db/schema/assets.ts`, `db/schema/transactions.ts`, `db/schema/manual-valuations.ts`, `db/schema/price-cache.ts`, `db/migrations/0001_currency_enum.sql`
**Commit:** acddc9a
**Applied fix:** Defined `currencyEnum = pgEnum('currency', ['KRW', 'USD'])` in `assets.ts` and exported it. Replaced all four `varchar('currency', { length: 3 })` columns with `currencyEnum('currency')`. Added migration `0001_currency_enum.sql` that creates the `currency` enum type and `ALTER COLUMN ... TYPE` with `USING` casts for all four tables.

---

### WR-04: `goals.updatedAt` Will Not Auto-Update on Row Modification

**Files modified:** `db/schema/goals.ts`
**Commit:** 6bfb0d4
**Applied fix:** Added `.$onUpdate(() => new Date())` to the `updatedAt` column definition. This is a Drizzle ORM-level hook — it fires whenever Drizzle executes an UPDATE on this table, ensuring the column reflects the actual modification time. No SQL migration is required since the database column definition is unchanged; only the ORM behavior is updated.

---

## Skipped Issues

### WR-02: `bigint` Columns in `number` Mode Risk Silent Precision Loss Above 2^53

**File:** `db/schema/transactions.ts:11-13`, `db/schema/holdings.ts:10-14`, `db/schema/portfolio-snapshots.ts:8-9`
**Reason:** This fix requires a cross-cutting design decision: switching all monetary bigint columns to `mode: 'bigint'` and updating all application-layer arithmetic to use `BigInt` operators. No application-layer arithmetic code exists yet in Phase 1, so the full scope of the change cannot be assessed cleanly. The reviewer offered "document the ceiling and add a runtime assertion" as an equally valid alternative. For a single-user personal asset tracker targeting KRW values, 2^53 (≈ 9 × 10^15) provides sufficient headroom for realistic portfolio sizes. Recommend the team make a deliberate decision before Phase 3 (price API integration) when arithmetic code will be written.
**Original issue:** All monetary columns use `bigint({ mode: 'number' })` which risks silent precision loss for values above `Number.MAX_SAFE_INTEGER` (2^53 − 1).

---

_Fixed: 2026-04-10T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
