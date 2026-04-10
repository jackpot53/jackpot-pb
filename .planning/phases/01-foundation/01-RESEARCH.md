# Phase 1: Foundation - Research

**Researched:** 2026-04-09
**Domain:** Next.js 16 + Supabase Auth (SSR) + Drizzle ORM (PostgreSQL) + Tailwind v4 + shadcn/ui
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Deploy to Vercel. Optimized for Next.js App Router, automatic CI built-in.
- **D-02:** Phase 4 nightly cron job via Vercel Cron Jobs (`vercel.json` config).
- **D-03:** Drizzle ORM + Supabase PostgreSQL. Supabase SDK used for Auth only; DB queries go through Drizzle.
- **D-04:** All monetary amounts stored as BIGINT (KRW in won, no decimals). Forces integer storage to prevent floating-point errors.
- **D-05:** `is_voided` boolean column on Transaction table — soft-delete / void pattern instead of DELETE.
- **D-06:** ManualValuation is append-only (insert only, no updates) — preserves historical records.
- **D-07:** Full-page `/login` route. shadcn Card component centered on screen with email/password form.
- **D-08:** Unauthenticated requests redirect to `/login`. After login, redirect to original requested page.
- **D-09:** Use cloud Supabase project directly. No local Supabase CLI.
- **D-10:** `.env.local` manages: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (direct PostgreSQL connection for Drizzle).

### Claude's Discretion

- shadcn/ui component theme selection (start with default theme)
- ESLint/Prettier configuration details
- Drizzle schema file structure (`db/schema/` directory recommended)
- Loading skeleton and error state design

### Deferred Ideas (OUT OF SCOPE)

- Password reset email — v2 requirement (AUTH-V2-01)
- OAuth login — v2 requirement (AUTH-V2-02)
- Supabase Row Level Security (RLS) — server-side validation is sufficient for single user; complexity not needed
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can log in with email/password and remain logged in across multiple browser sessions and devices | Supabase Auth with `@supabase/ssr` handles persistent cookie-based sessions. `createServerClient` in middleware refreshes tokens on each request. `getUser()` validates session server-side. |
| AUTH-02 | User can log out from any page and their session is immediately invalidated | `supabase.auth.signOut()` in a Server Action or Route Handler invalidates the session server-side. Middleware running on every route enforces the invalidation immediately. |
</phase_requirements>

---

## Summary

Phase 1 establishes a greenfield Next.js 16 App Router project deployed to Vercel with Supabase as the backend. The critical architectural choice is using **Supabase Auth** (via `@supabase/ssr`) for session management while using **Drizzle ORM** for all database queries — the two concerns are explicitly separated. Authentication uses cookie-based sessions that persist across devices because Supabase stores session tokens in HTTP-only cookies managed by Next.js middleware.

The database schema must be defined completely in Phase 1 across all 7 tables (Asset, Transaction, ManualValuation, Holdings, PriceCache, PortfolioSnapshot, Goal) even though only authentication routes are functional at the end of this phase. This is a deliberate decision to avoid costly migrations later — establishing BIGINT money types, `is_voided` flags, and `exchange_rate_at_time` columns from day one is far cheaper than retrofitting them.

The `@supabase/ssr` 0.10.0 package is the current standard for Next.js App Router Supabase integration. The `@supabase/auth-helpers-nextjs` package is deprecated and must not be used. The middleware pattern using `getUser()` (not `getSession()`) is the security-correct approach for server-side token refresh.

