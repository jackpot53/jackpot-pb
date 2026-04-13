# Phase 3: Price Integration & Dashboard - Research

**Researched:** 2026-04-13
**Domain:** External price APIs (Finnhub, CoinGecko, BOK FX), portfolio math, recharts, Next.js dashboard UI
**Confidence:** MEDIUM-HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** On-demand fetch + TTL cache. Dashboard load triggers price fetch. If `priceCache.cachedAt` is within 5 minutes, use cache; otherwise call API and refresh cache.
- **D-02:** API failure → show last cached price + `cachedAt` timestamp (stale fallback). Never show 0 or error value.
- **D-03:** No background cron in Phase 3. On-demand fetch only. Phase 4 re-evaluates.
- **D-04:** Finnhub for `stock_kr`, `etf_kr` — if response is null/empty, use stale fallback. No separate KRX API.
- **D-05:** Verify Finnhub free-tier KRX coverage during research. If insufficient, display `stock_kr`/`etf_kr` with stale indicator.
- **D-06:** **recharts** for charts. PieChart + Tooltip + Legend.
- **D-07:** `npm install recharts` in Phase 3.
- **D-08:** BOK OpenAPI for USD/KRW exchange rate (automatic, replaces Phase 2 manual input).
- **D-09:** BOK FX rate cached in priceCache (ticker: 'USD_KRW', TTL 1 hour). Failure → last cached rate.
- **D-10:** 3-row dashboard layout: stat cards row, pie chart + breakdown row, performance table row.
- **D-11:** Reuse existing sidebar + header layout. shadcn Card wraps each section.
- **D-12:** shadcn Table for per-asset list. Columns: 종목명 | 유형 | 수량 | 평단가 | 현재가 | 평가금액(KRW) | 수익률(%).
- **D-13:** Default sort: return % descending. Header click switches column sort.
- **D-14:** MANUAL assets (savings, real_estate): current price column shows latest ManualValuation. No refresh icon.
- **D-15:** `currentValue = (holdings.totalQuantity / 1e8) × priceCache.priceKrw`. Return = `(currentValue - totalCostKrw) / totalCostKrw × 100`.
- **D-16:** Portfolio total = sum of all asset `currentValue`. LIVE → priceCache; MANUAL → latest ManualValuation.
- **D-17:** USD display = `currentValueKrw / exchangeRate`. Exchange rate stored ×10000 (Phase 1 D-04).

### Claude's Discretion

- Stat card exact styling and colors (positive → emerald, negative → red, etc.)
- Pie chart color palette
- Loading skeleton design
- Error/empty state UI
- Price refresh in-progress display (spinner vs. keep current value)

### Deferred Ideas (OUT OF SCOPE)

- recharts line chart — Phase 4 (Charts & History)
- Background cron for price refresh — Phase 4
- KRX-specific API (KIS Developers, KRX OpenAPI) — only if Finnhub coverage insufficient
- CoinGecko crypto prices — PRICE-V2-01 is v2, NOT Phase 3 v1 scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRICE-01 | Stock/ETF prices auto-refreshed via Finnhub external API | Finnhub `/api/v1/quote` endpoint; on-demand fetch pattern with DB cache write |
| PRICE-02 | API failure shows last cached price + timestamp (fallback) | TTL logic in price adapter; stale fallback reads `priceCache.cachedAt`; StalePriceBadge component |
| DASH-01 | Total portfolio value + overall return % visible on one screen | Portfolio computation function aggregating all holdings × price; stat card UI |
| DASH-02 | Asset-type allocation chart | recharts PieChart with `innerRadius`/`outerRadius` donut; per-type aggregation |
| DASH-03 | Per-asset current value + return % summary | PerformanceTable component with sortable columns |
| DASH-04 | KRW/USD dual currency simultaneously displayed | BOK FX rate via ECOS API; USD = KRW value ÷ (FX rate / 10000) |
</phase_requirements>

---

## Summary

Phase 3 connects external price APIs to the holdings math established in Phase 2, and renders the results on a single dashboard screen. The technical domains are: (1) price API adapters with DB caching, (2) portfolio computation, and (3) React dashboard UI with recharts.

