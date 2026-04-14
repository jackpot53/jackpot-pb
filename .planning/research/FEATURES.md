# Features Research: Personal Asset Management Web App

**Domain:** Personal portfolio tracking / asset management (stocks, crypto, real estate, savings)
**Researched:** 2026-04-09
**Scope:** Single-user, web-first, Korean + international markets

---

## Table Stakes (Must Have)

These are features without which the app fails its core purpose. Missing any of these means the user goes elsewhere or the "year-end review" goal is unmet.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| User authentication (login/session) | Multi-device access; data must persist and be private | Low | Single user — no multi-tenancy, no social login required beyond one account |
| Transaction ledger: buy/sell entry (quantity, price, date, asset) | Foundation for accurate cost basis; required for any return calculation | Medium | The data model must get this right from day one — retrofitting is painful |
| Cost basis calculation (FIFO or average cost) | "How much did I pay for this?" — fundamental to return % | Medium | Korean tax convention defaults to average cost method (총평균법); offer both |
| Current value calculation (evaluated amount) | Knowing what an asset is worth *now* | Medium | Requires price API integration for stocks/crypto; manual for RE/savings |
| Real-time / near-real-time price feed for stocks (KRX + international) | Auto-calculated current value without user input | High | KRX (한국거래소) for domestic; Yahoo Finance or similar for international |
| Real-time / near-real-time price feed for crypto | Same as stocks — user expects prices to be live | Medium | CoinGecko API is free and covers all major coins |
| Manual value update for real estate and savings/deposits | No reliable public API; user must input | Low | Simple form: asset, current value, date of estimate |
| Total asset dashboard (single screen) | Core value of the entire app — "all assets at a glance" | Medium | Must show: total KRW value, gain/loss KRW, gain/loss %, asset type breakdown |
| Asset allocation by type (pie/donut chart) | Standard expectation for any portfolio app | Low | Stocks, crypto, real estate, savings — 4 categories |
| Overall portfolio return % (unrealized) | "Am I up or down overall?" — users expect this immediately | Medium | (Current value − total cost) / total cost × 100 |
| Annual return history (year-over-year) | The stated core goal: "how much did my assets grow this year?" | High | Requires storing historical snapshots or reconstructing from ledger |
| Monthly return history chart | Granular view within a year; standard in all portfolio trackers | Medium | Bar or line chart, 12 months rolling |
| Per-asset performance list | "What performed best / worst?" — essential for portfolio decisions | Medium | Sortable by return %, gain/loss amount, asset type |
| Investment goal tracking (target amount + progress %) | Explicitly required; gives purpose to the number | Low | Single goal or multiple goals per asset type |

---

## Differentiators (Nice to Have)

These features set the app apart. Not expected by default, but add meaningful value for this specific use case (Korean investor, year-end review focus).

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| KRW/USD dual currency display | Korean markets + international stocks means currency mixing is real | Medium | Show KRW equivalent for all foreign assets; use daily FX rate |
| Tax year summary (양도소득세 / 금융투자소득세) | Korean investors need realized gain summary for tax filing | Medium | Sum of realized gains/losses per tax year; don't compute tax owed, just the inputs |
| Cost basis method toggle (avg vs FIFO) | Power users want to see impact of method choice | Medium | Store raw transactions; compute on-the-fly |
| Portfolio benchmark comparison (vs KOSPI, S&P 500) | "Did I beat the market?" is a natural question | Medium | Requires storing/fetching index data; can be done with same price API |
| Dividend / interest income tracking | Dividends are real returns often missed in simple trackers | Medium | Optional per-transaction: record dividend received, date |
| Per-asset notes field | "Why did I buy this?" — journaling for future reference | Low | Simple text field on the transaction or asset record |
| Currency gain/loss separation | For international holdings: FX gain/loss vs asset gain/loss | High | Requires recording FX rate at purchase and computing separately |
| Savings/deposit maturity reminders | Alerts when a fixed deposit (정기예금) matures | Low | Date field + notification; MVP: show countdown on dashboard |
| Dark mode | Table stakes for dev tools, differentiator for finance apps | Low | CSS variable approach; implement at UI layer |
| CSV import for transactions | Bulk import from brokerage exports | Medium | Each brokerage (키움, 미래에셋, 삼성증권) has different CSV formats — needs mapping |
| Mobile-responsive layout | PC-first but usable on phone | Low | CSS responsive design; no native app |

---

## Anti-Features (Do NOT Build)

These are explicitly out of scope or actively harmful to the app's simplicity and focus.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Brokerage / bank API auto-sync (증권사 연동) | Korean brokerage APIs (오픈뱅킹, 마이데이터) require financial institution certification, complex OAuth flows, and regulatory compliance — massively out of scope | Manual transaction entry + price API is sufficient and already decided |
| Social features (sharing, public portfolios) | Single-user app by definition; social adds attack surface and complexity | None needed |
| Mobile native app (iOS/Android) | Web-first is sufficient; native adds a second codebase | Responsive web layout covers mobile access |
| Automated trading / order placement | Completely different product; regulatory risk | This is a tracker, not a broker |
| AI-generated investment recommendations | Requires financial advisor licensing in Korea; liability risk; distraction from core use | Show performance data; let user draw conclusions |
| Multi-currency accounting ledger | Full double-entry bookkeeping is massive scope creep | Track in KRW primary + show original currency; simple FX conversion is enough |
| Multi-user / household sharing | Adds auth complexity (roles, permissions) for no stated need | Single login is sufficient |
| Real-time WebSocket price streaming | Polling every 1-5 minutes is sufficient for a personal tracker; WebSockets add infra complexity | Scheduled polling or on-demand refresh |
| Historical price charting per asset (candlestick) | This is a tracker, not a trading terminal; candle charts require large price history datasets | Show return % over time; not raw price charts |
| Push notifications (mobile/browser) | Adds service worker complexity for minimal gain in a single-user app | Maturity dates visible on dashboard is sufficient |