**Primary recommendation:** Scaffold with `create-next-app`, initialize shadcn/ui immediately, add `@supabase/supabase-js` + `@supabase/ssr`, configure Drizzle with the `postgres` driver pointing at Supabase's direct connection string. Implement middleware auth protection before any schema work.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.3 | Framework — App Router, SSR, middleware, route handlers | Latest stable; App Router is the standard for all new Next.js projects |
| typescript | 5.8.x (bundled) | Type safety | Non-negotiable for financial data |
| tailwindcss | 4.2.2 | Styling | v4 is current stable; v3 is LTS-only |
| shadcn (CLI) | 4.2.0 | UI component primitives | Locked by D-07; built for Tailwind v4 as of 4.x |
| @supabase/supabase-js | 2.102.1 | Supabase Auth SDK | Official Supabase client; Auth-only use per D-03 |
| @supabase/ssr | 0.10.0 | SSR-safe Supabase clients for Next.js | Official successor to deprecated auth-helpers; required for cookie-based sessions |
| drizzle-orm | 0.45.2 | Type-safe ORM for PostgreSQL | Locked by D-03; thin SQL abstraction with compile-time type inference |
| drizzle-kit | 0.31.10 | Schema migration CLI | Companion to drizzle-orm; generates and applies migrations |
| postgres | 3.4.9 | PostgreSQL driver for Drizzle | Official Drizzle-recommended driver for Supabase PostgreSQL |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form | 7.72.1 | Form state management | Login form (email/password fields) |
| zod | 4.3.6 | Schema validation | Login form validation + API route input validation |
| @hookform/resolvers | 5.2.2 | react-hook-form ↔ Zod bridge | Required when using Zod with react-hook-form |
| lucide-react | bundled via shadcn | Icons | Loading spinner on submit button; bundled automatically with shadcn init |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/ssr | @supabase/auth-helpers-nextjs | auth-helpers is deprecated — do not use |
| postgres driver | pg (node-postgres) | Drizzle's official recommendation for Supabase is `postgres`; `pg` works but requires different import path |
| drizzle-kit push | drizzle-kit generate + migrate | `push` directly applies changes (dev-friendly); `generate+migrate` creates versioned SQL files (production-safe). Use `generate+migrate` for Supabase cloud. |

**Installation:**

```bash
# Scaffold
npx create-next-app@latest jackpot-pb \
  --typescript \
  --tailwind \
  --app \
  --eslint \
  --import-alias "@/*"

# shadcn/ui (run after scaffolding, before adding components)
npx shadcn@latest init

# Supabase Auth
npm install @supabase/supabase-js @supabase/ssr

# Drizzle ORM + PostgreSQL driver
npm install drizzle-orm postgres
npm install -D drizzle-kit

# Forms + validation (login form)
npm install react-hook-form zod @hookform/resolvers

# Testing
npm install -D vitest @testing-library/react @testing-library/user-event @vitejs/plugin-react jsdom
```

**Version verification:** [VERIFIED: npm registry 2026-04-09] — all versions confirmed via `npm view [package] version`.

---

## Architecture Patterns

### Recommended Project Structure

```
/
├── app/
│   ├── layout.tsx               # Root layout (Inter font via next/font/google)
│   ├── page.tsx                 # Authenticated placeholder — logout button only
│   ├── login/
│   │   └── page.tsx             # Full-page login form (shadcn Card)
│   └── auth/
│       └── callback/
│           └── route.ts         # Supabase auth callback route handler
├── db/
│   ├── index.ts                 # Drizzle client export
│   ├── schema/
│   │   ├── assets.ts            # Asset table
│   │   ├── transactions.ts      # Transaction table
│   │   ├── manual-valuations.ts
│   │   ├── holdings.ts
│   │   ├── price-cache.ts
│   │   ├── portfolio-snapshots.ts
│   │   └── goals.ts
│   └── migrations/              # drizzle-kit output directory
├── utils/supabase/
│   ├── client.ts                # createBrowserClient (Client Components)
│   ├── server.ts                # createServerClient (Server Components, Route Handlers)
│   └── middleware.ts            # updateSession helper
├── middleware.ts                # Root middleware — auth protection + redirect
├── components/
│   └── ui/                      # shadcn-generated components (card, input, button, etc.)
├── .env.local                   # Supabase + DATABASE_URL env vars
├── drizzle.config.ts            # drizzle-kit config pointing at Supabase
└── vercel.json                  # (empty for now — cron config added in Phase 4)
```

### Pattern 1: Supabase SSR Client Setup

**What:** Two separate Supabase client factory functions — one for Client Components (browser), one for Server Components/Route Handlers/middleware (server).

