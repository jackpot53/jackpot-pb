---
phase: 01-foundation
reviewed: 2026-04-09T00:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - app/actions/auth.ts
  - app/login/actions.ts
  - app/login/page.tsx
  - app/page.tsx
  - app/layout.tsx
  - middleware.ts
  - utils/supabase/client.ts
  - utils/supabase/middleware.ts
  - utils/supabase/server.ts
  - db/index.ts
  - db/schema/assets.ts
  - db/schema/transactions.ts
  - db/schema/manual-valuations.ts
  - db/schema/holdings.ts
  - db/schema/price-cache.ts
  - db/schema/portfolio-snapshots.ts
  - db/schema/goals.ts
  - db/migrations/0000_sparkling_echo.sql
  - drizzle.config.ts
  - vitest.config.ts
  - tests/middleware.test.ts
  - tests/schema.test.ts
  - next.config.ts
  - package.json
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-09T00:00:00Z
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

Phase 1 establishes the authentication layer (Supabase SSR), database schema (7 Drizzle/Postgres tables), and basic Next.js scaffolding. The overall structure is sound: the middleware correctly uses `getUser()` instead of `getSession()`, the schema design is disciplined (fixed-point integers for money, append-only patterns documented), and the login form has proper accessibility attributes.

Two critical issues require attention before shipping: an open redirect vulnerability in the login flow accepts an arbitrary `redirectPath` from the URL without validation, and the `db/index.ts` singleton creates a new connection pool on every module evaluation in serverless environments. Four warnings address missing sign-out error handling, a `bigint`/`number` overflow risk for large financial values, an unvalidated currency field, and missing `$onUpdate` for `goals.updatedAt`. Three informational items round out minor style concerns.

## Critical Issues

### CR-01: Open Redirect via Unvalidated `redirectPath`

**File:** `app/login/page.tsx:30` and `app/login/actions.ts:5`

**Issue:** The login page reads `?redirect=` from `useSearchParams()` and passes the raw value directly to the server action, which then calls `redirect(redirectPath)`. No validation is performed to ensure the path is relative (i.e., starts with `/` and has no protocol). An attacker can craft a URL such as `/login?redirect=https://evil.example.com` and after successful authentication Next.js will redirect the user to an external domain. `next/navigation`'s `redirect()` will follow the value literally if it is an absolute URL.

**Fix:**

```ts
// app/login/actions.ts — sanitize before redirect
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

function safeRedirectPath(path: string): string {
  // Allow only relative paths that start with /
  if (!path.startsWith('/') || path.startsWith('//')) return '/'
  return path
}

export async function signIn(email: string, password: string, redirectPath: string = '/') {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: error.message }
  }
  redirect(safeRedirectPath(redirectPath))
}
```

---

### CR-02: Unconstrained Postgres Connection Pool in Serverless Context

**File:** `db/index.ts:4`

**Issue:** `postgres(process.env.DATABASE_URL!)` is called at module scope with default settings (10 connections per pool). In a serverless/edge environment (Vercel Functions), each cold-start creates a new pool that is never explicitly closed, exhausting Postgres `max_connections` rapidly under any real load. This causes runtime connection errors that are difficult to diagnose.

**Fix:**

```ts
// db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

// Limit pool size for serverless: each function instance gets at most 1 connection.
// Use a connection string with pgbouncer=true if Supabase Transaction Mode is enabled.
const client = postgres(process.env.DATABASE_URL!, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle({ client })
```

---

## Warnings

### WR-01: `signOut` Silently Ignores Supabase Errors

**File:** `app/actions/auth.ts:7`

**Issue:** `supabase.auth.signOut()` can return an error (e.g., network failure, revoked token). The error is discarded. The `redirect('/login')` still runs, so the client-side session cookie may not have been cleared properly, leaving a stale session that the middleware will later invalidate — but this is confusing and potentially leaves server-side state dirty.

**Fix:**

```ts
export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) {
    // Log for observability; still redirect so the user is not stuck.
    console.error('[signOut] Supabase error:', error.message)
  }
  redirect('/login')
}
```

---

### WR-02: `bigint` Columns in `number` Mode Risk Silent Precision Loss Above 2^53

**File:** `db/schema/transactions.ts:11-13`, `db/schema/holdings.ts:10-14`, `db/schema/portfolio-snapshots.ts:8-9`

**Issue:** All monetary columns use `bigint('...', { mode: 'number' })`. JavaScript `number` (IEEE 754 double) can only represent integers exactly up to `Number.MAX_SAFE_INTEGER` (2^53 − 1 ≈ 9 × 10^15). A portfolio value of 9 × 10^15 KRW is roughly $6.5B USD — unlikely for a personal tracker, but the `totalCostKrw` in `holdings` sums all buy transactions, and `pricePerUnit` is stored as KRW × 10^8 scale. A single real-estate asset worth ₩5B stored as `500_000_000_000_000` (5 × 10^14) is still within range, but leaves very little headroom when multiplied by quantities. Use `mode: 'bigint'` and handle values as `BigInt` in application code, or document the accepted maximum value per column with a runtime guard.

