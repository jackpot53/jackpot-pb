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


---

## Multi-User Architecture Research (2026-04-14)

**Updated:** 2026-04-14 — D-11~D-15 결정에 따른 멀티 유저 지원 추가 연구

---

### 현재 코드베이스 상태 (실행 완료된 플랜 기준)

**스키마 파일 (01-02 실행 결과):**
- 7개 테이블 모두 `user_id` 컬럼 없음 — 싱글 유저 가정으로 생성됨
- `assets`, `transactions`, `manual_valuations`, `holdings`: 사용자 데이터 — `user_id` 추가 필요
- `goals`: 사용자 데이터 — `user_id` 추가 필요
- `portfolio_snapshots`: 사용자 데이터 — `user_id` 추가 필요 (다만 구조적 고려 필요, 아래 참조)
- `price_cache`: 전역 공유 데이터 — `user_id` 불필요 (시세는 모든 사용자 공유)

**현재 실행 중인 Server Actions (01-02, 01-03, Phase 2~4 실행 완료):**
- `app/actions/assets.ts` — `requireUser()` 호출하지만 Drizzle 쿼리에 `where(userId)` 필터 없음
- `app/actions/transactions.ts` — 동일한 패턴
- `app/actions/goals.ts` — 동일한 패턴
- `app/actions/manual-valuations.ts` — 동일한 패턴
- `db/queries/assets-with-holdings.ts` — `user_id` 필터 없이 전체 자산 조회
- `db/queries/goals.ts` — 전체 목표 조회
- `db/queries/portfolio-snapshots.ts` — 전체 스냅샷 조회
- `app/api/cron/snapshot/route.ts` — `CRON_SECRET`으로만 인증, Supabase 세션 없음

---

### Q1. 어떤 테이블에 user_id가 필요한가?

**[VERIFIED: 코드베이스 분석]**

| 테이블 | user_id 필요 여부 | 이유 |
|--------|-----------------|------|
| `assets` | 필요 | 사용자별 자산 등록 |
| `transactions` | 필요 | 자산에 연결되나 직접 user_id도 보유하는 것이 RLS 정책 작성 및 쿼리 단순화에 유리 |
| `manual_valuations` | 필요 | 자산에 연결되나 동일 이유 |
| `holdings` | 필요 | 자산 집계 — 자산에 종속되므로 JOIN 없이 user_id 직접 보유 권장 |
| `goals` | 필요 | 사용자별 목표 |
| `portfolio_snapshots` | 필요 | 사용자별 스냅샷 (현재 `snapshot_date UNIQUE` 제약 → 멀티 유저 시 `(user_id, snapshot_date) UNIQUE`로 변경 필요) |
| `price_cache` | 불필요 | 전역 공유 — ticker당 하나, 사용자 무관 |

**핵심 판단:** `transactions`, `manual_valuations`, `holdings`는 기술적으로 `assets.user_id`로 JOIN해서 필터링할 수 있지만, RLS 정책 작성 시 JOIN이 필요한 서브쿼리가 필요해 복잡해진다. D-11에서 "모든 사용자 데이터 테이블"로 명시했으므로 직접 `user_id` 컬럼 추가가 맞다.

---

### Q2. Drizzle에서 auth.users FK + user_id 컬럼 추가 마이그레이션 패턴

**[CITED: orm.drizzle.team/docs/rls]**

Drizzle ORM 0.36.0+ (현재 0.45.2)에서 RLS 네이티브 지원이 추가됨. 두 가지 접근법:

**접근법 A: Drizzle 스키마에서 pgPolicy + enableRLS 사용 (권장)**

