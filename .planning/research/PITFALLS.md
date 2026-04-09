# Pitfalls Research: Personal Asset Management Web App

**Domain:** Personal portfolio tracker — stocks/ETF (KR/US), crypto, savings accounts, real estate
**Researched:** 2026-04-09
**Confidence:** HIGH (well-documented domain with decades of prior art and known failure modes)

---

## Critical Pitfalls

### 1. Floating-Point Money Arithmetic

**What goes wrong:** Using JavaScript `number` (IEEE 754 double) for all financial values causes silent precision errors that compound across calculations. Classic example: `0.1 + 0.2 === 0.30000000000000004`. In a portfolio tracker, multiplying price × quantity across dozens of holdings accumulates enough drift to make displayed totals wrong by small but visible amounts.

**Warning signs:**
- Total portfolio value displayed as ₩12,345,678.000000002
- "Total return" percentage differs by 0.01% depending on calculation order
- Rounding only at display layer still shows drift in intermediate sum steps

**Prevention:**
- Store all monetary amounts as integers in the smallest denomination (KRW: won, not won with decimals; USD: cents; BTC: satoshis). Crypto requires at least 8 decimal places → store as integer × 10^8.
- For calculation-heavy operations (return %, allocation %), use a decimal library: `decimal.js` or `big.js` are the standard JavaScript choices. Only convert back to display float at render time.
- Never round intermediate values — only round the final displayed result.
- Define a canonical precision per asset class: KRW (0 decimals), USD (2), BTC (8), ETH (18 is overkill for display — store 8).

**Phase:** Data model design phase (first milestone). Retrofitting integer storage after tables are created is painful.

---

### 2. Mixing Multi-Currency Values Without Explicit Exchange Rates

**What goes wrong:** The project tracks KRW and USD assets (Korean stocks + US stocks/ETF + crypto, which often prices in USD). A common mistake is storing all values in a single "amount" column and converting to KRW at display time using a hardcoded or today's rate — then comparing these values to historical transactions that were implicitly converted differently. The result: historical return calculations are wrong because the exchange rate at purchase time differs from today's rate.

**Warning signs:**
- US stock "return" swings dramatically even when the stock didn't move (currency effect)
- Historical portfolio total doesn't match what user remembers
- "Total return" for a USD asset purchased 2 years ago is computed using today's USD/KRW rate

**Prevention:**
- Store every transaction with its original currency AND the KRW equivalent at transaction time (snapshot the exchange rate at entry). Schema: `amount_original BIGINT`, `currency CHAR(3)`, `amount_krw_at_time BIGINT`, `exchange_rate_at_time DECIMAL(10,4)`.
- For current valuation: fetch both the current asset price AND current USD/KRW rate, compute `current_value_krw = current_price_usd × current_exchange_rate × quantity`.
- Return in KRW = `current_value_krw - cost_basis_krw` where cost_basis uses the exchange rate at purchase time, not today.
- Display both currency-return and FX-return separately if precision matters later.

**Phase:** Data model design phase (first milestone). Cannot be retrofitted without rebuilding all historical data.

---

### 3. Cost Basis Calculation Method Not Chosen Upfront

**What goes wrong:** For assets with multiple purchases at different prices, there are multiple valid methods to compute cost basis: FIFO (first-in, first-out), LIFO (last-in, first-out), and weighted average (평균단가). The project already decided on transaction-based recording — but NOT specifying which averaging method early leads to inconsistent displayed returns. Weighted average is the standard for Korean retail investors (증권사 앱 모두 평균단가 사용); FIFO is the US tax standard.

**Warning signs:**
- "Average price" shown to user doesn't match what their broker shows
- After a partial sell, remaining cost basis recalculates differently depending on when you look
- Return calculation gives different answers depending on query order

