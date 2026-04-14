# Research Summary: jackpot-pb

**Project:** jackpot-pb (개인 자산 관리 웹앱)
**Domain:** Personal asset/portfolio tracking — stocks, ETF, crypto, savings, real estate
**Researched:** 2026-04-09
**Confidence:** HIGH

---

## Executive Summary

jackpot-pb is a single-user personal finance tracker whose core value is the year-end review: one screen showing total asset growth, per-asset performance, and investment goal progress. The domain is well-understood, and the patterns are stable. The recommended build is a Next.js 16 fullstack monolith (App Router) backed by SQLite via Drizzle ORM, with better-auth for authentication and Finnhub + CoinGecko for price data. This eliminates operational overhead (no separate API server, no PostgreSQL daemon) while remaining fully capable for single-user workloads.

The most important architectural decision is to treat the transaction ledger as the immutable source of truth and compute derived state (holdings, cost basis, return %) from it. Portfolio history for charts is served from pre-computed monthly snapshots written by a background cron job — this avoids dependency on historical price APIs and keeps chart loads fast. All external price API calls are proxied through Next.js Route Handlers so API keys stay server-side and responses are cached in SQLite with a configurable TTL.

The highest-risk areas are the data model and financial calculation layer, which must be correct before any UI is built because retrofitting is painful. Specifically: money must be stored as integers (never floats), every transaction must capture the exchange rate at the time of entry, and cost basis must use weighted average (Korean convention) from day one.

---

## Recommended Stack

| Layer | Choice | Version | Notes |
|-------|--------|---------|-------|
| Framework | Next.js (App Router) | 16.2.3 | Fullstack monolith — frontend + API in one deployment |
| Language | TypeScript | 5.8.x | Non-negotiable for financial data |
| Styling | Tailwind CSS | 4.2.2 | v4 current stable; v3 is LTS-only |
| UI Components | shadcn/ui | 4.2.0 (CLI) | Copy-paste Radix-based components; full code ownership |
| Charts | Recharts | 3.8.1 | SVG-based, React-native, covers all chart types needed |
| Data Tables | @tanstack/react-table | 8.21.3 | Headless table for per-asset performance list |
| Forms + Validation | react-hook-form + Zod | 7.54.2 / 4.3.6 | Minimal re-renders + end-to-end schema validation |
| Server state | @tanstack/react-query | 5.96.2 | Price API caching, stale-while-revalidate |
| Client state | Zustand | 5.0.12 | UI preferences only; no Redux needed |
| Date handling | date-fns | 4.1.0 | Tree-shakeable, immutable |
| Database | SQLite via better-sqlite3 | 12.8.0 | Correct choice for single-user; zero infra overhead |
| ORM | Drizzle ORM + drizzle-kit | 0.45.2 / 0.31.10 | TypeScript-native, SQL-transparent, migration support |
| Auth | better-auth | 1.6.1 | TypeScript-first, Next.js 16 + Drizzle + SQLite confirmed |
| Stock prices | Finnhub | — | 60 req/min free; covers US markets (KRX coverage unconfirmed) |
| Crypto prices | CoinGecko | — | 30 req/min Demo tier; free |
| FX rates | Bank of Korea OpenAPI | — | Official, free, reliable KRW rates |
| Scheduling | node-cron | 4.2.1 | In-process cron for snapshot job |
| Testing | Vitest + Testing Library | 4.1.3 | Unit tests for financial calculation functions |

**Decimal arithmetic:** All monetary values stored as integers in smallest denomination. Use `decimal.js` for intermediate calculations. Never use JS `number` for currency math.

---

## Table Stakes Features (v1 Must-Haves)

1. **User authentication** — single user, email/password, multi-device access via session
2. **Asset registry** — define assets with type (stock/ETF/crypto/savings/RE) and price type (live/manual)
3. **Transaction ledger** — immutable buy/sell records with quantity, price, fee, date, currency
4. **Cost basis calculation** — weighted average (가중평균단가), matching Korean brokerage convention
5. **Manual valuation updates** — append-only history for real estate and savings/deposits
6. **Live price integration** — stocks via Finnhub, crypto via CoinGecko, proxied through server with DB cache
7. **Current value per asset** — live price × quantity (market assets); latest manual entry (RE/savings)
8. **Total asset dashboard** — total KRW value, gain/loss KRW + %, allocation pie chart by asset type
9. **Per-asset performance list** — sortable by return %, gain/loss KRW; shows avg cost vs current price
10. **Monthly return history chart** — rolling 12-month portfolio value (from snapshots)
11. **Annual return history chart** — year-over-year total asset growth (the core year-end review feature)
12. **Investment goal tracking** — target KRW amount, current progress %, optional target date