```typescript
// db/schema/assets.ts
import { pgTable, uuid, varchar, timestamp, pgEnum, pgPolicy } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),  // auth.users(id) FK — Drizzle에서 직접 표현 어려움
  name: varchar('name', { length: 255 }).notNull(),
  // ... 기타 컬럼
}, (t) => [
  pgPolicy('assets_select_own', {
    as: 'permissive',
    to: authenticatedRole,
    for: 'select',
    using: sql`(select auth.uid()) = ${t.userId}`,
  }),
  pgPolicy('assets_insert_own', {
    as: 'permissive',
    to: authenticatedRole,
    for: 'insert',
    withCheck: sql`(select auth.uid()) = ${t.userId}`,
  }),
  pgPolicy('assets_update_own', {
    as: 'permissive',
    to: authenticatedRole,
    for: 'update',
    using: sql`(select auth.uid()) = ${t.userId}`,
    withCheck: sql`(select auth.uid()) = ${t.userId}`,
  }),
  pgPolicy('assets_delete_own', {
    as: 'permissive',
    to: authenticatedRole,
    for: 'delete',
    using: sql`(select auth.uid()) = ${t.userId}`,
  }),
])
```

**접근법 B: SQL 마이그레이션 파일에서 직접 RLS 정책 작성 (이 프로젝트에서 더 실용적)**

Drizzle의 `pgPolicy` 지원은 아직 마이그레이션 생성 시 일부 제한이 있고, `auth.users` FK 참조를 Drizzle TypeScript 스키마에서 표현하는 것이 까다롭다(auth 스키마가 Drizzle 스키마 밖에 있음). 따라서 이 프로젝트에서는 다음 전략을 권장:

1. Drizzle 스키마 파일에 `userId: uuid('user_id').notNull()` 컬럼만 추가 (FK 참조 없이)
2. `drizzle-kit generate`로 ALTER TABLE 마이그레이션 생성
3. 생성된 SQL 파일 뒤에 수동으로 RLS 활성화 및 정책 SQL 추가

**[ASSUMED]** Drizzle의 `pgPolicy` + `enableRLS()` API가 현재 버전(0.45.2)에서 마이그레이션 생성 시 완전히 작동하는지는 공식 문서에서 확인했으나, 실제 migration 파일에 올바르게 포함되는지는 이 환경에서 직접 테스트하지 않음.

---

### Q3. Drizzle DATABASE_URL은 RLS를 우회하는가?

**[VERIFIED: 커뮤니티 확인, supabase discussions]**

이것이 이 플랜에서 가장 중요한 사실이다:

**현재 `db/index.ts`의 Drizzle 클라이언트는 `DATABASE_URL`을 사용한다. `DATABASE_URL`은 Supabase direct connection (postgres superuser)에 연결한다. Postgres superuser는 RLS를 자동으로 우회한다.**

즉:
- Drizzle `db` 클라이언트 → `DATABASE_URL` → postgres superuser 권한 → **RLS 완전 무시**
- RLS 정책을 아무리 완벽하게 작성해도 현재 Drizzle 클라이언트 구조에서는 아무 효과가 없다

**두 가지 해결 방향:**

**방향 1: RLS를 실질적 방어로 사용하지 않고, 앱 레이어에서만 필터링 (D-13)**
- 모든 Drizzle 쿼리에 `where(eq(table.userId, user.id))` 추가
- RLS는 "심층 방어(defense in depth)" 역할 — 앱 레이어 버그 시 DB 레벨 최후 방어선
- Drizzle 클라이언트는 현재 그대로 유지 (서비스 롤 수준 접근)
- **이 프로젝트의 실용적인 선택**: 싱글 유저 + Supabase Dashboard에서 수동 사용자 생성 → RLS 미적용이어도 큰 위험 없으나, D-12에서 RLS 활성화를 결정했으므로 심층 방어로 활성화

**방향 2: RLS를 실질적 방어로 사용 (Supabase JWT 방식)**
- Drizzle 쿼리 실행 전 `set local role authenticated; set local "request.jwt.claims" = '{"sub":"<uuid>"}'` 같은 세션 변수 설정
- 구현 복잡도가 매우 높음 — 트랜잭션마다 JWT claim 설정 필요
- 이 프로젝트 규모에서 불필요한 복잡성