**When to use:** Every time Supabase Auth is accessed. The browser client handles client-side auth actions (signIn, signOut). The server client reads the session server-side.

```typescript
// utils/supabase/client.ts
// Source: [CITED: supabase.com/docs/guides/auth/server-side/nextjs]
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```typescript
// utils/supabase/server.ts
// Source: [CITED: ryankatayi.com/blog/server-side-auth-in-next-js-with-supabase-my-setup]
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component context: writes are no-ops; middleware handles persistence
          }
        },
      },
    }
  )
}
```

### Pattern 2: Middleware Auth Protection

**What:** `middleware.ts` at project root runs on every request, calls `getUser()` to refresh the session token, and redirects unauthenticated users to `/login`.

**When to use:** This is required — without it, sessions expire and aren't refreshed. The matcher excludes static files to avoid unnecessary middleware overhead.

```typescript
// utils/supabase/middleware.ts
// Source: [CITED: ryankatayi.com/blog/server-side-auth-in-next-js-with-supabase-my-setup]
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: use getUser(), never getSession() in server code
  const { data: { user } } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname === '/login'

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

```typescript
// middleware.ts (root)
// Source: [CITED: ryankatayi.com/blog/server-side-auth-in-next-js-with-supabase-my-setup]
import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 3: Drizzle Client + Connection

**What:** Drizzle connects to Supabase's direct PostgreSQL connection string (not the connection pooler) for schema migrations. The pooler (Transaction mode) requires `{ prepare: false }`.

**When to use:** Drizzle client is a server-only module — never imported in Client Components.

```typescript
// db/index.ts
// Source: [CITED: orm.drizzle.team/docs/get-started/supabase-new]
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const client = postgres(process.env.DATABASE_URL!)
export const db = drizzle({ client })
```

```typescript
// drizzle.config.ts
// Source: [CITED: orm.drizzle.team/docs/get-started/supabase-new]
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './db/migrations',
  schema: './db/schema',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

### Pattern 4: Drizzle Schema with BIGINT Money

**What:** PostgreSQL BIGINT columns for all monetary amounts, per D-04. Use `mode: 'number'` for values within JS safe integer range (KRW amounts up to ≈ ₩9 quadrillion are safe).

