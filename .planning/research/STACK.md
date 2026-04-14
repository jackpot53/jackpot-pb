# Stack Research: Personal Asset Management Web App

**Project:** jackpot-pb (개인 자산 관리 웹앱)
**Researched:** 2026-04-09
**Environment:** Node.js v23.10.0, macOS

---

## Recommended Stack

### Frontend

| Layer | Choice | Version | Rationale | Confidence |
|-------|--------|---------|-----------|------------|
| Framework | Next.js (App Router) | 16.2.3 | Latest stable. App Router is the standard architecture for new Next.js projects. Server Components reduce client-side JS for dashboard views. SSR simplifies auth session handling. React 19 support included. | HIGH — verified via npm registry |
| Language | TypeScript | 5.8.x (bundled via Next.js) | Non-negotiable for financial data. Type safety on currency values, asset types, API response shapes prevents silent calculation errors. | HIGH |
| Styling | Tailwind CSS | 4.2.2 | v4 is the current stable release (confirmed npm registry). Eliminates PostCSS config, uses CSS-native cascade layers, faster build. v3 is in LTS-only mode. | HIGH — verified via npm registry |
| UI Components | shadcn/ui (via `shadcn` CLI) | 4.2.0 (CLI) | Copy-paste component primitives built on Radix UI. Full ownership of component code — no breaking upgrade surprises. Built for Tailwind v4 as of shadcn CLI 4.x. Financial dashboards benefit from fully customizable table/chart layouts. | HIGH — verified via npm registry |
| Charts | Recharts | 3.8.1 | React-native charting library (composable, no canvas footprint). Supports line charts (monthly return history), area charts (total asset growth), pie/donut (asset allocation). React 19 compatible. Well-maintained. | HIGH — verified via npm registry |
| Data Tables | @tanstack/react-table | 8.21.3 | Headless table logic for the per-asset performance comparison screen. Pairs with shadcn/ui table primitives. Sorting, filtering, and pagination without framework lock-in. | HIGH — verified via npm registry |
| Forms | react-hook-form | 7.54.2 | Minimal re-render form state. Integrates with Zod for schema validation. Best choice for the transaction entry and goal-setting forms. | HIGH — verified via npm registry |
| Validation | Zod | 4.3.6 | TypeScript-first schema validation. Used end-to-end: form validation (react-hook-form resolver), API route input validation, external API response parsing. v4 is now stable. | HIGH — verified via npm registry |
| Date handling | date-fns | 4.1.0 | Tree-shakeable, immutable date utilities. Monthly/annual return calculations, transaction date formatting. Avoid moment.js (deprecated) and dayjs (less type-safe). | HIGH — verified via npm registry |
| Server state | @tanstack/react-query | 5.96.2 | Manages external price API fetching: caching, background refetch, stale-while-revalidate. Eliminates manual loading/error state. Works in Next.js App Router alongside Server Components. | HIGH — verified via npm registry |
| Client state | Zustand | 5.0.12 | Minimal global state for UI preferences (selected currency, date range filter). App is data-fetch-heavy, not complex-interaction-heavy, so Zustand's simplicity beats Redux. | HIGH — verified via npm registry |

### Backend

| Layer | Choice | Version | Rationale | Confidence |
|-------|--------|---------|-----------|------------|
| API layer | Next.js Route Handlers (App Router) | same as Next.js 16.2.3 | Eliminates a separate backend process. Route handlers in `app/api/` handle: price API proxying (hides API keys from client), transaction CRUD, goal management. Single deployment unit. | HIGH |
| Price fetch scheduling | Vercel Cron Jobs (if deployed to Vercel) or node-cron | node-cron 4.2.1 | For self-hosted: node-cron triggers background price refresh. For Vercel: native cron via `vercel.json`. Prices for stocks/crypto need to refresh periodically; route handler on every dashboard load introduces latency and API rate-limit risk. | MEDIUM — cron approach is standard; specific provider depends on deployment target |
| Runtime | Node.js | 23.10.0 (host) | Already established. Next.js 16 supports Node 18.18+, so v23.10.0 is fully compatible. | HIGH |

### Database

| Layer | Choice | Version | Rationale | Confidence |
|-------|--------|---------|-----------|------------|
| Database engine | SQLite (via better-sqlite3) | 12.8.0 | Single-user app. SQLite is the correct choice: zero infrastructure, no network latency, ACID-compliant, handles tens of thousands of transactions trivially. Not a scalability limitation here — it is the correct tool for the scale. | HIGH |
| ORM | Drizzle ORM | 0.45.2 | TypeScript-native ORM with full type inference from schema. Compile-time query type safety on financial calculations. Thin abstraction over SQL — you write SQL-like syntax and get typed results. Migrations via drizzle-kit. | HIGH — verified via npm registry |
| Migration tool | drizzle-kit | 0.31.10 | Companion CLI for Drizzle ORM. Generates and applies migrations from schema changes. | HIGH |
| SQLite driver | better-sqlite3 | 12.8.0 | Synchronous SQLite bindings — correct for Node.js server-side use in Next.js Route Handlers. Drizzle ORM's preferred SQLite driver for server environments. | HIGH |