**D-13의 이중 방어(dual-guard) 전략이 맞다:** Drizzle 쿼리에 `where(eq(table.userId, user.id))` 필터를 앱 레이어에서 추가하고, RLS는 심층 방어로 활성화한다. RLS의 실질적 효력은 Supabase Dashboard SQL 에디터, 향후 PostgREST 엔드포인트 추가, 또는 anon key 노출 시 발동된다.

---

### Q4. 각 테이블의 RLS 정책 SQL

**[CITED: supabase.com/docs/guides/database/postgres/row-level-security]**

성능을 위해 `auth.uid()` 대신 `(select auth.uid())`를 사용 (쿼리 최적화기가 서브쿼리를 상수로 처리).

```sql
-- ① assets
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets_select_own" ON assets FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "assets_insert_own" ON assets FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "assets_update_own" ON assets FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "assets_delete_own" ON assets FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ② transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_select_own" ON transactions FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "transactions_insert_own" ON transactions FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "transactions_update_own" ON transactions FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "transactions_delete_own" ON transactions FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ③ manual_valuations (append-only이므로 SELECT, INSERT만)
ALTER TABLE manual_valuations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manual_valuations_select_own" ON manual_valuations FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "manual_valuations_insert_own" ON manual_valuations FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- ④ holdings
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "holdings_select_own" ON holdings FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "holdings_insert_own" ON holdings FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "holdings_update_own" ON holdings FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "holdings_delete_own" ON holdings FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ⑤ goals
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals_select_own" ON goals FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "goals_insert_own" ON goals FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "goals_update_own" ON goals FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "goals_delete_own" ON goals FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ⑥ portfolio_snapshots
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "snapshots_select_own" ON portfolio_snapshots FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "snapshots_insert_own" ON portfolio_snapshots FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
-- UPDATE/DELETE는 cron job이 수행하므로 정책 없음 (superuser가 우회)

-- ⑦ price_cache: user_id 없음 — 글로벌 공유, RLS 적용 안 함
-- (선택적으로 읽기 전용 정책 추가 가능하나 현재는 불필요)
```

**주의:** Drizzle superuser 연결은 어차피 RLS를 우회하므로, 위 정책은 Supabase Dashboard 접근, PostgREST, 기타 anon key 기반 접근에 대한 방어다.

---

### Q5. 마이그레이션 전략: 기존 테이블에 user_id 추가

**[VERIFIED: 코드베이스 확인 — 01-02-SUMMARY.md: "Migration apply deferred to manual step"]**

현재 상황:
- 마이그레이션 SQL 파일 `0000_sparkling_echo.sql` 생성됨
- 이후 여러 마이그레이션(`0001`, `0002`, `0003`, `0004`) 적용됨 (enum 추가 등)
- 테이블에 실 데이터가 있을 수 있음

**권장 마이그레이션 전략:**

새 마이그레이션 파일 생성 (`drizzle-kit generate`):

1. 각 Drizzle 스키마 파일에 `userId: uuid('user_id').notNull()` 추가
2. `npx drizzle-kit generate` 실행 → `ALTER TABLE ... ADD COLUMN user_id uuid NOT NULL` SQL 생성
3. **문제:** 기존 데이터가 있으면 `NOT NULL` 제약 때문에 실패

**기존 데이터 처리 전략:**