```typescript
// db/schema/transactions.ts
// Source: [CITED: orm.drizzle.team/docs/column-types/pg]
import { pgTable, uuid, bigint, boolean, varchar, date, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { assets } from './assets'

export const transactionTypeEnum = pgEnum('transaction_type', ['buy', 'sell'])

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id),
  type: transactionTypeEnum('type').notNull(),
  quantity: bigint('quantity', { mode: 'number' }).notNull(), // units × 10^8 for fractional shares/crypto
  pricePerUnit: bigint('price_per_unit', { mode: 'number' }).notNull(), // KRW
  fee: bigint('fee', { mode: 'number' }).notNull().default(0),
  currency: varchar('currency', { length: 3 }).notNull(),
  exchangeRateAtTime: bigint('exchange_rate_at_time', { mode: 'number' }), // × 10000 for 4 decimal places
  transactionDate: date('transaction_date').notNull(),
  isVoided: boolean('is_voided').notNull().default(false),
  notes: varchar('notes', { length: 1000 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

### Pattern 5: Login Form with shadcn + react-hook-form + Zod

**What:** shadcn Form component wraps react-hook-form with Zod resolver for client-side validation. Server Action performs the actual `signInWithPassword` call.

```typescript
// app/login/page.tsx (structure only)
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// UI spec: centered card, 400px wide, Korean copy, destructive error color
```

### Anti-Patterns to Avoid

- **Using `getSession()` in server code:** `getSession()` does NOT revalidate the auth token against Supabase's servers. Always use `getUser()` in middleware and Server Components. [VERIFIED: supabase.com/docs]
- **Using `@supabase/auth-helpers-nextjs`:** This package is deprecated. Use `@supabase/ssr` exclusively. [VERIFIED: supabase.com/docs/guides/auth/server-side/migrating-to-ssr-from-auth-helpers]
- **Calling Supabase DB directly from Client Components:** All database queries go through Drizzle on the server (Route Handlers / Server Actions). The browser client is for Auth only.
- **Using `drizzle-kit push` for production schema changes:** `push` applies changes directly without migration files. Use `generate` + `migrate` for Supabase cloud — it creates versioned SQL files that can be reviewed and rolled back.
- **Storing monetary values as NUMERIC/DECIMAL in schema:** Use BIGINT. NUMERIC is fine mathematically but ORM layer returns strings in JavaScript, requiring conversion. BIGINT with `mode: 'number'` is simpler.
- **Defining schema in a single file:** Separate one file per table in `db/schema/`. The Drizzle config `schema: './db/schema'` reads the entire directory.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session cookie management | Custom JWT cookie logic | `@supabase/ssr` createServerClient | CSRF protection, secure httpOnly cookies, refresh token rotation are non-trivial. SSR package handles all of this. |
| Route auth protection | Custom auth middleware logic | `updateSession` pattern from `@supabase/ssr` | Token refresh timing, cookie propagation to Server Components, and CDN cache-busting are already solved. |
| Form validation | Custom validation logic | Zod + react-hook-form | Client-side error display, async validation, schema reuse between client and server are all handled. |
| DB connection pooling | Manual connection management | `postgres` driver default pooling | `postgres` package has built-in connection pooling. Manual pool management introduces leak risks. |
| Schema migrations | Raw SQL scripts | drizzle-kit generate + migrate | Version-controlled, type-checked migrations that match the TypeScript schema definition. |

**Key insight:** Authentication and session management have dozens of edge cases (clock skew, concurrent requests, cookie race conditions, CSRF). `@supabase/ssr` is battle-tested for exactly this stack — every custom implementation will hit these edge cases.

---

## Common Pitfalls

### Pitfall 1: `getSession()` vs `getUser()` in Middleware

**What goes wrong:** Using `supabase.auth.getSession()` in server code (middleware, Server Components) returns the session from the cookie without re-validating it with Supabase's servers. A revoked or expired session will appear valid until the JWT expires naturally.

**Why it happens:** `getSession()` is fast (local cookie read). `getUser()` makes a network call to Supabase Auth. Developers use `getSession()` for performance.

**How to avoid:** Always use `getUser()` in middleware for auth checks that protect routes. The performance cost is one network call per request — acceptable.

**Warning signs:** Users remain "logged in" after you revoke their session in the Supabase dashboard.

### Pitfall 2: `@supabase/auth-helpers-nextjs` (Deprecated Package)

**What goes wrong:** Using the old `@supabase/auth-helpers-nextjs` package instead of `@supabase/ssr`. The old package has different APIs (`withPageAuth`, `createServerSupabaseClient`) that conflict with App Router patterns.

**Why it happens:** Many tutorials written for Next.js 13-14 still use auth-helpers. npm search returns both packages.

**How to avoid:** Install only `@supabase/ssr` and `@supabase/supabase-js`. Never install `@supabase/auth-helpers-nextjs`.

**Warning signs:** Import paths contain `auth-helpers`; functions like `withPageAuth` or `createServerSupabaseClient` appear in the code.

### Pitfall 3: Supabase Connection Pooler vs Direct Connection for Drizzle

**What goes wrong:** Using Supabase's Transaction-mode connection pooler URL for Drizzle migrations. Transaction-mode poolers don't support prepared statements, causing migrations to fail.

**Why it happens:** Supabase dashboard shows "Connection Pooling" URL prominently — it looks like the main connection string.

**How to avoid:** For Drizzle's `DATABASE_URL`, use the **direct connection** string from Supabase (under Project Settings → Database → Connection String → "URI" tab, NOT the pooler). If you must use the pooler, add `{ prepare: false }` to the postgres client: `postgres(process.env.DATABASE_URL, { prepare: false })`.

**Warning signs:** `drizzle-kit migrate` errors with "prepared statement already exists" or "cannot use prepared statements in a transaction pooler".

### Pitfall 4: Missing Middleware Cookie Propagation

**What goes wrong:** The middleware refreshes the session token but doesn't propagate the updated cookies to both the Request (for Server Components) AND the Response (for the browser). Result: Server Components see stale sessions; the browser doesn't receive the refreshed token.

**Why it happens:** The `setAll` implementation is subtle — cookies must be set on BOTH `request` and a new `supabaseResponse`.

**How to avoid:** Follow the exact middleware pattern shown in Pattern 2 above. Both `request.cookies.set` AND `supabaseResponse.cookies.set` calls are required.

**Warning signs:** Users get intermittently logged out even with a valid session; Server Components see `user = null` while the browser shows a logged-in state.

### Pitfall 5: `NEXT_PUBLIC_` Env Variable Naming

**What goes wrong:** Using `SUPABASE_URL` (without `NEXT_PUBLIC_` prefix) for the Supabase URL and Anon Key. These need to be accessible in Client Components (browser), which requires the `NEXT_PUBLIC_` prefix in Next.js.

**Why it happens:** D-10 in CONTEXT.md lists `SUPABASE_URL` (without prefix), but the official `@supabase/ssr` examples use `NEXT_PUBLIC_SUPABASE_URL`.

**How to avoid:**
- `NEXT_PUBLIC_SUPABASE_URL` — used in both server and browser clients
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — used in both server and browser clients
- `SUPABASE_SERVICE_ROLE_KEY` — server-only (no NEXT_PUBLIC_ prefix — correct, never expose this)
- `DATABASE_URL` — server-only (no NEXT_PUBLIC_ prefix — correct)

**Warning signs:** `process.env.SUPABASE_URL` returns `undefined` in Client Components.

### Pitfall 6: BIGINT Returns as String in PostgreSQL Drivers

**What goes wrong:** PostgreSQL BIGINT columns are returned as JavaScript strings by the `pg` and `postgres` drivers by default (to avoid JS number precision loss for values > 2^53). Drizzle ORM with `mode: 'number'` explicitly converts to JS number — but only values under 2^53 (~9 quadrillion) are safe.

**Why it happens:** JavaScript's `number` type can't safely represent integers > Number.MAX_SAFE_INTEGER (9,007,199,254,740,991).

**How to avoid:** Use `bigint({ mode: 'number' })` in Drizzle schema for KRW amounts (max ~₩9 quadrillion is safe). For crypto quantities stored as satoshis or similar high-precision integers, use `bigint({ mode: 'bigint' })` and handle the BigInt type in the application layer.

**Warning signs:** Financial calculations return subtly wrong results; Zod parsing fails on BIGINT fields.

### Pitfall 7: shadcn Init Before Component Adds

**What goes wrong:** Running `npx shadcn@latest add card` before running `npx shadcn@latest init` fails or installs without the correct Tailwind v4 configuration.

**Why it happens:** `shadcn init` sets up `components.json`, the `components/ui/` directory structure, and Tailwind v4 CSS variable configuration. Without it, component adds have no configuration to follow.

**How to avoid:** Always run `npx shadcn@latest init` once immediately after `create-next-app`, before adding any components.

**Warning signs:** `components/ui/` directory missing; `components.json` does not exist in project root.

---

## Code Examples

### Complete Schema: Assets Table

```typescript
// db/schema/assets.ts
// Source: [CITED: orm.drizzle.team/docs/column-types/pg]
import { pgTable, uuid, varchar, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const assetTypeEnum = pgEnum('asset_type', [
  'stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'savings', 'real_estate'
])

export const priceTypeEnum = pgEnum('price_type', ['live', 'manual'])

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  ticker: varchar('ticker', { length: 20 }),
  assetType: assetTypeEnum('asset_type').notNull(),
  priceType: priceTypeEnum('price_type').notNull(),
  currency: varchar('currency', { length: 3 }).notNull(), // 'KRW' or 'USD'
  notes: varchar('notes', { length: 1000 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

### Complete Schema: ManualValuation (Append-Only)

```typescript
// db/schema/manual-valuations.ts
import { pgTable, uuid, bigint, varchar, date, timestamp } from 'drizzle-orm/pg-core'
import { assets } from './assets'

export const manualValuations = pgTable('manual_valuations', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id),
  // Append-only: no update endpoint should exist for this table
  valueKrw: bigint('value_krw', { mode: 'number' }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  exchangeRateAtTime: bigint('exchange_rate_at_time', { mode: 'number' }), // ×10000 for 4dp
  valuedAt: date('valued_at').notNull(),
  notes: varchar('notes', { length: 1000 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

### Logout Server Action

```typescript
// app/actions/auth.ts
'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

### Login Form Server Action

```typescript
// app/login/actions.ts
'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signIn(email: string, password: string, redirectPath: string = '/') {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: error.message }
  }
  redirect(redirectPath)
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023-2024 | Different import paths and API surface; old package will not receive bug fixes |
| `supabase.auth.getSession()` in server code | `supabase.auth.getUser()` | 2024 | `getSession()` does not re-validate token; security risk for protected routes |
| Tailwind CSS v3 with `tailwind.config.ts` | Tailwind CSS v4 with CSS-only config | 2025 | No `tailwind.config.ts` file needed; CSS variables and `@theme` directive in CSS |
| shadcn CLI < 4.x | shadcn CLI 4.x | 2025 | Built for Tailwind v4; different `components.json` format |
| NextAuth v4 / Auth.js v5 | Supabase Auth + `@supabase/ssr` | (project decision) | Different session model; locked by D-03 |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: No new features; security fixes only. Use `@supabase/ssr`.
- Tailwind CSS v3: LTS-only (bug fixes). New projects use v4.
- `npx create-next-app` without `--app` flag: Creates Pages Router project. Always include `--app`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `DATABASE_URL` in D-10 refers to the Supabase direct PostgreSQL connection URL (not the pooler) | Standard Stack / Pitfall 3 | Drizzle migrations may fail if pooler URL is used; requires `{ prepare: false }` workaround |
| A2 | `SUPABASE_URL` in D-10 should be `NEXT_PUBLIC_SUPABASE_URL` in actual `.env.local` | Pitfall 5 | Client Components cannot read Supabase URL; browser client initialization fails |
| A3 | Supabase cloud project already exists or will be created before plan execution | Environment Availability | No Supabase project = no `DATABASE_URL` or Supabase keys available; plan execution blocked |
| A4 | Vercel project linked to this repo will be configured with the same env vars | Standard Stack | Deployed app has no Supabase connection without Vercel env var configuration |

---

## Open Questions (RESOLVED)

1. **`SUPABASE_URL` vs `NEXT_PUBLIC_SUPABASE_URL` naming in D-10**
   - What we know: D-10 lists `SUPABASE_URL` and `SUPABASE_ANON_KEY` without `NEXT_PUBLIC_` prefix.
   - What's unclear: Whether the planner should use the prefix (required for browser clients) or if D-10 is intentionally using non-public names (would require server-only clients everywhere).
   - Recommendation: Use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` per official Supabase Next.js docs. Document in plan that `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` correctly have no prefix.
   - **RESOLVED (01-01-PLAN.md, 01-03-PLAN.md):** Plans use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` throughout all client/server factories. `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` correctly carry no `NEXT_PUBLIC_` prefix. `.env.local.example` and `user_setup` frontmatter document all four variables with the correct names.

2. **Supabase project creation — pre-existing or in-plan?**
   - What we know: D-09 says to use cloud Supabase directly; no local CLI.
   - What's unclear: Does the Supabase project already exist, or does Plan 01-02 include creating it?
   - Recommendation: Plan 01-02 should include a step to create the Supabase project and obtain keys if not already done. This is a human-action step (requires Supabase dashboard UI).
   - **RESOLVED (01-01-PLAN.md Task 0):** Plan 01-01 contains a `checkpoint:human-action` Task 0 that walks the user through creating the Supabase project at supabase.com, collecting all four credential values, and creating the Vercel project. This is a blocking gate before any code runs.

3. **Drizzle `generate` + `migrate` vs `push` for initial schema**
   - What we know: `push` is faster for initial setup; `generate+migrate` is safer for cloud.
   - What's unclear: For greenfield initial schema creation, is `push` acceptable or should migration files always be generated?
   - Recommendation: Use `generate` + `migrate` from the start. It's only marginally more steps and establishes the versioned migration pattern that Phase 2+ will follow.
   - **RESOLVED (01-02-PLAN.md Task 2):** Plans use `npx drizzle-kit generate` followed by `npx drizzle-kit migrate`. Migration files are committed to git. `push` is not used anywhere in the plans.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js 16 runtime | ✓ | v23.10.0 | — |
| npm | Package installation | ✓ | 10.9.2 | — |
| Supabase cloud project | Database + Auth | [ASSUMED] | — | Must create at supabase.com before executing plan |
| Vercel account + project | Deployment (D-01) | [ASSUMED] | — | Can defer deployment to end of phase |
| Git repo on GitHub/GitLab | Vercel CI auto-deploy | ✓ (git repo exists) | — | Manual Vercel deploy as fallback |

**Missing dependencies with no fallback:**
- Supabase cloud project with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DATABASE_URL` — plan execution for 01-02 and 01-03 requires these values.

**Missing dependencies with fallback:**
- Vercel deployment — Plan 01-01 scaffold can be verified locally; Vercel deploy can be a final step in the phase.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.3 |
| Config file | `vitest.config.ts` — does not exist yet (Wave 0 gap) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Email/password login succeeds and returns authenticated session | integration | Manual-only (requires Supabase network) | ❌ Wave 0 |
| AUTH-01 | Session persists across page navigations (middleware cookie refresh) | manual | Manual — open browser, navigate, refresh | N/A |
| AUTH-02 | Logout invalidates session and redirects to /login | integration | Manual-only (requires Supabase network) | ❌ Wave 0 |
| AUTH-02 | Unauthenticated request to `/` redirects to `/login` | unit | `npx vitest run tests/middleware.test.ts` | ❌ Wave 0 |
| AUTH-02 | Unauthenticated request preserves `?redirect=` param | unit | `npx vitest run tests/middleware.test.ts` | ❌ Wave 0 |
| — | Schema: all 7 tables exist with correct column types | smoke | `npx vitest run tests/schema.test.ts` (drizzle introspect) | ❌ Wave 0 |

**Note on AUTH-01/02 integration tests:** Supabase Auth integration tests require a real Supabase project. For CI, these are manual verification steps. Middleware redirect logic is unit-testable by mocking `getUser()`.

### Sampling Rate

- **Per task commit:** `npx vitest run tests/middleware.test.ts` (fast middleware unit tests)
- **Per wave merge:** `npx vitest run` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — framework config with jsdom environment
- [ ] `tests/middleware.test.ts` — covers middleware redirect logic (REQ AUTH-01, AUTH-02) — mock `getUser()` responses
- [ ] `tests/schema.test.ts` — smoke test that Drizzle schema exports all 7 table definitions without error

*(No existing test infrastructure — full Wave 0 setup required)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth — email/password with bcrypt, built-in brute-force protection |
| V3 Session Management | yes | `@supabase/ssr` cookie-based sessions with automatic token refresh via `getUser()` |
| V4 Access Control | yes | middleware.ts redirects all unauthenticated routes to `/login` |
| V5 Input Validation | yes | zod schema on login form; Supabase Auth validates email format server-side |
| V6 Cryptography | no (delegated) | Supabase handles password hashing (bcrypt) — never hand-roll |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Session fixation | Elevation of privilege | Supabase rotates refresh tokens on each use |
| CSRF on login/logout | Tampering | Server Actions in Next.js are CSRF-protected by Next.js framework |
| Cookie theft via XSS | Info disclosure | Supabase session cookies are `httpOnly` by default via `@supabase/ssr` |
| Brute force login | DoS | Supabase Auth has built-in rate limiting on `signInWithPassword` |
| Exposed service role key | Info disclosure | `SUPABASE_SERVICE_ROLE_KEY` must never use `NEXT_PUBLIC_` prefix; never sent to browser |

**RLS not implemented (per deferred decisions):** Row Level Security is explicitly deferred. Server-side validation via middleware + Drizzle queries is the access control layer for this single-user app. This is an accepted trade-off, not a gap.

---

## Sources

### Primary (HIGH confidence)

- [VERIFIED: npm registry 2026-04-09] — `@supabase/supabase-js` 2.102.1, `@supabase/ssr` 0.10.0, `drizzle-orm` 0.45.2, `drizzle-kit` 0.31.10, `postgres` 3.4.9, `next` 16.2.3, `tailwindcss` 4.2.2, `shadcn` 4.2.0, `react-hook-form` 7.72.1, `zod` 4.3.6, `vitest` 4.1.3

- [CITED: supabase.com/docs/guides/auth/server-side/nextjs] — Supabase SSR setup for Next.js App Router; `getUser()` vs `getSession()` security requirement; `@supabase/auth-helpers-nextjs` deprecation

- [CITED: orm.drizzle.team/docs/get-started/supabase-new] — Drizzle + Supabase connection setup; `postgres` driver; `{ prepare: false }` for connection pooler

- [CITED: orm.drizzle.team/docs/column-types/pg] — BIGINT `mode: 'number'`; boolean; varchar; timestamp with timezone; pgEnum; foreign key syntax

- [CITED: ui.shadcn.com/docs/installation/next] — shadcn init command; component add pattern; `components.json` structure

### Secondary (MEDIUM confidence)

- [CITED: ryankatayi.com/blog/server-side-auth-in-next-js-with-supabase-my-setup] — Complete `middleware.ts`, `utils/supabase/server.ts`, `utils/supabase/client.ts` implementation (verified against official patterns)

- [CITED: github.com/orgs/supabase/discussions/34842] — Confirmed `getUser()` as current standard (not `getClaims()`); documented cookie propagation bug in some code examples

### Tertiary (LOW confidence)

- None — all critical claims verified against npm registry or official documentation.

---

## Project Constraints (from CLAUDE.md)

| Directive | Category | Impact on Phase 1 |
|-----------|----------|-------------------|
| Use `kebab-case` for file and directory names | Naming | `manual-valuations.ts`, `price-cache.ts`, `portfolio-snapshots.ts` in schema |
| Use `camelCase` for function and method names | Naming | `createClient()`, `updateSession()`, `signOut()` |
| Use `PascalCase` for types, interfaces, enums | Naming | `AssetTypeEnum`, `PriceTypeEnum` |
| Do not prefix interfaces with `I` | Naming | `Asset`, `Transaction` not `IAsset`, `ITransaction` |
| Use descriptive verbs: `getPortfolio`, `calculateReturn` | Naming | Auth functions: `signIn`, `signOut`, `getUser` |
| Co-locate related files by feature, not by type | Structure | `app/login/` contains page + actions + form component |
| `@/` pointing to `src/` once project scaffolding begins | Imports | Set `@/*` alias in `tsconfig.json` to `"./*"` (no src dir) |
| Avoid silent `catch` blocks that swallow errors | Error handling | `setAll` try/catch in server client is intentional (documented); other catches must log |
| Comment non-obvious business logic | Comments | Financial calculation formulas must be commented; `is_voided` semantics explained |
| Recommended: Prettier with 2-space indent, single quotes, trailing commas | Code style | Add `.prettierrc` in Plan 01-01 |
| Recommended: ESLint with TypeScript rules, or Biome | Linting | Add ESLint config (Next.js scaffolded) in Plan 01-01; CI lint check required |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via npm registry
- Architecture patterns: HIGH — verified against official Supabase + Drizzle documentation
- Pitfalls: HIGH — verified against official docs and community-confirmed issues
- Schema design: HIGH — column types verified against Drizzle docs; money storage pattern from pre-planning research (confirmed pitfall #1)

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (stable libraries; check Supabase SSR changelog if version bumps occur)
