# Architecture Research: Personal Asset Management Web App

**Project:** jackpot-pb
**Researched:** 2026-04-09
**Confidence:** HIGH (stable domain with well-established patterns; training data through August 2025)

---

## System Components

### Component Map

```
Browser (React SPA)
    │
    │  REST / JSON
    ▼
Express API Server (Node.js)
    ├── Auth middleware (JWT / session)
    ├── Assets router        → Asset CRUD, price type config
    ├── Transactions router  → Buy/sell record CRUD
    ├── Prices router        → External API fetch + cache
    ├── Snapshots router     → Historical value records
    └── Portfolio router     → Computed holdings, returns
         │
         ├── PostgreSQL (primary store)
         │     assets, transactions, snapshots, goals
         │
         └── External Price APIs
               ├── Yahoo Finance / Alpha Vantage (stocks/ETFs)
               └── CoinGecko / Binance (crypto)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| React SPA | Render dashboard, charts, forms; user interaction | API Server (REST) |
| Express API Server | Business logic, authentication, data access, external API orchestration | SPA, PostgreSQL, Price APIs |
| PostgreSQL | Durable storage: assets, transactions, snapshots, goals | API Server only |
| Price API adapters | Fetch and normalize live prices per asset type | API Server (internal) |
| Snapshot scheduler | Periodic job to record portfolio value at a point in time | Runs inside API Server process (cron/queue) |

**Key boundary rule:** The SPA never calls external price APIs directly. All price fetching and caching lives in the API server so that rate limits, API keys, and normalization are centralized.

---

## Core Data Models

### Asset

Represents a trackable holding — a "what" without quantity or price.

```
Asset {
  id            UUID PK
  name          string          // "Apple Inc.", "Seoul Apt"
  ticker        string | null   // "AAPL", "BTC" — null for manual assets
  asset_type    enum            // STOCK | ETF | CRYPTO | SAVINGS | REAL_ESTATE
  price_type    enum            // LIVE | MANUAL
  currency      string          // "USD", "KRW"
  notes         string | null
  created_at    timestamp
}
```

`price_type = LIVE` → current value derived from latest price API response × computed quantity.
`price_type = MANUAL` → current value taken from the latest `ManualValuation` record.

### Transaction

One buy or sell event for a LIVE-priced asset. Source of truth for quantity and cost basis.

```
Transaction {
  id            UUID PK
  asset_id      UUID FK → Asset
  type          enum            // BUY | SELL
  quantity      decimal(18,8)   // shares or coins
  price_per_unit decimal(18,8)  // price at trade time
  fee           decimal(18,8)   // brokerage/exchange fee
  traded_at     date            // date of trade (not entry time)
  currency      string          // currency of the price_per_unit
  notes         string | null
  created_at    timestamp
}
```

**No Transaction records for MANUAL assets** — they use ManualValuation instead.

### ManualValuation

Point-in-time value snapshot for non-live assets (real estate, savings).

```
ManualValuation {
  id            UUID PK
  asset_id      UUID FK → Asset
  value         decimal(18,2)   // total value of the asset at this moment
  currency      string
  valued_at     date            // effective date of the valuation
  notes         string | null
  created_at    timestamp
}
```

The most recent ManualValuation for an asset is its current value. Historical records power charts.

### PortfolioSnapshot

A recorded state of the entire portfolio (or per-asset) at a point in time. Powers time-series charts without re-computing from scratch every time.

```
PortfolioSnapshot {
  id            UUID PK
  snapshot_date date            // usually end of day / end of month
  total_value   decimal(18,2)
  currency      string          // normalized reporting currency
  breakdown     jsonb           // { asset_id: { value, cost_basis, gain_pct } }
  created_at    timestamp
}
```

**Two snapshot granularities:**
- Daily snapshots for the current year (powers monthly chart drill-down)
- Monthly snapshots retained indefinitely (powers annual/multi-year charts)

Snapshots are written by the scheduled job, not on-demand per request.

### Goal

Target value the user wants to reach.

```
Goal {
  id            UUID PK
  name          string
  target_value  decimal(18,2)
  currency      string
  target_date   date | null
  created_at    timestamp
}
```

Achievement % is computed at read time: `(current_portfolio_value / goal.target_value) * 100`.

### PriceCache (in-process or Redis)

Not a database table — an in-memory or Redis cache keyed by ticker+currency with a short TTL (1–15 minutes). Prevents hammering price APIs on every dashboard load.

```
PriceCache {
  key           string   // "AAPL:USD"
  price         decimal
  fetched_at    timestamp
  ttl_seconds   int
}
```

---

## Data Flow

### Dashboard Load (read path)

```
User opens dashboard
  → SPA: GET /api/portfolio/summary
  → API Server:
      1. Load all assets from DB
      2. For LIVE assets:
           a. Compute current_quantity and avg_cost from transactions (FIFO/AVCO)
           b. Fetch current prices from PriceCache (or call external API if stale)
           c. current_value = current_quantity × current_price
           d. gain = current_value - (avg_cost × current_quantity)
           e. gain_pct = gain / cost_basis × 100
      3. For MANUAL assets:
           a. Fetch latest ManualValuation per asset
           b. current_value = latest valuation
      4. Aggregate: total_value, allocation %, total gain %
      5. Return summary JSON
  → SPA: render dashboard