```sql
-- Step 1: 컬럼을 nullable로 추가
ALTER TABLE assets ADD COLUMN user_id uuid;

-- Step 2: 기존 행에 Supabase Dashboard에서 확인한 관리자 user_id로 백필
-- (Supabase Dashboard > Authentication > Users에서 user UUID 확인)
UPDATE assets SET user_id = '<admin-user-uuid>' WHERE user_id IS NULL;
UPDATE transactions SET user_id = '<admin-user-uuid>' WHERE user_id IS NULL;
UPDATE manual_valuations SET user_id = '<admin-user-uuid>' WHERE user_id IS NULL;
UPDATE holdings SET user_id = '<admin-user-uuid>' WHERE user_id IS NULL;
UPDATE goals SET user_id = '<admin-user-uuid>' WHERE user_id IS NULL;
UPDATE portfolio_snapshots SET user_id = '<admin-user-uuid>' WHERE user_id IS NULL;

-- Step 3: NOT NULL 제약 추가
ALTER TABLE assets ALTER COLUMN user_id SET NOT NULL;
-- ... 각 테이블 반복

-- Step 4: FK 제약 추가 (선택적 — auth.users는 Supabase 관리 스키마)
ALTER TABLE assets ADD CONSTRAINT assets_user_id_fk 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 5: 성능을 위한 인덱스 (RLS 정책 검색 최적화)
CREATE INDEX assets_user_id_idx ON assets(user_id);
CREATE INDEX transactions_user_id_idx ON transactions(user_id);
CREATE INDEX manual_valuations_user_id_idx ON manual_valuations(user_id);
CREATE INDEX holdings_user_id_idx ON holdings(user_id);
CREATE INDEX goals_user_id_idx ON goals(user_id);
CREATE INDEX portfolio_snapshots_user_id_idx ON portfolio_snapshots(user_id);
```

**`portfolio_snapshots` 추가 변경:** 현재 `snapshot_date UNIQUE` 제약이 있음. 멀티 유저에서는 같은 날짜에 사용자별 스냅샷이 존재해야 하므로 `(user_id, snapshot_date) UNIQUE`로 변경 필요.

```sql
ALTER TABLE portfolio_snapshots DROP CONSTRAINT portfolio_snapshots_snapshot_date_unique;
ALTER TABLE portfolio_snapshots ADD CONSTRAINT portfolio_snapshots_user_snapshot_unique 
  UNIQUE (user_id, snapshot_date);
```

**Drizzle 스키마 동기화:** SQL 마이그레이션을 수동으로 실행한 경우, Drizzle 스키마 파일도 업데이트 후 `drizzle-kit generate --custom` 또는 빈 마이그레이션으로 journal 동기화 필요.

---

### Q6. Drizzle 스키마에서 auth.users FK 표현 방법

**[ASSUMED]** Drizzle에서 `auth.users`(Supabase 관리 스키마)를 직접 참조하는 방법은 두 가지:

**방법 A: FK 참조 없이 uuid 컬럼만 추가 (권장)**
```typescript
// db/schema/assets.ts
import { pgTable, uuid, ... } from 'drizzle-orm/pg-core'

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),  // FK 참조 없음 — auth.users는 Drizzle 외부 스키마
  // ...
})
```
FK 제약은 수동 SQL 마이그레이션에서 추가. Drizzle 타입 시스템에는 영향 없음.

**방법 B: pgTable + sql 활용 (복잡)**
공식 Drizzle 문서에서 `auth.users` 참조를 직접 지원하는 헬퍼가 있으나, 현재 Supabase 연동 튜토리얼에서 검증된 패턴은 "컬럼만 추가, FK는 수동 SQL"이다.

---

### Q7. Server Actions 업데이트 범위

**[VERIFIED: 코드베이스 분석]**

`user_id` 컬럼 추가 후 수정이 필요한 파일:

| 파일 | 변경 유형 | 변경 내용 |
|------|---------|----------|
| `app/actions/assets.ts` | 수정 | INSERT에 `userId: user.id` 추가; UPDATE/DELETE에 `and(eq(assets.id, id), eq(assets.userId, user.id))` 추가 |
| `app/actions/transactions.ts` | 수정 | INSERT에 `userId: user.id` 추가; UPDATE/DELETE 필터에 userId 추가 |
| `app/actions/manual-valuations.ts` | 수정 | INSERT에 `userId: user.id` 추가 |
| `app/actions/goals.ts` | 수정 | INSERT에 `userId: user.id` 추가; UPDATE/DELETE 필터에 userId 추가 |
| `db/queries/assets-with-holdings.ts` | 수정 | `getAssetsWithHoldings(userId)` 파라미터 추가; `where(eq(assets.userId, userId))` 추가 |
| `db/queries/assets.ts` | 수정 | `getAssets(userId)`, `getAssetById(id, userId)` — userId 필터 추가 |
| `db/queries/goals.ts` | 수정 | `listGoals(userId)` — userId 필터 추가 |
| `db/queries/portfolio-snapshots.ts` | 수정 | `getAllSnapshots(userId)` — userId 필터 추가 |
| `app/api/cron/snapshot/route.ts` | 수정 | 모든 유저를 순회하거나, 단일 admin 유저 ID를 env에서 읽어 snapshot 기록 |
| `lib/holdings.ts` | 수정 | `upsertHoldings(assetId, userId)` 형태로 userId 전달 필요 |
| `lib/snapshot/writer.ts` | 수정 | `writePortfolioSnapshot({ ..., userId })` — userId 파라미터 추가 |

**cron job 특별 처리:**
`app/api/cron/snapshot/route.ts`는 Supabase Auth 세션이 없다. 현재는 모든 자산을 조회하는데, 멀티 유저에서는 사용자별로 스냅샷을 따로 기록해야 한다. 가장 단순한 접근법:
- `CRON_TARGET_USER_ID` 환경변수로 대상 유저 지정 (싱글 유저 운용 시)
- 또는 모든 user_id를 assets 테이블에서 DISTINCT로 조회 후 순회

---

### Q8. Phase 2+ 영향도 — 이미 실행된 플랜들

**[VERIFIED: 코드베이스 분석 — ROADMAP.md 확인]**

ROADMAP.md에 따르면 Phase 3과 Phase 4의 여러 플랜이 이미 완료(체크박스 `[x]`)되어 있다:
- `03-01-PLAN.md`, `03-02-PLAN.md`, `03-03-PLAN.md` — 완료
- `04-01-PLAN.md`, `04-02-PLAN.md`, `04-03-PLAN.md` — 완료

이는 01-04 플랜이 해당 파일들도 업데이트해야 함을 의미한다. 단 Phase 2 플랜들(`02-01`~`02-04`)은 아직 미실행이므로, 플랜 문서에 user_id 고려사항을 반영할 필요가 있다.

---

### 아키텍처 결정 요약 (플래너를 위한 처방)

| 결정 사항 | 처방 |
|----------|------|
| user_id 컬럼 타입 | `uuid('user_id').notNull()` — auth.users.id와 동일 타입 |
| auth.users FK | SQL 마이그레이션에서 수동 추가 (ON DELETE CASCADE 권장) |
| Drizzle 스키마 표현 | FK 참조 없이 uuid 컬럼만 선언 |
| RLS 활성화 | SQL 마이그레이션 파일 또는 Supabase Dashboard SQL Editor에서 수동 실행 |
| 앱 레이어 필터 | 모든 Drizzle 쿼리에 `where(eq(table.userId, user.id))` 추가 (D-13 이중 방어) |
| portfolio_snapshots UNIQUE | `(user_id, snapshot_date)` 복합 유니크로 변경 |
| price_cache | user_id 추가 안 함 — 전역 공유 |
| 기존 데이터 백필 | nullable 추가 → UPDATE → NOT NULL 제약 순서로 진행 |
| user_id 인덱스 | 6개 테이블 모두에 `user_id` 인덱스 추가 (RLS 성능) |
| cron job | `CRON_TARGET_USER_ID` env var로 대상 유저 고정 또는 DISTINCT user_id 순회 |

---

### 함정 (Pitfalls)

