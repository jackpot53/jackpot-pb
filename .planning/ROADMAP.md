# Roadmap: jackpot-pb

**Milestone:** v1.0 — 연말 결산 MVP
**Generated:** 2026-04-09

## Overview

Build a single-user personal asset management web app in five phases. Phase 1 establishes the authenticated scaffold and correct data model — all money storage decisions must be right before anything else is built. Authentication and database are both handled by Supabase (PostgreSQL + Supabase Auth), eliminating the need for a separate auth library or local SQLite. Phase 2 adds complete asset and transaction CRUD so data can be entered. Phase 3 layers live price APIs onto the holdings math and delivers the working dashboard. Phase 4 adds the snapshot infrastructure and history charts — the year-end review feature. Phase 5 completes the v1 experience with goal tracking and per-asset performance comparison.

## Phases

- [ ] **Phase 1: Foundation** - Scaffold Next.js app with Supabase Auth and correct data schema on PostgreSQL
- [ ] **Phase 2: Asset & Transaction Management** - Full CRUD for assets, transactions, and manual valuations
- [ ] **Phase 3: Price Integration & Dashboard** - Live prices wired into holdings math; working portfolio dashboard
- [ ] **Phase 4: History & Charts** - Snapshot cron job and year-over-year / monthly return charts
- [ ] **Phase 5: Goals & Performance** - Investment goal tracking and per-asset performance comparison

## Phase Details

### Phase 1: Foundation
**Goal**: A deployed, authenticated app with the correct data schema that enforces all financial data constraints from day one
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02
**Success Criteria** (what must be TRUE):
  1. User can log in with email and password and remain logged in across multiple browser sessions and devices
  2. User can log out from any page and their session is immediately invalidated
  3. All database tables exist in Supabase (PostgreSQL) with integer money types, exchange rate fields, and `is_voided` flag on transactions
  4. Unauthenticated requests to any app route are redirected to the login page
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [x] 01-01-PLAN.md — Next.js 16 scaffold: all Phase 1 dependencies installed, shadcn/ui initialized, Wave 0 test infrastructure (vitest + middleware/schema tests)
- [ ] 01-02-PLAN.md — Drizzle schema for all 7 tables (BIGINT money, is_voided, append-only ManualValuation) + migration applied to Supabase
- [ ] 01-03-PLAN.md — Supabase Auth: SSR client factories, middleware route protection (getUser), login page (Korean UI spec), signIn/signOut Server Actions

---

### Phase 2: Asset & Transaction Management
**Goal**: Users can enter and manage all their assets and transaction history so the data foundation for portfolio math is complete
**Depends on**: Phase 1
**Requirements**: ASSET-01, ASSET-02, ASSET-03, ASSET-04
**Success Criteria** (what must be TRUE):
  1. User can create, edit, and delete assets of any type (stock/ETF/crypto/savings/real estate) with correct price type (live vs manual)
  2. User can record buy and sell transactions with date, quantity, price, and fee — and edit or void incorrect entries
  3. User can update the current value of a manual asset (real estate/savings) and the history of past valuations is preserved
  4. Weighted average cost basis is computed correctly for all transaction patterns (multiple buys, partial sells, buy after sell), verified by unit tests
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 02-01: Asset CRUD — API routes and UI for creating, listing, editing, and deleting assets with all type/currency fields
- [ ] 02-02: Transaction ledger — API routes and UI for buy/sell entry (with exchange rate capture), void/edit, and per-asset transaction list
- [ ] 02-03: Manual valuations — API routes and UI for updating real estate/savings values with append-only history
- [ ] 02-04: Holdings computation — Weighted average cost basis pure function with unit tests; holdings aggregate computed from transaction log

---

### Phase 3: Price Integration & Dashboard
**Goal**: Users can see their complete portfolio value in real time — total assets, allocation breakdown, and per-asset returns — on a single dashboard screen
**Depends on**: Phase 2
**Requirements**: PRICE-01, PRICE-02, DASH-01, DASH-02, DASH-03, DASH-04
**Success Criteria** (what must be TRUE):
  1. Stock and ETF prices refresh automatically via Finnhub; cryptocurrency prices via CoinGecko — all API keys are server-side only
  2. When a price API is unavailable, the dashboard shows the last cached price with its timestamp rather than showing zero or an error
  3. User can see total portfolio value, overall return %, and asset-type allocation pie chart on the dashboard
  4. User can see each holding's current value, average cost, and return % in a sortable list
  5. KRW and USD values are both shown simultaneously on the dashboard with live exchange rate conversion
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 03-01: Price API layer — Finnhub adapter (stocks/ETF), CoinGecko adapter (crypto), Bank of Korea FX rate, Supabase PostgreSQL price cache table with TTL and stale fallback
- [ ] 03-02: Portfolio computation — Wire prices into holdings math to produce current value, gain/loss KRW, and return % per asset; handle LIVE vs MANUAL asset types
- [ ] 03-03: Dashboard UI — Total asset value, overall return %, asset-type allocation pie chart, dual KRW/USD display
- [ ] 03-04: Per-asset performance list — Sortable table showing each holding with current value, avg cost, gain/loss KRW, return %

---

### Phase 4: History & Charts
**Goal**: Users can see how their total portfolio has grown over months and years, delivering the core year-end review feature
**Depends on**: Phase 3
**Requirements**: CHART-01, CHART-02, CHART-03
**Success Criteria** (what must be TRUE):
  1. A nightly cron job automatically records a portfolio snapshot each day so chart data accumulates without manual action
  2. User can view an annual return chart showing year-over-year total asset growth
  3. User can view a monthly chart showing total portfolio value across a rolling 12-month window
  4. Charts load from pre-computed snapshots — no live price API calls are made when viewing historical data
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 04-01: Snapshot infrastructure — PortfolioSnapshot write logic targeting Supabase PostgreSQL; nightly cron via node-cron calling a Next.js API route (or Supabase Edge Function with pg_cron if self-contained scheduling is preferred); monthly retention policy, daily prune after 12 months
- [ ] 04-02: History API — Query endpoint with date range and granularity parameters; backfill path from manual valuations for RE/savings assets
- [ ] 04-03: Charts UI — Annual return chart (year-over-year) and monthly portfolio value chart using Recharts; "data starts from [date]" message for new installs

---

### Phase 5: Goals & Performance Comparison
**Goal**: Users can set investment targets and see which assets contributed most and least to their portfolio performance
**Depends on**: Phase 4
**Requirements**: GOAL-01, GOAL-02, PERF-01, PERF-02
**Success Criteria** (what must be TRUE):
  1. User can create a goal with a target amount and optional target date and see their current achievement percentage on the dashboard
  2. User can view a chart showing their progress toward each goal over time
  3. User can view all holdings on a single screen ranked by return % to see which assets performed best and worst
  4. User can filter the performance view by asset type (stocks/crypto/savings/real estate) to compare within categories
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 05-01: Goal CRUD — API routes and UI for creating/editing/deleting goals; achievement % computed at read time from current portfolio total
- [ ] 05-02: Goal progress chart — Chart showing portfolio value vs goal target over time, using snapshot data
- [ ] 05-03: Performance comparison view — Sortable, filterable table of all assets ranked by return %; asset-type filter; uses TanStack Table

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 1/3 | In Progress|  |
| 2. Asset & Transaction Management | 0/4 | Not started | - |
| 3. Price Integration & Dashboard | 0/4 | Not started | - |
| 4. History & Charts | 0/3 | Not started | - |
| 5. Goals & Performance | 0/3 | Not started | - |