---

## Top Pitfalls to Avoid

1. **Floating-point money arithmetic** — Store all monetary values as integers (KRW in won, USD in cents, BTC in satoshis × 10^8). Use `decimal.js` for intermediate calculations. Retrofitting this after schema creation is extremely painful. Must be done in Phase 1.

2. **Missing exchange rate at transaction time** — Every non-KRW transaction must store `price_krw_at_time` and `exchange_rate_at_time` at moment of entry. Historical rate APIs are unreliable. Bank of Korea OpenAPI provides free official KRW rates. Must be in the data model from day one.

3. **No snapshot table for historical charts** — Building annual charts by replaying transactions against historical price APIs is slow, expensive, and breaks on API changes. Define `portfolio_snapshots` schema in Phase 1, write it with a nightly cron in Phase 4. Charts never hit external APIs.

4. **Single price API with no fallback** — Yahoo Finance unofficial endpoints break without notice; free tier limits are tight. Build a price fetch abstraction layer: primary API → fallback API → last cached DB price. Display "as of [time]" on stale data. Never show ₩0 on API error.

5. **Cost basis method not committed upfront** — Weighted average (가중평균단가) is the correct choice for a Korean personal tracker — it matches what Korean brokerages display. Implement as a pure function with comprehensive unit tests before building any UI that consumes return numbers.

**Additional:** Transactions must be append-only (use `is_voided` flag for corrections, never UPDATE/DELETE). Maintain a `holdings` aggregate table updated on every write to prevent N+1 queries on dashboard load. Store `transaction_date` (user-entered local date) separately from `created_at` (UTC) — key all charts on `transaction_date`.

---

## Suggested Build Order

### Phase 1: Data Foundation
Schema design and CRUD. Everything downstream depends on these decisions being correct.

- Database schema: Asset, Transaction, ManualValuation, Holdings (aggregate), AssetPrices (cache), PortfolioSnapshot (define now, write later), Goal
- Asset CRUD endpoints and UI (type, price_type, currency)
- Transaction CRUD endpoints and UI (buy/sell, with exchange rate capture)
- Manual valuation entry UI (RE/savings)
- better-auth setup (single user, email/password)
- Drizzle schema with integer money types throughout

**Critical constraints:** Integer money storage. Exchange rate fields on all transactions. `transaction_date` (local) vs `created_at` (UTC). `is_voided` flag. All asset types in schema from day one.

### Phase 2: Holdings Computation and Portfolio Math
Financial calculation layer, verified in isolation before prices are added.

- Weighted average cost basis as a pure, unit-tested function
- Holdings aggregate updated atomically on every transaction write
- GET /api/portfolio/holdings — per-asset quantity, avg cost, total invested (no prices yet)
- Holdings list UI (shows cost-side data; current value placeholder)

**Critical:** Unit test coverage for all cost basis edge cases (multiple buys, partial sell, buy after sell) before any price integration.

### Phase 3: Live Price Integration and Dashboard
Layer prices onto correct holdings math; deliver the working dashboard.

- Price fetch abstraction layer with DB cache and stale fallback
- Finnhub adapter (stocks/ETF), CoinGecko adapter (crypto)
- Bank of Korea API for KRW/USD exchange rate
- Current value per asset computation (price × quantity, FX-converted)
- Total asset dashboard: total value, allocation pie chart, overall return %
- Per-asset performance list (full: return %, gain/loss KRW, current vs avg cost)

**Research needed:** Confirm Finnhub KRX (Korean stock) coverage. Confirm free tier limits. Evaluate Polygon.io as alternative if Alpha Vantage 25 req/day limit is too tight.

### Phase 4: Time-Series History and Charts
Add snapshot infrastructure and deliver the year-end review feature.

- Portfolio snapshot cron job (node-cron, daily at 23:00 local)
- Monthly snapshot retention; daily snapshots pruned after 12 months
- History query endpoint with granularity parameter
- Annual return chart (year-over-year)
- Monthly return chart (rolling 12 months)
- Backfill path: manual valuations feed historical snapshots for RE/savings assets

### Phase 5: Goals and Performance Comparison
Complete the v1 experience with goal tracking and comparison views.