**Critical finding:** Finnhub free tier provides real-time quotes for US stocks. Korean stock (KRX) coverage on the free tier is unconfirmed and likely limited or unavailable without a paid plan (~$50/month per exchange). The decision in D-04/D-05 is sound: attempt Finnhub for `stock_kr`/`etf_kr`, fall back to stale cache when null. CoinGecko for crypto is v2 scope (PRICE-V2-01) — NOT Phase 3.

For BOK FX rate, the ECOS API requires registration and an API key. A zero-registration fallback exists (`fawazahmed0/exchange-api` via CDN), but the team decided BOK. The plan must include a Wave 0 task to register for the ECOS API key and confirm the stat code for USD/KRW daily reference rate.

**Primary recommendation:** Build the price adapter layer as server-side logic (Next.js Server Actions or Route Handlers), write to Supabase `price_cache` table via Drizzle, and serve the dashboard as a Server Component that calls a `getPortfolioData()` function — no client-side fetch needed. All recharts components are `'use client'` wrappers around server-fetched data passed as props.

---

## Project Constraints (from CLAUDE.md)

- kebab-case for file/directory names
- camelCase for function and method names
- PascalCase for types, interfaces
- No `I` prefix on interfaces
- Drizzle ORM only for DB queries (Supabase SDK is Auth-only)
- Money stored as BIGINT KRW integer; format only at UI layer
- Next.js App Router + Server Actions pattern
- `app/(app)/` group route for authenticated pages
- No `.prettierrc` yet — recommend 2-space indent, single quotes, trailing commas
- Comment non-obvious financial calculations

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.8.1 | PieChart + Tooltip + Legend | Locked decision D-06; mature React chart library, React 19 compatible |
| react-is | 19.2.5 | recharts peer dependency | Required peer dep; already compatible with project React version |

[VERIFIED: npm registry — `npm view recharts version` returned 3.8.1, published 2026-03-25]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Finnhub REST API | v1 (no SDK) | Stock/ETF quote fetch | All `stock_kr`, `stock_us`, `etf_kr`, `etf_us` assets with `price_type = 'live'` |
| CoinGecko REST API | v3 (no SDK) | Crypto price fetch | `crypto` assets with `price_type = 'live'` — DEFERRED to v2/Phase 4 |
| ECOS BOK REST API | v1 (no SDK) | USD/KRW reference rate | `USD_KRW` ticker in priceCache, TTL 1 hour |

[ASSUMED] No npm SDK is needed for any of these APIs — plain `fetch()` in server-side code is the correct pattern for a single-user app.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ECOS BOK FX API | fawazahmed0/exchange-api (CDN, no key) | BOK is authoritative Korean reference rate but requires registration; CDN API has no auth/rate limit but is unofficial |
| recharts | tremor charts, shadcn charts | recharts is locked decision D-06; shadcn charts are built on recharts anyway |
| Server Action price fetch | Route Handler + SWR | Server Action is simpler for single-user app; no client caching needed |

**Installation:**

```bash
npm install recharts react-is
```

**Version verification:**
- recharts: 3.8.1 [VERIFIED: npm registry, 2026-03-25]
- react-is: 19.2.5 [VERIFIED: npm registry]

---

## Architecture Patterns

### Recommended File Structure

```
app/
├── (app)/
│   ├── page.tsx              # Dashboard Server Component (replaces redirect)
│   └── layout.tsx            # unchanged
│
app/actions/
│   └── prices.ts             # Server Actions: fetchAndCachePrices, getPortfolioData
│
lib/
│   ├── holdings.ts           # existing — computeHoldings (reuse)
│   ├── portfolio.ts          # NEW — computePortfolio, aggregateByType
│   └── price-adapters/
│       ├── finnhub.ts        # fetchFinnhubQuote(ticker: string): Promise<number | null>
│       ├── coingecko.ts      # STUB only (v2 scope) — returns null
│       └── bok-fx.ts         # fetchBokFxRate(): Promise<number | null>
│
components/app/
│   ├── dashboard-stat-card.tsx     # NEW
│   ├── allocation-pie-chart.tsx    # NEW — 'use client'
│   ├── performance-table.tsx       # NEW — 'use client' (client sort state)
│   ├── stale-price-badge.tsx       # NEW
│   └── price-loading-skeleton.tsx  # NEW
```