**함정 1: RLS만 믿고 앱 레이어 필터를 생략**
- Drizzle의 `DATABASE_URL` = postgres superuser = RLS 우회
- RLS가 활성화되어 있어도 Drizzle 쿼리는 RLS를 무시하고 모든 사용자 데이터를 반환
- **해결:** 반드시 앱 레이어 `where(eq(table.userId, user.id))` 필터 추가

**함정 2: portfolio_snapshots의 UNIQUE 제약 변경 누락**
- 현재 `snapshot_date` 단독 UNIQUE → 멀티 유저에서 다른 사용자가 같은 날짜 스냅샷 삽입 시 에러
- **해결:** `(user_id, snapshot_date)` 복합 UNIQUE로 변경

**함정 3: NOT NULL 컬럼을 기존 데이터가 있는 테이블에 바로 추가**
- `ALTER TABLE assets ADD COLUMN user_id uuid NOT NULL` — 기존 행이 있으면 실패
- **해결:** nullable로 추가 → 백필 → NOT NULL 제약 추가 순서

**함정 4: cron job이 사용자 데이터를 분리하지 못함**
- cron은 Supabase Auth 세션이 없어 `auth.uid()`를 사용할 수 없음
- **해결:** env var로 대상 user_id 주입 또는 DB에서 DISTINCT user_id 조회 후 순회

**함정 5: lib/holdings.ts의 upsertHoldings가 userId 없이 assetId만 사용**
- 현재 `upsertHoldings(assetId)`는 assetId로 holdings를 찾아 업데이트
- holdings 테이블에 user_id가 추가되면 INSERT 시 userId 필요
- **해결:** `upsertHoldings(assetId, userId)` 시그니처 변경

---

### Open Questions

1. **cron job 멀티 유저 전략**
   - What we know: cron은 Supabase Auth 세션 없이 실행, 현재는 단일 사용자 가정
   - What's unclear: 진짜 멀티 유저로 운용할 계획인가, 아니면 현재는 소수 수동 생성 유저만 있는가
   - Recommendation: `CRON_TARGET_USER_ID` env var를 `.env.local`에 추가하고 단일 유저 고정으로 시작. 다중 사용자 필요 시 DISTINCT 순회로 전환.

2. **이미 실행된 Phase 3/4 플랜의 Server Component들**
   - What we know: `app/(app)/page.tsx`, `app/(app)/charts/page.tsx`, `app/(app)/goals/page.tsx` 등이 query 함수를 호출
   - What's unclear: 이 파일들이 현재 어떻게 구현되어 있는지 (일부 미확인)
   - Recommendation: query 함수에 userId 파라미터 추가 시 Server Component에서도 `supabase.auth.getUser()`로 userId 추출 후 전달하는 패턴으로 업데이트 필요

---

### Sources (Multi-User 섹션)

**PRIMARY (HIGH confidence)**
- [CITED: supabase.com/docs/guides/database/postgres/row-level-security] — RLS 정책 SQL 패턴, `(select auth.uid())` 성능 최적화, SELECT/INSERT/UPDATE/DELETE 정책 예시
- [CITED: orm.drizzle.team/docs/rls] — Drizzle pgPolicy API, enableRLS, Supabase predefined roles
- [VERIFIED: 코드베이스 분석 2026-04-14] — 현재 7개 스키마 파일 확인, Server Actions requireUser() 패턴 확인, query 함수 user_id 필터 부재 확인

**SECONDARY (MEDIUM confidence)**
- [CITED: github.com/orgs/supabase/discussions/27401] — "direct DB connection bypasses RLS" 커뮤니티 확인
- [CITED: answeroverflow.com — Supabase community] — postgres 연결 RLS 우회 확인

**ASSUMED items:**
- Drizzle 0.45.2에서 `pgPolicy`를 스키마 파일에 정의하면 마이그레이션 SQL에 올바르게 포함되는지 직접 테스트하지 않음 → 마이그레이션 파일 검토 필수