- Goal CRUD (name, target KRW, target date)
- Achievement % computed at read time from dashboard total
- Per-asset performance comparison view (full sortable table)
- Dashboard goal progress widget

### Phase 6: Differentiators and Polish
Post-v1 hardening and the most-requested nice-to-haves.

- KRW/USD dual currency display toggle
- Tax year realized gain summary (양도소득세 inputs)
- CSV import for transaction backfill (per-broker format mapping)
- Mobile-responsive layout polish
- Per-asset notes field
- Savings maturity countdown on dashboard

**Research needed:** Korean brokerage CSV formats (키움, 미래에셋, 삼성증권) vary; mapping table required. Tax calculation rules (양도소득세) should be verified against current Korean tax law before implementation.

---

## Highest-Risk Areas

1. **Data model (Phase 1)** — Integer money types and exchange rate fields on transactions are the hardest decisions to change after the fact. Get a code review of the Drizzle schema before writing any application logic on top of it.

2. **Korean stock price API (Phase 3)** — No confirmed free, reliable, real-time source for KRX tickers in JavaScript. KIS Developers API requires a KIS brokerage account. This is the biggest known unknown and must be resolved before Phase 3 starts.

3. **Cost basis calculation (Phase 2)** — Weighted average across partial sells with multiple currencies is subtle. Any bug here propagates through every return number in the app. Comprehensive unit tests are mandatory before this code is used in production.

4. **Historical chart backfill (Phase 4)** — The snapshot cron starts from deployment day. There is no market asset history before that. The user experience for "why does my chart only start from [today]?" needs a clear answer (UI message + optional manual snapshot trigger).

---

## Open Questions for Phase Planning

- **Korean stock API:** Does the user have a KIS brokerage account? If yes, KIS Developers API is the best option. If no, what is the fallback (Yahoo Finance unofficial with 15-min delay, or KRX OpenAPI EOD)?
- **Deployment target:** Vercel (use Vercel Cron) or self-hosted VPS/local (use node-cron)? Changes Phase 4 implementation.
- **Reporting currency:** KRW primary with USD shown secondary, or user-configurable? Affects data model normalization approach.
- **Historical backfill for market assets:** Accept "chart starts from deployment date" or provide a manual "record snapshot" button at Phase 4?
- **Alpha Vantage vs Polygon.io:** 25 req/day (Alpha Vantage free) is likely insufficient for 20+ stock holdings. Polygon.io free tier (5 req/min, no daily cap) may be better. Confirm before Phase 3 planning.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions npm-verified. better-auth + Drizzle + SQLite peer deps confirmed. |
| Features | HIGH | Well-understood domain. Feature set matches standard portfolio trackers + Korean market adjustments. |
| Architecture | HIGH | Ledger + snapshot + price cache patterns are established. SQLite WAL proven at this scale. |
| Pitfalls | HIGH (structural) / MEDIUM (API-specific) | Math/schema pitfalls are permanent. API rate limits need verification at implementation time. |

**Overall confidence:** HIGH

### Gaps Requiring Validation at Implementation

- Finnhub KRX (Korean stock) ticker coverage — verify at finnhub.io before committing
- Polygon.io vs Alpha Vantage free tier suitability — verify req/day limits
- KIS Developers API access requirements — verify account prerequisite
- Current Korean tax law for 양도소득세 calculation inputs — verify before Phase 6

---

## Sources

### Primary (HIGH confidence — npm registry verified)
- npm registry (`npm info [package] dist-tags`) — all package versions in STACK.md
- better-auth peer dependencies — Next.js 16 + Drizzle + better-sqlite3 compatibility confirmed

### Secondary (MEDIUM confidence — training data, stable domain)
- Finnhub, CoinGecko, Alpha Vantage free tier limits — verify at respective docs before Phase 3
- Bank of Korea OpenAPI (ecos.bok.or.kr) — official, confirmed free for KRW rates
- KIS Developers API (apiportal.koreainvestment.com) — account requirement confirmed from training data
- IEEE 754 floating-point behavior — ECMAScript spec, canonical
- Weighted average cost basis (평균단가) — FSS (금융감독원) documented standard

### Tertiary (LOW confidence — validate before use)
- Yahoo Finance unofficial endpoints — treat as fallback only; format unstable
- Naver Finance — do not use; anti-scraping will break it
- KRX OpenAPI historical data scope — verify EOD vs real-time availability

---

*Research completed: 2026-04-09*
*Ready for roadmap: yes*