```

### Transaction Entry (write path)

```
User enters a buy/sell
  → SPA: POST /api/transactions { asset_id, type, quantity, price, traded_at }
  → API Server:
      1. Validate (asset exists, price_type = LIVE, quantity > 0)
      2. Insert Transaction row
      3. Invalidate PriceCache entry for this asset (optional — holdings change)
      4. Return updated holdings for this asset (recomputed on write)
  → SPA: update holdings display
```

### Manual Valuation Update (write path)

```
User updates real estate value
  → SPA: POST /api/assets/:id/valuations { value, valued_at }
  → API Server:
      1. Validate (asset exists, price_type = MANUAL)
      2. Insert ManualValuation row (append-only — don't update old record)
      3. Return new current_value
  → SPA: update asset card
```

### Historical Chart Load

```
User opens annual chart
  → SPA: GET /api/portfolio/history?granularity=monthly&from=2023-01&to=2025-12
  → API Server:
      1. Query PortfolioSnapshot where snapshot_date IN [range], granularity = monthly
      2. Return array of { date, total_value, breakdown }
  → SPA: render chart (Recharts / Chart.js)
```

### Snapshot Scheduler (background)

```
Cron job: runs once per day (e.g., 23:00 local time)
  → Compute current portfolio state (same as dashboard load)
  → Insert PortfolioSnapshot for today
  → Every 1st of month: also tag as a monthly snapshot
  → Prune daily snapshots older than 12 months (keep monthly)
```

---

## Suggested Build Order

Build order is driven by data dependencies: later components require earlier ones to be functional.

### Phase 1 — Data Foundation (no compute, no APIs)
1. Database schema: Asset, Transaction, ManualValuation tables
2. Asset CRUD endpoints (create/list/edit/delete)
3. Transaction CRUD endpoints (buy/sell entry, list per asset)
4. ManualValuation CRUD endpoints
5. Basic SPA scaffolding (routing, forms for the above)

**Why first:** Everything else — holdings, prices, charts — depends on having clean data entry and storage. This phase is independently testable without external APIs.

### Phase 2 — Holdings Computation (core portfolio math)
1. Implement holdings calculator: transactions → current_quantity, avg_cost, cost_basis
2. GET /api/portfolio/holdings — returns computed state per asset (no prices yet, only quantity/cost data)
3. SPA: holdings table view (shows quantity, avg cost — placeholder for current value)

**Why second:** The math must be correct before layering in prices. Isolated unit-testable.

### Phase 3 — Live Price Integration
1. Price API adapters (stock: Yahoo Finance or Alpha Vantage; crypto: CoinGecko)
2. In-memory price cache with TTL
3. Wire prices into holdings computation → current_value, gain, gain_pct per asset
4. Dashboard summary: total value, allocation breakdown, overall return %
5. SPA: full dashboard view

**Why third:** Prices are layered on top of correct holdings data. Adapters are isolated and swappable.

### Phase 4 — Time-Series History
1. PortfolioSnapshot schema and insert logic
2. Snapshot scheduler (node-cron or equivalent)
3. History query endpoint: /api/portfolio/history
4. SPA: annual/monthly chart component

**Why fourth:** Snapshots require the full portfolio computation (Phase 3) to work. Can backfill from ManualValuation history for manual assets.

### Phase 5 — Goals + Polish
1. Goal model and CRUD
2. Achievement % computation at read time
3. Per-asset performance comparison view
4. SPA: goals tracker, asset comparison screen

**Why last:** Additive features; no other components depend on goals.

---

## Key Architectural Decisions

### Decision 1: Compute Holdings on Read, Not Store

**Approach:** Current quantity and average cost are computed from the transaction log on every request, not stored as a "current holdings" table.

**Rationale:** Storing derived state creates a dual-write problem — you'd have to update both the Transaction table and the Holdings table atomically on every trade. Computing from the ledger is the standard ledger pattern (used by every brokerage system). For a single user with at most a few hundred transactions, compute cost is negligible.

**Trade-off:** If transaction counts grow to thousands, add a `holdings_cache` table that is lazily recomputed and invalidated on new transactions. Not needed for MVP.

### Decision 2: Dual Asset Type (LIVE vs MANUAL)

**Approach:** Asset has a `price_type` flag that determines whether current value comes from the price API × quantity, or from the latest ManualValuation.

**Rationale:** Real estate and savings have no reliable public APIs. Manual entry with append-only history gives the user full control without requiring external integrations. The type flag lets the API handle both without branching in the SPA.

**Implementation note:** Transactions are only created for LIVE assets. ManualValuations are only created for MANUAL assets. The API should enforce this at write time.

### Decision 3: Append-Only Valuations (Not Update-In-Place)

**Approach:** Each manual update inserts a new ManualValuation row. Old records are never modified.

**Rationale:** Preserves full history for charts. A user who set their apartment value in Jan 2024 and updates it in Jan 2025 should see both data points on the chart. Update-in-place would destroy the historical record.

### Decision 4: PortfolioSnapshot for Charts, Not Live Recompute

**Approach:** Historical charts read from pre-computed PortfolioSnapshot rows. They are NOT re-derived from transactions + historical prices on every chart load.

**Rationale:** Re-deriving historical portfolio values requires knowing what prices were on every past date. That requires either storing all historical price data (expensive) or querying historical prices from external APIs (slow, rate-limited, sometimes paywalled). Pre-computing once per day and storing the result is simpler and faster.

**Implication for build order:** Snapshot backfill will be needed when the scheduler is introduced — the user won't have historical snapshots until the scheduler has been running. Provide a "backfill from manual valuations" path for MANUAL assets on day one; for LIVE assets, accept that historical chart data starts from when the scheduler begins running (or provide a manual "record today's value" button earlier in the build).

### Decision 5: Single-Process Architecture for MVP

**Approach:** The cron scheduler runs inside the same Node.js process as the Express API server, not as a separate service.

**Rationale:** Single user, single server deployment. A separate scheduler process adds operational complexity (two processes to deploy, restart, monitor) with no benefit at this scale. If the app ever needs horizontal scaling, extract the scheduler then.

### Decision 6: Normalized Reporting Currency

**Approach:** All aggregated totals (portfolio total, goal comparison) are normalized to a single reporting currency (KRW or USD, user-configurable). Individual asset prices are stored in their native currency and converted at read time using a daily exchange rate.

**Rationale:** The user holds Korean stocks (KRW), US stocks (USD), and potentially crypto (USD). Without normalization, you can't add them up. Exchange rate source needs to be identified (Bank of Korea API for KRW/USD is free and reliable).

**Implication:** The data model needs `currency` fields throughout. The price adapter layer must handle FX conversion. This is a Phase 3 complexity item.

---

## Component Communication Summary

| From | To | Protocol | Notes |
|------|----|----------|-------|
| SPA | API Server | HTTP REST, JSON | All API calls are authenticated |
| API Server | PostgreSQL | TCP (pg driver) | Connection pooled |
| API Server | Price APIs | HTTPS | Rate-limited; cached in memory |
| API Server | Scheduler | In-process | node-cron triggers inside same process |
| Scheduler | API Server logic | Function call | Reuses same portfolio computation code |

---

*Sources: Training knowledge (portfolio tracking domain, ledger accounting patterns, Node.js architecture). Confidence: HIGH for domain patterns, MEDIUM for specific library choices (verify current versions at implementation time).*
