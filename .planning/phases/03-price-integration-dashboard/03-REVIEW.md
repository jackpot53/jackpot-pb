---
phase: 03-price-integration-dashboard
reviewed: 2026-04-13T00:00:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - app/(app)/page.tsx
  - app/actions/prices.ts
  - components/app/allocation-pie-chart.tsx
  - components/app/dashboard-stat-card.tsx
  - components/app/performance-table.tsx
  - components/app/price-loading-skeleton.tsx
  - components/app/stale-price-badge.tsx
  - components/ui/skeleton.tsx
  - components/ui/tooltip.tsx
  - db/queries/assets-with-holdings.ts
  - db/queries/holdings.ts
  - db/queries/price-cache.ts
  - lib/portfolio.ts
  - lib/portfolio/__tests__/compute.test.ts
  - lib/portfolio/portfolio.ts
  - lib/price/__tests__/bok.test.ts
  - lib/price/__tests__/cache.test.ts
  - lib/price/__tests__/finnhub.test.ts
  - lib/price/bok-fx.ts
  - lib/price/cache.ts
  - lib/price/finnhub.ts
  - package.json
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-04-13T00:00:00Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

This phase implements the live price integration pipeline (Finnhub → BOK FX → price cache → portfolio computation) and the dashboard rendering layer. The core math in `lib/portfolio/portfolio.ts` is clean and well-tested. The price-fetching layer (`lib/price/`) handles stale fallbacks correctly. Two critical issues require attention before this can be considered production-safe: the API key is interpolated directly into a URL without encoding, and the dashboard page executes N+1 sequential DB reads in a loop. Four warnings cover logic gaps that can produce silent incorrect data.

---

## Critical Issues

### CR-01: API key interpolated into URL — potential log/header leakage via unencoded characters

**File:** `lib/price/bok-fx.ts:24`
**Issue:** `apiKey` is taken from `process.env.BOK_API_KEY` and interpolated directly into the URL path segment without `encodeURIComponent`. BOK API keys are alphanumeric so this is low-risk for injection, but if the key ever contains characters such as `+`, `/`, `=` (common in base64-derived tokens), the request URL will be malformed and the raw key value will appear verbatim in server access logs and any error messages. The same pattern exists in `lib/price/finnhub.ts:14` for the `token` query parameter, though the ticker is already encoded there.

**Fix:**
```typescript
// bok-fx.ts line 24
const url = `https://ecos.bok.or.kr/api/StatisticSearch/${encodeURIComponent(apiKey)}/json/kr/1/1/${BOK_STAT_CODE}/D/${today}/${today}/${BOK_ITEM_CODE}`

// finnhub.ts line 14 — token parameter is already in a query string but unencoded
`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${encodeURIComponent(apiKey)}`
```

---

### CR-02: N+1 sequential DB reads per asset inside a server-rendered page

**File:** `app/(app)/page.tsx:47`
**Issue:** `getPriceCacheByTicker(asset.ticker)` is called inside a `for` loop over all live assets. Each call is `await`-ed sequentially. For a portfolio with 10 live assets this issues 10 individual `SELECT … LIMIT 1` queries to the database on every page load, after the price refresh loop in `refreshAllPrices` already issued another N queries. This is a correctness risk in addition to a latency problem: if a new price is written between the refresh phase and the read phase (e.g. a concurrent request), the reads are non-atomic and can return a mix of old and new rows.

**Fix:** Add a bulk query function and call it once:
```typescript
// db/queries/price-cache.ts — add:
export async function getPriceCacheByTickers(
  tickers: string[]
): Promise<Map<string, PriceCacheRow>> {
  if (tickers.length === 0) return new Map()
  const rows = await db
    .select()
    .from(priceCache)
    .where(inArray(priceCache.ticker, tickers))
  return new Map(rows.map((r) => [r.ticker, r]))
}

// app/(app)/page.tsx — replace the loop:
const liveTickers = assetsWithHoldings
  .filter((a) => a.priceType === 'live' && a.ticker)
  .map((a) => a.ticker!)
const priceMap = await getPriceCacheByTickers([...liveTickers, 'USD_KRW'])
const fxCache = priceMap.get('USD_KRW')
// then use priceMap.get(asset.ticker) inside the loop instead of await getPriceCacheByTicker(...)
```

---

## Warnings

### WR-01: MANUAL asset with no manual valuation silently falls back to price 0

**File:** `lib/portfolio/portfolio.ts:55-58`
**Issue:** When `holding.priceType === 'manual'` but `latestManualValuationKrw` is `null` (no valuation row exists), the code falls through to `Math.round((holding.totalQuantity / 1e8) * currentPriceKrw)`. Because `currentPriceKrw` is always passed as `0` for manual assets (see `app/(app)/page.tsx:42`), `currentValueKrw` becomes `0`. The asset then contributes ₩0 to total portfolio value and shows a large negative return, silently distorting the dashboard. There is no warning to the user.

**Fix:** Distinguish the "no valuation" case explicitly:
```typescript
// lib/portfolio/portfolio.ts
const currentValueKrw =
  holding.priceType === 'manual'
    ? (latestManualValuationKrw ?? 0)   // null → 0, caller should surface a warning
    : Math.round((holding.totalQuantity / 1e8) * currentPriceKrw)