**Why not PostgreSQL:** Single user, file-based, no ops overhead wanted. SQLite with WAL mode is sufficient for this workload indefinitely. PostgreSQL adds infrastructure complexity for zero benefit at this scale.

**Why not Prisma:** Prisma generates a query engine binary, adds startup latency, and has a less SQL-transparent API. Drizzle is leaner, fully typed, and maps more directly to SQL which matters for financial queries (GROUP BY month, window functions for running totals).

### External APIs (price data)

| API | Free Tier | Assets | Confidence |
|-----|-----------|--------|------------|
| **Finnhub** | 60 calls/min, real-time US quotes, basic forex | Stocks, ETFs (US markets) | MEDIUM — from training data, verify current limits at finnhub.io |
| **Alpha Vantage** | 25 calls/day (free), or 75/min on paid | Stocks, ETFs, crypto, forex | MEDIUM — free tier is severely limited; likely needs $50/mo plan for daily use |
| **Yahoo Finance (unofficial)** | Unlimited (unofficial, no API key) | Stocks, ETFs, crypto | LOW — unofficial, can break without notice; useful as fallback |
| **CoinGecko** | ~30 calls/min (Demo tier, free with key) | Cryptocurrency only | MEDIUM — CoinGecko is the standard for crypto price data; Demo tier is free |
| **Korea Exchange (KRX) / FinanceDataReader** | Free, Python-centric | Korean stocks | LOW — primarily Python ecosystem; JS bindings limited |

**Recommended combination:**
- **Stocks/ETF (US + Global):** Finnhub for real-time quotes. If Korean stocks are tracked, consider adding a separate data source or manual update fallback (same model as real estate).
- **Cryptocurrency:** CoinGecko Demo API (free, generous for single-user use).
- **Architecture:** All price API calls go through Next.js Route Handlers to keep API keys server-side. Cache responses in SQLite with a `price_cache` table (ticker, price, fetched_at). Set stale threshold (e.g., 15 minutes for stocks, 5 minutes for crypto). Cron job refreshes cache on schedule. Client never calls external APIs directly.

### Auth

| Choice | Version | Rationale | Confidence |
|--------|---------|-----------|------------|
| **better-auth** | 1.6.1 | Most complete TypeScript-native auth library as of 2026. Supports email/password out of the box. Has native Next.js plugin, Drizzle ORM adapter, and peer dependency on `better-sqlite3` confirmed. Single-user app means you register once and done — no complex user management needed. Actively maintained. | HIGH — verified via npm registry peer deps |

**Why not NextAuth (Auth.js) v4:** NextAuth v4 is the current stable (4.24.13) but works with Next.js Pages Router patterns. Auth.js v5 (beta) is still in `5.0.0-beta.30` — not production-ready.

**Why not Lucia v3:** Lucia v3 is stable (3.2.2) but the project is now in maintenance mode with the author recommending users migrate away. Avoid for new projects.

**Why not rolling your own:** Even for a single user, session management, CSRF, and secure cookie handling are non-trivial. Use a library.

**Single-user pattern with better-auth:** Create one admin user on first deployment. Protect all routes. No registration UI needed beyond the initial seed.

---

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| **Next.js Pages Router** | Legacy architecture. App Router is the standard for new Next.js projects from v13 onwards. Pages Router will not receive new features. |
| **Prisma ORM** | Generates native binaries, slower cold starts, less transparent SQL. Drizzle is strictly better for this use case. |
| **Redux / Redux Toolkit** | Overkill for this app's state complexity. Dashboard is primarily server-fetched data. Zustand + TanStack Query covers all state needs with 1/10th the boilerplate. |
| **Moment.js** | Deprecated. Mutable, large bundle. Use date-fns. |
| **Chart.js (react-chartjs-2)** | Canvas-based, less composable with React rendering model. Recharts (SVG, React-native) integrates more naturally with responsive layouts. |
| **MongoDB / NoSQL** | Financial data has strong relational structure: users → holdings → transactions → prices. SQL wins on query expressiveness (aggregations, JOINs for return calculations). |
| **tRPC** | Adds complexity without clear benefit when Next.js Route Handlers are already typed end-to-end with Zod. Justified on larger teams with complex APIs; not here. |
| **Separate Express/Fastify backend** | Unnecessary process. Next.js Route Handlers handle the API surface for a single-user app. |
| **NextAuth v5 (beta)** | Still in beta (`5.0.0-beta.30`). Not production-ready. |
| **Lucia** | Author has deprecated new adoption. Avoid for new projects. |
| **React Query v4** | v5 is stable and current. Don't pin to old major. |
| **Tailwind CSS v3** | Now in LTS-only (bug fixes, no features). v4 is the active release. |

---

## Key Tradeoffs