**Prevention:**
- Choose one method and make it explicit in the data model and codebase. For a Korean personal tracker: **weighted average (가중평균단가)** matches user expectation and Korean brokerage conventions.
- Implement a pure function `computeWeightedAvgCostBasis(transactions[]) → { avgCost, totalUnits, totalCostBasis }` that is tested in isolation.
- When a sell occurs: do NOT delete buy transactions. Record the sell as a separate transaction, and recalculate avg cost basis on the remaining units.
- Formula: `new_avg = (old_avg × old_qty + new_price × new_qty) / (old_qty + new_qty)`.
- On partial sale: cost basis of sold units = `avg_cost × sold_qty`; remaining avg cost stays the same (weighted average doesn't change on sale, only on additional buys).

**Phase:** Core transaction logic phase. Define the algorithm, write unit tests for it, then build UI on top.

---

### 4. External Price API as Single Point of Failure

**What goes wrong:** Portfolio trackers fetching live prices from a single free API (Yahoo Finance unofficial, Alpha Vantage free tier, etc.) fail silently or catastrophically when the API is rate-limited, goes down, or changes its response format. The dashboard shows stale/zero prices with no indication to the user. Since this app is personal and always-on, it hits rate limits faster than expected.

**Warning signs:**
- Dashboard shows ₩0 total for entire portfolio when price API returns 429 or 5xx
- Price data is 15-minutes stale but displayed as "real-time"
- API response format changes silently (common with unofficial APIs)

**Prevention:**
- Cache the last known price in the database. Schema: `asset_prices { ticker, price, currency, fetched_at, source }`. Never delete — keep historical.
- On API failure, display last cached price with a "as of [time]" indicator. Never show ₩0.
- Implement a price fetch abstraction layer with fallback: primary API → fallback API → cached price → error state.
- For Korean stocks (KRX): use official or established APIs. Options: KIS Developers API (한국투자증권), FinanceDataReader (Python-based but has JS equivalents), or Naver Finance scraping (fragile — avoid for primary).
- For US stocks/ETF: Alpha Vantage (free tier: 25 req/day), Polygon.io (free tier), or Yahoo Finance via unofficial libraries (unstable).
- For crypto: CoinGecko free API (50 req/min) is reliable; Binance API has no rate limit issue for single user.
- Rate limiting strategy: batch all tickers into a single API call when possible. KRX tickers and US tickers require separate API calls — schedule them staggered, not concurrent.

**Phase:** Price integration phase. Build the caching layer first, then wire up APIs.

---

### 5. Snapshot vs. Live Calculation Architecture Decision

**What goes wrong:** Two competing approaches exist for portfolio valuation history:
1. **Calculate on the fly**: Store only transactions, recalculate portfolio value at any date by replaying transactions with historical prices.
2. **Snapshot**: Periodically (daily/monthly) save the computed portfolio value to a `snapshots` table.

Projects that choose "calculate on the fly" discover two problems: (a) fetching historical price data for every ticker for every date is slow and expensive, and (b) free APIs don't provide historical intraday prices. Projects that only use snapshots discover they can't backfill if the snapshot job failed.

**Warning signs:**
- Querying 2-year return requires fetching 500+ price data points from external API
- Monthly chart takes 3+ seconds to load
- Missing snapshots create gaps in the annual/monthly history chart

**Prevention:**
- Hybrid model: Store transactions (source of truth for cost basis) + store daily/monthly price snapshots in a local `price_history` table.
- Run a nightly job that records current prices to `price_history`. After 1 year, you have all historical data locally without hitting external APIs for history.
- Also store `portfolio_snapshots { date, total_value_krw, unrealized_gain_krw }` monthly. This is what the annual/monthly chart reads — it never hits external APIs.
- For the first run (backfill): accept that history before the app started is unavailable unless manually entered. This is fine for a personal tracker.

**Phase:** Data model and jobs/scheduling phase. Define snapshot schema upfront; backfill is not worth the complexity for a personal app.

---

### 6. Time Zone Confusion for Market Hours and Transaction Dates

**What goes wrong:** The Korean stock market (KRX) runs 09:00–15:30 KST. US markets run 09:30–16:00 EST (UTC-5) = 23:30–06:00 KST next day. A transaction recorded at "2024-01-05" from a Korean user's perspective may be "2024-01-04" in UTC, causing date mismatches in portfolio history. Crypto runs 24/7 UTC. This creates off-by-one errors in "what was my portfolio worth on Jan 5th?"

**Warning signs:**
- Portfolio chart shows wrong day for historical events
- US stock transactions show purchase date one day earlier than expected
- "December 31st annual snapshot" captures US market close from Dec 30th KST

**Prevention:**
- Store all timestamps as UTC in the database. Always.
- Store the user's local date separately as a `transaction_date DATE` field (user-entered, "I bought this on 2024-01-05 in Korea"). This is the date the user sees and cares about. Separate from `created_at TIMESTAMPTZ`.
- For the annual/monthly return chart: key on `transaction_date` (user's date), not UTC timestamp.
- For price fetches: use the market's local date. KRX price for "2024-01-05" means Jan 5 at 15:30 KST. US price for "2024-01-04" means Jan 4 at 16:00 EST.
- For the year-end snapshot (core use case): "December 31st" = last trading day of the year in each market's local time. Document this convention explicitly in code.

**Phase:** Data model phase (store UTC + local date). Price fetch phase (market-aware date handling).

---

### 7. Percentage Return Formula Confusion

**What goes wrong:** Multiple "return" formulas exist and they give different answers:
- Simple return: `(current - cost) / cost`
- Time-weighted return (TWR): adjusts for cash flows, standard for fund performance
- Money-weighted return (MWR / IRR): adjusts for timing of investments, personal finance standard

A tracker that uses simple return gives misleading results when the user made multiple purchases over time. Example: bought ₩1M in 2020, bought ₩10M more in 2024 at peak. Simple return says +15%; MWR says -3% (because most money went in at the peak).

**Warning signs:**
- "Annual return" doesn't match any calculation the user can verify manually
- Large later investments distort the displayed "total return" in confusing ways
- Return percentage shown for "2023" includes the effect of a large deposit made in December 2023

**Prevention:**
- For a personal tracker displaying "how much did I make?": MWR (personal rate of return) is most meaningful, but complex to implement.
- Pragmatic approach: show **two numbers** — (1) Total profit/loss in KRW (`current_value - total_cost_basis`), and (2) Simple return % (`profit / total_cost_basis`). These are easy to understand and verify.
- For the annual chart: show absolute KRW gain per year, not %. Users understand "I made ₩5M in 2024" better than "23.4% TWR."
- Defer IRR/TWR to a later phase once simpler metrics are working correctly.
- Label formulas in the UI: "Total return %" = "(current - invested) / invested × 100". No ambiguity.

**Phase:** Return calculation phase. Start with simple return, label it clearly. Add TWR/MWR only if user-requested.

---

### 8. N+1 Query Pattern in Asset Aggregation

**What goes wrong:** The dashboard aggregates multiple asset types (stocks, crypto, savings, real estate). Naive implementations query each asset separately: one query for stocks, then for each stock one query for transactions, then for each stock one query for latest price. With 20 holdings, this becomes 40+ database queries per page load.

**Warning signs:**
- Dashboard takes 2+ seconds to load
- Adding a new asset linearly increases load time
- Database query count visible in dev tools shows 30+ queries per request

**Prevention:**
- Design queries to aggregate at the database level. Use JOINs to fetch assets + their latest prices + transaction summaries in 2-3 queries, not N+1.
- Precompute cost basis and unit count at write time (on insert of transaction, update a `holdings` summary table). This avoids replaying all transactions on every read.
- The `holdings` table schema: `{ asset_id, total_units, avg_cost_krw, total_invested_krw }` — updated atomically when a transaction is recorded.
- Dashboard query: `SELECT holdings.*, asset_prices.price FROM holdings JOIN assets JOIN asset_prices WHERE asset_prices.fetched_at > NOW() - INTERVAL '1 hour'`. One query, full dashboard data.

**Phase:** Data model phase. Define `holdings` as a derived/maintained aggregate from the start.

---

### 9. Treating Manual-Entry Assets (Real Estate, Savings) as Second-Class Citizens

**What goes wrong:** The app tracks stocks with beautiful real-time data and then handles real estate/savings with a single "current value" field that doesn't fit the same data model. Return calculation for savings accounts is never implemented because interest rate logic differs. Real estate "cost basis" (original purchase price + renovation costs) doesn't fit the transaction model. These assets end up not appearing in the annual return chart, breaking the core value proposition.

**Warning signs:**
- Annual "total return" doesn't include real estate
- Savings account shows ₩50M balance but ₩0 return (interest never tracked)
- User can't see what % of portfolio is in real estate vs stocks

**Prevention:**
- Define a unified abstract interface for all assets: `{ current_value_krw, cost_basis_krw, unrealized_gain_krw, asset_type }`. Every asset type must implement this interface.
- For savings accounts (예적금): store principal + interest rate + start date. Calculate current value as `principal × (1 + rate)^(days/365)`. Or allow manual "current value" update.
- For real estate (부동산): store purchase price as cost basis, allow periodic manual "current value" updates. Return = `(latest_manual_value - purchase_price) / purchase_price`.
- All asset types participate in the total portfolio value and annual return calculation identically.

**Phase:** Core data model phase. Define the abstract interface before implementing any specific asset type.

---

### 10. No Audit Trail / Transaction Immutability

**What goes wrong:** Users delete or edit transactions when they make a data entry mistake. Without an audit trail, the portfolio history becomes inconsistent — the user records a purchase on Jan 5th, then edits the date to Jan 3rd, and the monthly chart for January now shows different values than it did last week. For the "annual return" use case, historical consistency is critical.

**Warning signs:**
- Editing a transaction date changes historical chart values retroactively
- User can't explain why their "2023 return" is different from what they remember seeing
- Deleting a transaction makes cost basis negative or impossible

**Prevention:**
- Transactions are append-only. Never update or delete a transaction record.
- To "fix" a mistaken entry: create a correcting transaction (or a soft-delete flag `is_voided BOOLEAN` with a paired voiding transaction).
- Alternatively: allow editing only within a short window (e.g., same day), then lock.
- Keep `portfolio_snapshots` immutable once created. Monthly snapshot of Jan 2024 never changes.

**Phase:** Transaction recording phase. Establish immutability convention before any insert/update routes are built.

---

## Financial Calculation Landmines

### Floating-Point Specific Cases

| Calculation | Naive (wrong) | Correct |
|-------------|--------------|---------|
| KRW totals | `sum(prices.map(Number))` | `sum prices as BigInt KRW integers` |
| USD × quantity | `3.47 * 15` | `decimal.js: new Decimal('3.47').times(15)` |
| Return % | `(current - cost) / cost * 100` | Same formula but on Decimal types, round only at display |
| Weighted avg | `(old * qty1 + new * qty2) / total` | Use integer arithmetic throughout, divide last |

### Crypto-Specific Precision

- Bitcoin: 8 decimal places (1 satoshi = 0.00000001 BTC). Store as integer satoshis.
- Ethereum: 18 decimal places but 8 is sufficient for display. Store as gwei (10^9) or use BigInt.
- Stablecoins priced in USD: treat as USD asset, same 2-decimal precision.
- Crypto prices can be sub-cent (altcoins): use 8-decimal precision for prices too.

### Exchange Rate Handling

- KRW/USD changes 1-3% per day. Storing cost basis in KRW at time-of-purchase is mandatory.
- Free exchange rate APIs: ExchangeRate-API (free tier: 1500 req/month), Open Exchange Rates (free), or Korean specific: Bank of Korea API (한국은행 Open API — official, free, reliable for KRW rates).
- Fetch exchange rate at transaction entry time and store it. Don't rely on being able to fetch the "Jan 5th 2024" rate later from a free API.

---

## API Reliability Issues

### Korean Stock APIs

| API | Reliability | Rate Limit | Cost | Notes |
|-----|-------------|------------|------|-------|
| KIS Developers (한국투자증권) | HIGH | generous | Free (account required) | Official, requires KIS brokerage account |
| FinanceDataReader | MEDIUM | library-based | Free | Python-first; JS wrapper exists but less maintained |
| Naver Finance scraping | LOW | aggressive anti-scraping | Free | Will break; do not use as primary |
| KRX OpenAPI | HIGH | limited | Free | Official but limited to EOD prices, not real-time |

### US Stock / ETF APIs

| API | Reliability | Free Tier | Notes |
|-----|-------------|-----------|-------|
| Alpha Vantage | MEDIUM | 25 req/day | Sufficient for single user if cached |
| Polygon.io | HIGH | 5 req/min unlimited calls | Good free tier for single user |
| Yahoo Finance (yfinance) | LOW | unofficial | Format changes without notice; avoid for production |

### Crypto APIs

| API | Reliability | Free Tier | Notes |
|-----|-------------|-----------|-------|
| CoinGecko | HIGH | 50 req/min | Best free option; supports KRW pricing directly |
| Binance | HIGH | generous | Good for spot prices; overkill if not a Binance user |
| CoinMarketCap | MEDIUM | 333 req/day | Fine for single user |

### Circuit Breaker Pattern

For a single-user app, implement simple fallback:
```
fetchPrice(ticker):
  try:
    price = await externalAPI.fetch(ticker)
    await db.upsert('asset_prices', { ticker, price, fetched_at: now() })
    return price
  catch:
    return await db.findLatest('asset_prices', ticker) // stale price with timestamp
```
Never throw to UI. Always return something. Label staleness.

---

## Data Model Design Pitfalls

### Anti-Pattern: Storing Only "Current" Values

```sql
-- WRONG: no history, no cost basis, can't calculate return
CREATE TABLE assets (
  id UUID,
  name TEXT,
  current_value NUMERIC,
  updated_at TIMESTAMP
);
```

```sql
-- CORRECT: transactions as source of truth + maintained holdings summary
CREATE TABLE transactions (
  id UUID,
  asset_id UUID,
  type ENUM('buy', 'sell', 'dividend'),
  quantity DECIMAL(20,8),
  price_per_unit DECIMAL(20,8),
  currency CHAR(3),
  price_krw_at_time BIGINT,        -- KRW value at time of transaction
  exchange_rate_at_time DECIMAL(10,4), -- for non-KRW transactions
  transaction_date DATE,            -- user's local date (what they see)
  created_at TIMESTAMPTZ,          -- UTC system time
  is_voided BOOLEAN DEFAULT FALSE
);

CREATE TABLE holdings (
  asset_id UUID PRIMARY KEY,
  total_units DECIMAL(20,8),
  avg_cost_krw BIGINT,             -- weighted average cost in KRW
  total_invested_krw BIGINT        -- sum of all buy transactions in KRW
);

CREATE TABLE asset_prices (
  asset_id UUID,
  price DECIMAL(20,8),
  currency CHAR(3),
  price_krw BIGINT,                -- converted to KRW at fetch time
  fetched_at TIMESTAMPTZ,
  PRIMARY KEY (asset_id, fetched_at)
);

CREATE TABLE portfolio_snapshots (
  snapshot_date DATE,              -- usually monthly or on-demand
  total_value_krw BIGINT,
  total_invested_krw BIGINT,
  unrealized_gain_krw BIGINT,
  created_at TIMESTAMPTZ
);
```

### Anti-Pattern: No Asset Type Abstraction

Mixing asset-type-specific logic into generic queries without a type discriminator forces ugly conditionals everywhere. Define `asset_type ENUM('stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'savings', 'real_estate')` from day one.

---

## Performance Considerations

### Growing Transaction History

For a single user over 5 years, even an aggressive investor won't exceed 2,000 transactions. PostgreSQL or SQLite handle this trivially. Performance is NOT a concern at this scale.

The only performance concern is: **external API latency** (100ms–3s per price fetch). Mitigate by:
1. Batch price fetch at app startup / on page load, not per-asset-render
2. Cache in DB with 15-minute TTL for live prices
3. Serve cached prices from DB instantly; update in background

Do not over-engineer for scale that will never be reached for a single-user app.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Data model | Float money types | Use integer KRW storage from the start |
| Data model | Single currency assumption | Add `currency` + `exchange_rate_at_time` to transactions |
| Data model | No holdings aggregate | Add `holdings` table updated on every transaction write |
| Transaction recording | Allowing edit/delete | Enforce append-only or voiding pattern |
| Price integration | Single API dependency | Cache in DB; build abstraction layer with fallback |
| Return calculation | Formula ambiguity | Pick one method (simple return), label it explicitly |
| Annual chart | No snapshot table | Define `portfolio_snapshots` before building any chart |
| Asset types | Real estate/savings excluded | Define unified `{ current_value, cost_basis }` interface early |
| Korean market | Naver Finance scraping | Use KIS API or KRX OpenAPI instead |
| Cost basis | FIFO vs weighted avg | Commit to weighted average (Korean convention) in code comments |

---

## Sources

**Confidence:** HIGH — These pitfalls are drawn from the well-documented failure modes of financial software. Key sources in training data include:

- IEEE 754 floating-point behavior in JavaScript: canonical, documented in ECMAScript spec
- Decimal.js and Big.js library documentation: standard JS financial arithmetic libraries
- Weighted average cost basis (평균단가): documented by FSS (금융감독원) and standard in all Korean brokerage systems
- Time zone / market hours: KRX (Korea Exchange) published hours, NYSE published hours
- API reliability: CoinGecko, Alpha Vantage, Polygon.io, KIS Developers — all have publicly documented rate limits and SLAs
- Bank of Korea OpenAPI (한국은행 경제통계시스템): official public API for KRW exchange rates

Note: WebSearch was unavailable during this research session. All findings are from training data (cutoff August 2025). Confidence is HIGH because these are structural/mathematical pitfalls that do not change with time, and the APIs listed are established services whose free tiers and reliability characteristics are stable and well-known.