### Pattern 1: Server Component → Client Chart

recharts components use browser APIs (SVG, ResizeObserver) and cannot run in Server Components. The correct pattern is to fetch data server-side, pass serializable data as props to a `'use client'` chart wrapper.

```typescript
// Source: recharts 3.0 migration guide + Next.js app router pattern [ASSUMED pattern, CITED: Next.js docs]
// app/(app)/page.tsx — Server Component
import { getPortfolioData } from '@/app/actions/prices'
import { AllocationPieChart } from '@/components/app/allocation-pie-chart'

export default async function DashboardPage() {
  const portfolio = await getPortfolioData()
  return <AllocationPieChart data={portfolio.byType} />
}

// components/app/allocation-pie-chart.tsx — Client Component
'use client'
import { PieChart, Pie, Tooltip, Legend, Cell } from 'recharts'

export function AllocationPieChart({ data }: { data: AllocationSlice[] }) {
  return (
    <PieChart width={300} height={300}>
      <Pie data={data} dataKey="valueKrw" nameKey="type"
           innerRadius={60} outerRadius={100}>
        {data.map((entry, i) => <Cell key={i} fill={COLORS[entry.type]} />)}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  )
}
```

### Pattern 2: Price Adapter with TTL + Stale Fallback

```typescript
// Source: [ASSUMED pattern based on project context and Drizzle schema]
// lib/price-adapters/finnhub.ts
export async function fetchFinnhubQuote(ticker: string): Promise<number | null> {
  const res = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${process.env.FINNHUB_API_KEY}`,
    { cache: 'no-store' }  // always fresh — we handle TTL in DB layer
  )
  if (!res.ok) return null
  const data = await res.json()
  // Finnhub returns { c: currentPrice, ... }. c = 0 means no data.
  return data.c && data.c > 0 ? data.c : null
}

// app/actions/prices.ts
'use server'
export async function refreshPriceIfStale(ticker: string, assetType: string): Promise<void> {
  const TTL_MS = 5 * 60 * 1000  // 5 minutes
  const cached = await db.select().from(priceCache)
    .where(eq(priceCache.ticker, ticker)).limit(1)

  const isStale = !cached[0] || Date.now() - cached[0].cachedAt.getTime() > TTL_MS
  if (!isStale) return

  const priceUsd = await fetchFinnhubQuote(ticker)
  if (priceUsd === null) return  // stale fallback: keep existing cache entry

  const fxRate = await getFxRate()         // BOK USD_KRW / 10000
  const priceKrw = Math.round(priceUsd * fxRate)
  await db.insert(priceCache).values({ ticker, priceKrw, priceOriginal: Math.round(priceUsd * 100), currency: 'USD', cachedAt: new Date() })
    .onConflictDoUpdate({ target: priceCache.ticker, set: { priceKrw, priceOriginal: Math.round(priceUsd * 100), cachedAt: new Date() } })
}
```

### Pattern 3: Portfolio Computation

```typescript
// Source: [ASSUMED — based on D-15, D-16, D-17 from CONTEXT.md]
// lib/portfolio.ts
export interface AssetPerformance {
  assetId: string
  name: string
  assetType: string
  totalQuantity: number    // raw ×10^8
  avgCostPerUnit: number   // KRW
  currentPriceKrw: number  // from priceCache or ManualValuation
  currentValueKrw: number  // (qty / 1e8) * currentPriceKrw
  totalCostKrw: number
  returnPct: number        // (currentValue - cost) / cost * 100
  isStale: boolean
  cachedAt: Date | null
}