// Return a flag so the UI can show "no valuation entered" instead of ₩0
```
At minimum the dashboard should filter out or visually flag MANUAL assets with no valuation.

---

### WR-02: `fxRateInt` falls back to `0` when FX cache is missing — USD display always shows $0

**File:** `app/(app)/page.tsx:37`
**Issue:** `fxCache?.priceKrw ?? 0` returns `0` when there is no `USD_KRW` cache entry. `computePortfolio` guards against divide-by-zero (`fxRate > 0 ? … : 0`), so no crash occurs. However, the "총 자산 (USD)" card will always display `$0.00` until the BOK API key is configured and the first FX fetch succeeds. This is silent — there is no indicator to the user that the USD figure is unavailable.

**Fix:** Pass `null` instead of `0` to signal "unavailable" and render a placeholder in the stat card:
```typescript
// app/(app)/page.tsx
const fxRateInt = fxCache?.priceKrw ?? null

// DashboardStatCard — add a "unavailable" state:
primaryValue={fxRateInt !== null ? formatUsd(summary.totalValueUsd) : 'N/A'}
```

---

### WR-03: `refreshAllPrices` fetches ALL assets with `priceType='live'` regardless of whether they have a ticker — silent no-op per asset

**File:** `app/actions/prices.ts:32-41`
**Issue:** The query at line 32 selects assets where `priceType = 'live'` but applies no `ticker IS NOT NULL` filter. Assets with `priceType='live'` and a null ticker will enter the loop, be caught by `if (!asset.ticker) continue` on line 39, and silently skipped. This is safe today but the schema apparently allows `ticker` to be null even for live-priced assets, indicating a data integrity gap. A DB-level constraint (`NOT NULL` on `ticker` for live assets) or a query-level filter would make the intent explicit and prevent a future silent data problem.

**Fix:**
```typescript
// app/actions/prices.ts — add a NOT NULL filter:
import { and, isNotNull } from 'drizzle-orm'

const liveAssets = await db
  .select({ id: assets.id, ticker: assets.ticker, assetType: assets.assetType })
  .from(assets)
  .where(and(eq(assets.priceType, 'live'), isNotNull(assets.ticker)))
```

---

### WR-04: BOK API date uses server local time — may produce wrong date on UTC servers

**File:** `lib/price/bok-fx.ts:23`
**Issue:** `new Date().toISOString().slice(0, 10)` produces today's date in **UTC**. If the server runs in UTC and the Korean trading day ends at 18:00 KST (09:00 UTC the same calendar day), the BOK API will be queried with yesterday's UTC date during Korean trading hours, returning no data and causing `fetchBokFxRate` to return `null`. This silently preserves a stale FX rate for the rest of the server's operating window.

**Fix:** Use Korea Standard Time (UTC+9) explicitly:
```typescript
const today = new Date()
  .toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' })  // 'YYYY-MM-DD HH:MM:SS'
  .slice(0, 10)
  .replace(/-/g, '')  // YYYYMMDD
```

---

## Info

### IN-01: `computeAssetPerformance` sets `currentPriceKrw` to `latestManualValuationKrw` — semantically incorrect for non-unit assets

**File:** `lib/portfolio/portfolio.ts:68-71`
**Issue:** For MANUAL assets, `currentPriceKrw` in the returned `AssetPerformance` is set to `latestManualValuationKrw` (the total portfolio value of the asset), not a per-unit price. The performance table column is labelled "현재가" (current price) but for savings/real_estate it will display the total asset value as if it were a unit price. This is confusing but not a crash.

**Suggestion:** Consider a separate field (e.g. `displayPriceKrw`) or document that for MANUAL assets, `currentPriceKrw` means "total valuation" and format the table column conditionally based on `priceType`.

---

### IN-02: `price-loading-skeleton.tsx` exports skeletons that are never imported in the reviewed files

**File:** `components/app/price-loading-skeleton.tsx`
**Issue:** `StatCardSkeleton`, `PieChartSkeleton`, and `BreakdownSkeleton` are defined but not used anywhere in the reviewed file set. The dashboard page does not use `Suspense` or skeleton boundaries — it `await`s all data synchronously before rendering. The skeletons are dead code in the current implementation.

**Suggestion:** Either wire them up via a `loading.tsx` in the `(app)` route segment for streaming SSR, or remove them if the on-demand refresh pattern is intentionally synchronous.

---

### IN-03: `grid-cols-4` on mobile will overflow — Tailwind breakpoint order is reversed

**File:** `app/(app)/page.tsx:77`
**Issue:** The class string is `"grid grid-cols-4 gap-4 md:grid-cols-2"`. In Tailwind v4 (mobile-first), `grid-cols-4` is the base (mobile) value and `md:grid-cols-2` applies at ≥768 px — the opposite of the intended layout. On mobile, 4 columns will overflow or render very narrow cards.

**Fix:** Swap the ordering to mobile-first:
```tsx
<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
```

---

_Reviewed: 2026-04-13T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