**Fix (minimal):** Switch to `mode: 'bigint'` on all monetary BIGINT columns and update application-layer arithmetic to use `BigInt` operators. Alternatively, explicitly document the ceiling and add a runtime assertion when inserting.

---

### WR-03: `currency` Column Has No Enum Constraint — Accepts Arbitrary Strings

**File:** `db/schema/assets.ts:15`, `db/schema/transactions.ts:15`, `db/schema/manual-valuations.ts:10`, `db/schema/price-cache.ts:12`

**Issue:** All four tables store `currency` as `varchar(3)` with a comment stating `'KRW' or 'USD'`, but no database-level constraint enforces this. Any application bug (or direct DB access) could insert `'EUR'`, `'JPY'`, or garbage, silently corrupting conversion logic later. Since the system explicitly only supports KRW and USD (per the architecture decisions), this should be a `pgEnum`.

**Fix:**

```ts
// db/schema/assets.ts
export const currencyEnum = pgEnum('currency', ['KRW', 'USD'])

// Then replace varchar currency columns:
currency: currencyEnum('currency').notNull(),
```

Add a migration after updating all four schema files that also drops the old `varchar` column and adds the enum-typed column (or uses `ALTER COLUMN ... TYPE` with a `USING` cast).

---

### WR-04: `goals.updatedAt` Will Not Auto-Update on Row Modification

**File:** `db/schema/goals.ts:11`

**Issue:** `updatedAt` uses `.defaultNow()`, which sets the value only at INSERT time. Drizzle ORM does not automatically update this column on UPDATE. Without `$onUpdate(() => new Date())`, `updatedAt` will permanently show the creation time regardless of subsequent edits, making audit trails and change detection unreliable.

**Fix:**

```ts
import { pgTable, uuid, varchar, bigint, date, timestamp, sql } from 'drizzle-orm/pg-core'

updatedAt: timestamp('updated_at', { withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date()),
```

Note: this requires generating a new migration (`drizzle-kit generate`) since the SQL default alone is insufficient for ORM-level tracking.

---

## Info

### IN-01: Non-Null Assertion (`!`) on All Environment Variables Without Runtime Guard

**File:** `db/index.ts:4`, `utils/supabase/client.ts:4-5`, `utils/supabase/middleware.ts:8-9`, `utils/supabase/server.ts:8-9`, `drizzle.config.ts:8`

**Issue:** Every env-var access uses the `!` non-null assertion to suppress TypeScript's undefined check. If these variables are missing (e.g., in CI, local dev without `.env.local`, or a misconfigured deployment), the error will surface as a cryptic runtime failure rather than a clear startup error.

**Suggestion:** Add a startup validation module that checks required env vars and throws a descriptive error at boot:

```ts
// utils/env.ts
const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'DATABASE_URL']
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`)
}
```

---

### IN-02: Middleware Test Module Isolation May Produce Stale Mock State

**File:** `tests/middleware.test.ts:33`

**Issue:** Each `it` block calls `await import('@/utils/supabase/middleware')` inside the test body. Because Vitest (and Node) cache module imports, the first call resolves and caches the module; subsequent calls return the cached module regardless of `vi.clearAllMocks()`. This means the mock set in a later `it` block may not be in effect for the `updateSession` function if the import was already resolved in a prior test. The tests happen to pass because the mock is set before the `import` in each test body, but the shared module reference means this is fragile. Moving the import to the top of the file (outside `it` blocks) and using `vi.resetModules()` in `beforeEach` is the robust pattern.

**Suggestion:**

```ts
beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

it('redirects unauthenticated user', async () => {
  vi.mocked(createServerClient).mockReturnValue(/* ... */)
  const { updateSession } = await import('@/utils/supabase/middleware')
  // ...
})
```

---

### IN-03: `eslint-disable` Comment at Top of Test File Without Scope Justification

**File:** `tests/middleware.test.ts:1`

**Issue:** `/* eslint-disable @typescript-eslint/no-explicit-any */` disables the rule for the entire file. The `any` casts are limited to mock return values on lines 26-31, 44-48, 61-64, and 79-83. Scoping the disable to only those lines avoids accidentally suppressing future real `any` usage in the file.

**Suggestion:** Replace the file-level disable with inline `// eslint-disable-next-line @typescript-eslint/no-explicit-any` on each cast site.

---

_Reviewed: 2026-04-09T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