export function computeAssetPerformance(
  holding: HoldingRow,
  currentPriceKrw: number,
  isStale: boolean,
  cachedAt: Date | null
): AssetPerformance {
  const currentValueKrw = Math.round((holding.totalQuantity / 1e8) * currentPriceKrw)
  const returnPct = holding.totalCostKrw > 0
    ? ((currentValueKrw - holding.totalCostKrw) / holding.totalCostKrw) * 100
    : 0
  return { ...holding, currentPriceKrw, currentValueKrw, returnPct, isStale, cachedAt }
}
```

### Pattern 4: BOK FX Rate Fetch

```typescript
// Source: [CITED: ecos.bok.or.kr/api — URL format verified from R-bloggers article]
// [ASSUMED] Stat code for USD/KRW daily reference rate needs confirmation during Wave 0
// lib/price-adapters/bok-fx.ts
const BOK_STAT_CODE = '036Y001'   // USD/KRW 기준환율 — VERIFY during Wave 0
const BOK_ITEM_CODE = '0000001'   // USD item — VERIFY during Wave 0

export async function fetchBokFxRate(): Promise<number | null> {
  const today = new Date().toISOString().slice(0, 7).replace('-', '')  // YYYYMM
  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${process.env.BOK_API_KEY}/json/kr/1/1/${BOK_STAT_CODE}/D/${today}/${today}/${BOK_ITEM_CODE}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  const data = await res.json()
  const value = data?.StatisticSearch?.row?.[0]?.DATA_VALUE
  return value ? parseFloat(value) : null  // returns float like 1356.5
}
// Caller stores as integer: Math.round(rate * 10000) → 13565000
```

### Anti-Patterns to Avoid

- **Client-side price fetch:** Never `fetch()` API keys from browser. All external API calls are server-side only (Server Actions or Server Components).
- **Recharts in Server Components:** recharts uses browser APIs. Always wrap in `'use client'` component. Pass data as serializable props.
- **Showing 0 on stale:** D-02 mandates showing last cached value, not 0. Check for `priceCache` existence before defaulting.
- **Recomputing holdings from scratch per request:** `holdings` table is the pre-aggregated source. Never re-run WAVG on every dashboard load.
- **Storing exchange rate as float:** Phase 1 D-04: multiply by 10000, store as BIGINT integer.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Donut pie chart | Custom SVG arc calculations | recharts `<Pie innerRadius outerRadius>` | SVG arc math is error-prone; recharts handles responsive sizing, tooltips, animations |
| Number formatting | Custom `toLocaleString` wrapper | `Intl.NumberFormat` with `ko-KR` / `en-US` locale | Already contracted in UI-SPEC (`formatKrw`, `formatUsd`, `formatReturn` helpers) |
| Relative time ("3시간 전") | Custom time diff | `Intl.RelativeTimeFormat` | Native browser API, no library needed |
| Chart responsive container | CSS tricks | recharts `<ResponsiveContainer>` | Handles ResizeObserver lifecycle correctly |
| Sort state | Redux or Zustand | `useState` in `'use client'` component | Single column sort on a local array doesn't need global state |

**Key insight:** recharts has 5+ dependencies including `@reduxjs/toolkit` and `react-redux` internally. These are bundled inside recharts — do NOT install them separately for this phase.

---

## Common Pitfalls

### Pitfall 1: Finnhub Returns `c: 0` for Unknown Tickers

**What goes wrong:** Finnhub returns HTTP 200 with `{ c: 0, d: 0, ... }` when a ticker is not found or not covered. Treating `c: 0` as a valid price writes zero to `priceCache.priceKrw`.

**Why it happens:** Finnhub does not return 404 for unknown tickers on the free tier.

**How to avoid:** In the Finnhub adapter, explicitly check `data.c && data.c > 0`. If `c === 0`, treat as null (no data available) and keep the existing stale cache entry.

**Warning signs:** priceCache rows with `priceKrw = 0` appearing for Korean stock tickers.

### Pitfall 2: Korean Stocks on Finnhub Free Tier

**What goes wrong:** KRX (Korean Exchange) real-time data on Finnhub is likely behind a paid plan (~$50/month per exchange). Calls succeed (HTTP 200) but return `c: 0`.

**Why it happens:** Finnhub free tier covers US stocks (via IEX); international exchanges require paid subscriptions. [CITED: multiple community sources — MEDIUM confidence]

**How to avoid:** D-04/D-05 already handle this with stale fallback. In Wave 0, test a known KRX ticker (e.g., `005930.KS` Samsung) against the Finnhub free tier. If `c: 0`, document that `stock_kr`/`etf_kr` will always show the stale indicator until the user manually seeds prices.

**Warning signs:** All `stock_kr` and `etf_kr` priceCache entries stuck at 0 or never updated.

### Pitfall 3: recharts Hydration Mismatch in Next.js App Router

**What goes wrong:** If a recharts component is imported in a Server Component without `'use client'`, the build fails or produces a hydration error because recharts uses browser APIs.

**Why it happens:** recharts 3.x is a client-only library. The migration guide confirms React 16.8+ is required but does not special-case SSR.

**How to avoid:** Always add `'use client'` to any file that imports recharts components. Keep chart components in `components/app/` and receive all data as props from Server Component parents.

**Warning signs:** `Error: useState can only be used in a Client Component` at build time.

### Pitfall 4: BOK ECOS API Key Registration

**What goes wrong:** Plan assumes BOK API is available. Registration takes up to 1 business day per BOK documentation.

**Why it happens:** BOK requires account creation to receive an API key.

**How to avoid:** Register for the ECOS API key as the first Wave 0 task, before any implementation begins. Have a fallback FX rate (fawazahmed0/exchange-api CDN, no auth required) ready if the BOK key is delayed.

**Warning signs:** Cannot fetch exchange rate during development because BOK key hasn't been issued yet.

### Pitfall 5: MANUAL Asset currentValue Missing from Portfolio Total

**What goes wrong:** Portfolio total only counts LIVE assets because the price query only reads `priceCache`. MANUAL assets (savings, real_estate) have no `priceCache` entry.

**Why it happens:** MANUAL assets get their "current price" from `manualValuations`, not `priceCache`. A single query join path won't cover both.

**How to avoid:** `getPortfolioData()` must handle two separate paths: (1) LIVE assets → join `holdings` + `priceCache`; (2) MANUAL assets → join `holdings` + latest `manualValuations` row per asset (using `ORDER BY valued_at DESC LIMIT 1` per asset or window function). Combine both result sets before summing.

**Warning signs:** Dashboard total is lower than expected; savings/real_estate assets don't appear in performance table.

### Pitfall 6: Integer Math for USD Display

**What goes wrong:** `currentValueUsd = currentValueKrw / exchangeRate` loses precision if `exchangeRate` is stored as integer ×10000 and division is done in integer arithmetic.

**Why it happens:** Phase 1 D-04 stores `exchangeRate` as BIGINT ×10000 (e.g., 13,560,000 = 1356.0000 KRW/USD).

**How to avoid:** Convert to float before dividing: `const rate = exchangeRateRaw / 10000` (JavaScript number), then `currentValueUsd = currentValueKrw / rate`. Display using `formatUsd` helper. Do not store the USD result — compute at display time only.

**Warning signs:** USD stat card shows wildly wrong values.

---

## Code Examples

### Finnhub Quote Endpoint

```typescript
// Source: [CITED: finnhub.io/docs/api/quote]
// GET https://finnhub.io/api/v1/quote?symbol={TICKER}&token={API_KEY}
// Response: { c: 189.50, d: 1.25, dp: 0.66, h: 190.0, l: 188.0, o: 188.5, pc: 188.25 }
// c = current price (USD for US stocks)
// 0 means "no data" — not a valid price
```

### CoinGecko Simple Price Endpoint (STUB — v2 scope)

```typescript
// Source: [CITED: docs.coingecko.com/reference/simple-price]
// Demo API (free, requires registration): api.coingecko.com/api/v3/simple/price
// Header: x-cg-demo-api-key: {API_KEY}
// GET /simple/price?ids=bitcoin,ethereum&vs_currencies=krw
// Response: { "bitcoin": { "krw": 87450000 }, "ethereum": { "krw": 4356000 } }
// Rate limit: 30 calls/min, 10,000 calls/month on Demo plan
// NOTE: crypto is v2 scope (PRICE-V2-01) — build stub only in Phase 3
```

### BOK ECOS FX Rate Endpoint

```typescript
// Source: [CITED: ecos.bok.or.kr/api — URL pattern from R-bloggers article 2021]
// [ASSUMED] Stat code '036Y001' + item code for USD — VERIFY in Wave 0
// GET https://ecos.bok.or.kr/api/StatisticSearch/{API_KEY}/json/kr/1/1/{STAT_CODE}/D/{YYYYMMDD}/{YYYYMMDD}/{ITEM_CODE}
// Response: { StatisticSearch: { row: [{ DATA_VALUE: "1356.50" }] } }
// Requires BOK ECOS registration: https://ecos.bok.or.kr/api/#/AuthKeyApply
// Fallback (no auth): https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json
//   → { "usd": { "krw": 1356.5 } }  (daily updated, no rate limit)
```

### recharts PieChart Donut Pattern

```typescript
// Source: [CITED: recharts.org docs + migration guide confirms innerRadius/outerRadius unchanged]
'use client'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// Per UI-SPEC D-06 / 03-UI-SPEC.md: innerRadius=60, outerRadius=100
export function AllocationPieChart({ data }: { data: AllocationSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="valueKrw"
          nameKey="label"
          innerRadius={60}
          outerRadius={100}
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={ASSET_TYPE_COLORS[entry.type]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatKrw(value)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

### Number Formatting Helpers (from UI-SPEC contract)

```typescript
// Source: [CITED: 03-UI-SPEC.md Number Formatting Contract]
// These helpers must be created in Wave 0 / first plan task
export function formatKrw(amount: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(amount)
}

export function formatUsd(amountKrw: number, fxRateRaw: number): string {
  const usd = amountKrw / (fxRateRaw / 10000)
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(usd)
}

export function formatReturn(pct: number): string {
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffMins = Math.floor(diffMs / 60_000)
  const rtf = new Intl.RelativeTimeFormat('ko-KR', { numeric: 'auto' })
  if (diffHours >= 1) return rtf.format(-diffHours, 'hour')
  return rtf.format(-diffMins, 'minute')
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| recharts 2.x (react-smooth dependency) | recharts 3.x (animations self-contained) | 2024 | No react-smooth install needed; migration guide says changes are minimal |
| `CategoricalChartState` internal access | Hooks-based internal state | recharts 3.0 | Don't access internal chart state directly; use standard props only |
| Next.js fetch caching (auto-cached) | Next.js 15+ no-cache default | Next.js 15 | Must pass `{ cache: 'no-store' }` explicitly for price fetches, or rely on DB TTL logic |

**Deprecated/outdated:**
- `react-smooth` package: removed from recharts 3.x — do not install separately
- `recharts-scale` package: merged into recharts core in 3.x

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Finnhub free tier does not support KRX real-time quotes; returns `c: 0` | Pitfall 2, Standard Stack | If KRX IS free, `stock_kr`/`etf_kr` would work out of the box — low risk, stale fallback handles both cases |
| A2 | BOK ECOS stat code for USD/KRW daily reference rate is '036Y001' | Code Examples | Wrong stat code returns empty data; FX rate adapter returns null → stale fallback activates |
| A3 | BOK ECOS item code for USD is a simple string like '0000001' | Code Examples | Must be verified in Wave 0 against the ECOS statistics catalog |
| A4 | No npm SDK needed for Finnhub/CoinGecko/BOK — plain fetch() is sufficient | Standard Stack | If official SDKs have TypeScript typings worth using, could simplify type definitions |
| A5 | recharts `'use client'` wrapper pattern is sufficient for Next.js 16 app router | Architecture Patterns | If Next.js 16 has changed server/client boundary rules, component structure may need adjustment |
| A6 | `react-is` does not need explicit installation alongside recharts | Standard Stack | If npm install recharts fails with peer dep warning, `npm install recharts react-is` may be needed |

---

## Open Questions

1. **BOK ECOS Stat Code Confirmation**
   - What we know: ECOS URL format is `StatisticSearch/{key}/json/kr/1/1/{stat_code}/D/{date}/{date}/{item_code}`
   - What's unclear: Exact stat code and item code for USD/KRW daily reference rate (기준환율)
   - Recommendation: Wave 0 task — register for ECOS API key, query `StatisticList` to find correct codes. Fallback: use `fawazahmed0/exchange-api` (CDN, no key, daily updated) if BOK key is delayed.

2. **Finnhub KRX Coverage Verification**
   - What we know: Finnhub free tier reliably covers US stocks. International exchanges likely require paid plan.
   - What's unclear: Whether `stock_kr` / `etf_kr` tickers with `.KS` suffix return real data or `c: 0`.
   - Recommendation: Wave 0 task — make a single test call to `GET /api/v1/quote?symbol=005930.KS&token={KEY}` with a free API key. If `c: 0`, document that Korean stocks are stale-only until a paid plan is added or alternative API is sourced.

3. **CoinGecko in Phase 3 Scope**
   - What we know: PRICE-V2-01 is a v2 requirement; the deferred section in CONTEXT.md explicitly excludes it from Phase 3.
   - What's unclear: The phase description mentions CoinGecko in success criteria (criterion 1). This creates an inconsistency.
   - Recommendation: CONTEXT.md deferred section takes precedence. Build a `coingecko.ts` stub that returns `null` so the adapter interface is consistent. Crypto assets will show stale indicator (no data until Phase 4+).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All server-side code | ✓ | v23.10.0 | — |
| npm | `npm install recharts` | ✓ | bundled with Node | — |
| Finnhub API key | PRICE-01 | ? | — | — (must sign up at finnhub.io) |
| BOK ECOS API key | DASH-04 FX rate | ? | — | fawazahmed0/exchange-api CDN (no key) |
| CoinGecko Demo API key | crypto prices (v2 scope) | ? | — | Not needed in Phase 3 |
| Supabase DB (PostgreSQL) | price_cache table | ✓ | existing | — |

**Missing dependencies with no fallback:**
- Finnhub API key: required for PRICE-01. Must be obtained before implementation. Sign up at https://finnhub.io/ (free tier available).

**Missing dependencies with fallback:**
- BOK ECOS API key: required for official BOK FX rate. Fallback is `fawazahmed0/exchange-api` (CDN, no auth, daily updated). Decision D-08 mandates BOK — but if key is delayed, plan must include this fallback path.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.3 |
| Config file | `vitest.config.ts` (exists, jsdom environment) |
| Quick run command | `npx vitest run tests/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRICE-01 | Finnhub adapter returns price or null | unit | `npx vitest run tests/price-adapters.test.ts -t "finnhub"` | ❌ Wave 0 |
| PRICE-01 | TTL cache: returns cached price if < 5 min old | unit | `npx vitest run tests/price-cache.test.ts -t "ttl"` | ❌ Wave 0 |
| PRICE-02 | Stale fallback: API null keeps existing cache | unit | `npx vitest run tests/price-cache.test.ts -t "stale"` | ❌ Wave 0 |
| PRICE-02 | Stale fallback: API failure keeps existing cache | unit | `npx vitest run tests/price-cache.test.ts -t "failure"` | ❌ Wave 0 |
| DASH-01 | computePortfolio aggregates LIVE + MANUAL assets | unit | `npx vitest run tests/portfolio.test.ts -t "total"` | ❌ Wave 0 |
| DASH-01 | Return % calculation correct (zero cost basis guard) | unit | `npx vitest run tests/portfolio.test.ts -t "return"` | ❌ Wave 0 |
| DASH-02 | Allocation by type groups assets correctly | unit | `npx vitest run tests/portfolio.test.ts -t "allocation"` | ❌ Wave 0 |
| DASH-04 | USD display: KRW / (fxRateRaw / 10000) | unit | `npx vitest run tests/portfolio.test.ts -t "usd"` | ❌ Wave 0 |
| DASH-03 | Per-asset list includes all holdings with correct return % | unit | `npx vitest run tests/portfolio.test.ts -t "per-asset"` | ❌ Wave 0 |
| DASH-03 | Performance table sort (return desc by default) | unit | `npx vitest run tests/performance-table.test.ts` | ❌ Wave 0 |

**Manual-only tests (no automation):**
- Dashboard renders without crashing on first load (browser smoke test)
- Stale badge appears on assets with `cachedAt > 5min` (visual verification)
- Pie chart renders with correct colors and tooltips (visual)

### Sampling Rate

- **Per task commit:** `npx vitest run tests/portfolio.test.ts tests/price-cache.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/price-adapters.test.ts` — covers PRICE-01 (unit tests for Finnhub adapter with mocked fetch)
- [ ] `tests/price-cache.test.ts` — covers PRICE-01 TTL logic, PRICE-02 stale fallback
- [ ] `tests/portfolio.test.ts` — covers DASH-01, DASH-02, DASH-03, DASH-04
- [ ] `tests/performance-table.test.ts` — covers DASH-03 sort behavior
- [ ] `lib/portfolio.ts` — new module for Phase 3 computation logic
- [ ] `lib/price-adapters/finnhub.ts` — Finnhub adapter
- [ ] `lib/price-adapters/bok-fx.ts` — BOK FX adapter

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (inherited) | Supabase Auth + middleware.ts already protect `(app)/` routes |
| V3 Session Management | yes (inherited) | Supabase session cookies already managed |
| V4 Access Control | yes | No new public endpoints; Server Actions inherit session check via `requireUser()` pattern |
| V5 Input Validation | partial | Ticker strings from DB (trusted); no user-supplied ticker input in Phase 3 |
| V6 Cryptography | no | No new crypto operations; API keys in env vars only |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key exposure in client bundle | Information Disclosure | All external API calls are server-side only (Server Actions / Server Components); keys in `process.env` never passed to client |
| Ticker injection via asset name | Tampering | Tickers come from `assets.ticker` (DB, validated at write time by Zod schema); not user-supplied at price fetch time |
| Stale price shown without disclosure | Repudiation | StalePriceBadge + `cachedAt` timestamp shows users when data is old (D-02 requirement) |
| SSRF via external API calls | Elevation of Privilege | All fetch targets are hardcoded URLs (Finnhub, CoinGecko, BOK ECOS); no user-controlled URL construction |

---

## Sources

### Primary (HIGH confidence)

- npm registry — recharts 3.8.1 version and peer dependencies verified via `npm view recharts`
- `db/schema/price-cache.ts` — existing schema confirms ticker, priceKrw, priceOriginal, currency, cachedAt columns
- `db/schema/holdings.ts` — confirms totalQuantity (×10^8), avgCostPerUnit, totalCostKrw
- `lib/holdings.ts` — computeHoldings pure function pattern for Phase 3 portfolio computation reference
- `03-UI-SPEC.md` — component inventory, number formatting contract, layout contract, color system
- `03-CONTEXT.md` — all locked decisions (D-01 through D-17)

### Secondary (MEDIUM confidence)

- [finnhub.io/docs/api/quote](https://finnhub.io/docs/api/quote) — quote endpoint response format (`c` field)
- [docs.coingecko.com](https://docs.coingecko.com/reference/simple-price) — CoinGecko `/simple/price` endpoint, Demo API key header `x-cg-demo-api-key`, base URL `api.coingecko.com/api/v3`
- [github.com/recharts/recharts/wiki/3.0-migration-guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide) — breaking changes in recharts 3.0 (CategoricalChartState removed, React 16.8+ minimum)
- Multiple community sources — Finnhub free tier covers US stocks; international exchanges require paid plan ($50/month per exchange)

### Tertiary (LOW confidence)

- R-bloggers article (2021) — BOK ECOS API URL format `https://ecos.bok.or.kr/api/StatisticSearch/{key}/json/kr/...` (format likely unchanged, but stat codes are UNVERIFIED)
- WebSearch results — BOK stat code for USD/KRW reference rate not confirmed; needs Wave 0 manual verification

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — recharts version verified via npm registry; peer deps confirmed
- Finnhub adapter pattern: MEDIUM — endpoint format confirmed, KRX free-tier coverage LOW confidence
- CoinGecko adapter pattern: MEDIUM — endpoint confirmed; Phase 3 scope is stub-only
- BOK FX API: LOW — URL format pattern cited, stat codes ASSUMED; must verify in Wave 0
- Architecture: HIGH — follows established project patterns (Server Actions, Drizzle, `'use client'` wrappers)
- Portfolio math: HIGH — formulas directly from locked CONTEXT.md decisions D-15/D-16/D-17
- UI patterns: HIGH — from approved 03-UI-SPEC.md

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (recharts/API versions may change; BOK stat codes are stable once confirmed)