### SQLite vs PostgreSQL
**Chose SQLite.** For a single-user personal app deployed on a VPS or locally, SQLite with WAL mode handles all read/write patterns with zero ops overhead. PostgreSQL introduces a daemon process, connection pooling concerns, and backup complexity that offer nothing for this scale. If the app ever becomes multi-user, migrating Drizzle schemas from SQLite to PostgreSQL is mechanical — the ORM query code is nearly identical.

### Next.js (full-stack) vs Separate Frontend + Backend
**Chose Next.js monolith.** A separate React SPA + Express API is two deployment units, two build pipelines, and CORS configuration for zero benefit at single-user scale. Next.js Route Handlers are production-grade for this API surface. Server Components can pre-render dashboard data server-side, improving perceived load time.

### better-auth vs NextAuth
**Chose better-auth.** NextAuth v4 is stable but designed around the Pages Router era. Auth.js v5 isn't production-ready. better-auth is actively developed, TypeScript-first, and explicitly supports Next.js 16 + Drizzle + better-sqlite3 (confirmed via peer dependencies in npm registry). For a new project starting in 2026, it is the correct choice.

### Price API caching strategy
**Chose server-side cache in SQLite.** External price API free tiers are rate-limited. Calling them from the client on every dashboard render is unreliable. Instead: Route Handler checks `price_cache` table; if `fetched_at` is within threshold, returns cached value; otherwise fetches fresh and updates cache. Cron job (node-cron or Vercel Cron) proactively refreshes during market hours. This keeps the dashboard fast and API usage predictable.

### Recharts vs other charting libs
**Chose Recharts.** For the specific charts needed (line chart for return history, area for cumulative growth, pie/donut for allocation), Recharts covers all cases without canvas complexity. Nivo is beautiful but heavier. Victory is less maintained. D3 directly is engineering overhead that isn't justified.

---

## Installation Snapshot

```bash
# Scaffold
npx create-next-app@latest jackpot-pb \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"

# UI components
npx shadcn@latest init

# ORM + DB
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3

# Auth
npm install better-auth

# Data fetching + state
npm install @tanstack/react-query zustand

# Forms + validation
npm install react-hook-form zod @hookform/resolvers

# Charts + tables
npm install recharts @tanstack/react-table

# Date utilities
npm install date-fns

# Scheduling (if self-hosted)
npm install node-cron
npm install -D @types/node-cron

# Testing
npm install -D vitest @testing-library/react @testing-library/user-event @vitejs/plugin-react jsdom
```

---

## Sources

| Claim | Source | Method |
|-------|--------|--------|
| Next.js 16.2.3 latest stable | `npm info next dist-tags` | npm registry — HIGH confidence |
| React 19.2.5 latest stable | `npm info react dist-tags` | npm registry — HIGH confidence |
| TypeScript 5.8.x (via Next.js) | `npm info typescript version` | npm registry — HIGH confidence |
| Tailwind CSS 4.2.2 latest stable | `npm info tailwindcss dist-tags` | npm registry — HIGH confidence |
| shadcn CLI 4.2.0 latest | `npm info shadcn version` | npm registry — HIGH confidence |
| Recharts 3.8.1, React 19 compatible | `npm info recharts peerDependencies` | npm registry — HIGH confidence |
| @tanstack/react-query 5.96.2 | `npm info @tanstack/react-query dist-tags` | npm registry — HIGH confidence |
| Zustand 5.0.12 | `npm info zustand dist-tags` | npm registry — HIGH confidence |
| Drizzle ORM 0.45.2 | `npm info drizzle-orm version` | npm registry — HIGH confidence |
| drizzle-kit 0.31.10 | `npm info drizzle-kit version` | npm registry — HIGH confidence |
| better-sqlite3 12.8.0 | `npm info better-sqlite3 version` | npm registry — HIGH confidence |
| better-auth 1.6.1, Next.js 16 + Drizzle + better-sqlite3 support confirmed | `npm info better-auth peerDependencies` | npm registry — HIGH confidence |
| NextAuth v5 still beta (5.0.0-beta.30) | `npm info next-auth dist-tags` | npm registry — HIGH confidence |
| Lucia in maintenance mode | Training data — MEDIUM confidence (verify at lucia-auth.com) |
| Finnhub free tier limits | Training data — MEDIUM confidence (verify at finnhub.io/docs/api) |
| CoinGecko Demo tier free | Training data — MEDIUM confidence (verify at docs.coingecko.com) |
| Alpha Vantage free tier limits | Training data — MEDIUM confidence (verify at alphavantage.co/support) |
| Zod 4.3.6 stable | `npm info zod dist-tags` | npm registry — HIGH confidence |
| react-hook-form 7.54.2 | `npm info react-hook-form version` | npm registry — HIGH confidence |
| date-fns 4.1.0 | `npm info date-fns version` | npm registry — HIGH confidence |
| vitest 4.1.3 | `npm info vitest dist-tags` | npm registry — HIGH confidence |
| @tanstack/react-table 8.21.3 | `npm info @tanstack/react-table version` | npm registry — HIGH confidence |