---

## Feature Dependencies

```
Authentication
  └── ALL features (nothing works without a session)

Transaction Ledger (buy/sell records)
  ├── Cost Basis Calculation
  │     ├── Unrealized Return % per asset
  │     ├── Overall Portfolio Return %
  │     └── Realized Gain/Loss (tax summary)
  ├── Per-Asset Performance List
  └── Annual/Monthly Return History (reconstructed from ledger)

Price API Integration (stocks + crypto)
  ├── Current Value (evaluated amount per asset)
  ├── Overall Portfolio Return %
  ├── Dashboard Total Asset Value
  └── Benchmark Comparison (if built)

Manual Value Update (RE + savings)
  └── Current Value for non-market assets (feeds into dashboard total)

Dashboard (total assets, allocation, return %)
  ├── Requires: Cost Basis Calculation
  ├── Requires: Current Value (market + manual)
  └── Requires: Asset Allocation categories

Annual / Monthly Return History Charts
  ├── Requires: Historical snapshots (stored) OR
  └── Requires: Full transaction ledger + price history reconstruction

Investment Goal Tracking
  └── Requires: Dashboard Total Asset Value (to compute progress %)

KRW/USD Dual Currency (differentiator)
  └── Requires: FX rate API (daily rate, not real-time needed)

Tax Year Summary (differentiator)
  └── Requires: Cost Basis Calculation + Realized Gain/Loss records
```

---

## Complexity Notes

### High Complexity Items

**Annual Return History**
The hardest feature in the app. You need to answer "what was my total portfolio worth on Jan 1, 2024?" This requires either:
- (Option A) Storing daily/monthly portfolio snapshots — simple to query but requires a background job that runs periodically
- (Option B) Reconstructing from transaction ledger + historical price data — accurate but requires historical price API and significant computation
- Recommendation: Use Option A (scheduled snapshots). Store monthly snapshots of total value per asset. Zero historical price dependency. Far simpler to implement and query.

**Real-time Stock Price API (KRX + international)**
Korean domestic stocks (KRX) have no free official real-time API. Options:
- Yahoo Finance (yfinance) covers KRX tickers in format "005930.KS" (Samsung) — free, delayed ~15min
- Korea Investment & Securities (한국투자증권) open API — requires account, but has real-time; good for power users
- For international (NYSE, NASDAQ): Yahoo Finance, Alpha Vantage (free tier), or Polygon.io
- For crypto: CoinGecko free API is the standard choice (no key required for basic use)
- Recommendation: Yahoo Finance for stocks (domestic + international), CoinGecko for crypto. Both free, both sufficient for a personal tracker.

**Cost Basis Calculation**
Average cost method (총평균법) is what Korean brokerages use. FIFO is common in international contexts. Both must be computed from the raw transaction ledger. This logic must be correct from day one — it is the foundation of every return number in the app.

### Medium Complexity Items

**Dashboard Return %**
Simple math but must handle edge cases: assets with zero cost (gifted), partial sells (cost basis allocation), mixed currencies. Needs thorough testing.

**Monthly Return History Chart**
If using snapshot approach (recommended), this is straightforward: query last 12 monthly snapshots, compute month-over-month delta. If no snapshots exist for early months, the chart just shows from when the user started.

**Per-Asset Performance List**
Table with sort/filter. Complexity is in the data model design — needs to aggregate transactions per asset, apply cost basis, join with current price, compute return. One well-designed SQL query or view handles this.

**Investment Goal Tracking**
Simple (target KRW amount + current total from dashboard = progress %). Can support multiple goals (e.g., "total 1억 by 2027", "RE portion 3억 by 2030"). Low data complexity; medium UI complexity.

### Low Complexity Items

**User Authentication**
Single user. Email + password with JWT or session cookie. No OAuth, no roles, no teams.

**Manual Value Update (RE/Savings)**
Simple form: select asset, enter current KRW value, optionally enter date. Display latest value on dashboard.

**Asset Allocation Pie Chart**
Sum current value by asset type, render as pie/donut. Standard chart library (Recharts, Chart.js) handles this in <50 lines.

**Investment Goal Progress Bar**
Percentage = (current total / target amount) × 100. Render as progress bar + text.

---

## MVP Scope Recommendation

### Phase 1 MVP (ship and validate)
1. Authentication (single user)
2. Transaction ledger (add buy/sell for stocks, crypto, RE, savings)
3. Price API integration (Yahoo Finance + CoinGecko)
4. Cost basis calculation (average cost method)
5. Dashboard: total assets, asset type allocation, overall return %
6. Per-asset performance list (sortable by return %)

### Phase 2 (year-end review goal)
7. Monthly snapshot job (background, runs 1st of each month)
8. Annual / monthly return history charts
9. Investment goal tracking

### Phase 3 (differentiators if wanted)
10. KRW/USD dual currency with FX rate
11. Tax year realized gain summary
12. CSV import for bulk transaction entry
13. Mobile-responsive polish

**Defer indefinitely:** Benchmark comparison, dividend tracking, currency gain/loss separation (high complexity, low impact for stated goal)
