---
phase: 03-price-integration-dashboard
fixed_at: 2026-04-13T00:00:00Z
review_path: .planning/phases/03-price-integration-dashboard/03-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 3: Code Review Fix Report

**Fixed at:** 2026-04-13T00:00:00Z
**Source review:** .planning/phases/03-price-integration-dashboard/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (2 Critical, 4 Warning)
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: API key interpolated into URL — potential log/header leakage via unencoded characters

**Files modified:** `lib/price/bok-fx.ts`, `lib/price/finnhub.ts`
**Commit:** 5c27b60
**Applied fix:** Wrapped `apiKey` with `encodeURIComponent()` in both the BOK ECOS URL path segment (`bok-fx.ts:24`) and the Finnhub token query parameter (`finnhub.ts:14`). The ticker was already encoded in finnhub.ts; only the token was missing.

---

### CR-02: N+1 sequential DB reads per asset inside a server-rendered page

**Files modified:** `db/queries/price-cache.ts`, `app/(app)/page.tsx`
**Commit:** edf88e2
**Applied fix:** Added `getPriceCacheByTickers(tickers: string[]): Promise<Map<string, PriceCacheRow>>` bulk query function to `price-cache.ts` using Drizzle's `inArray`. Updated `page.tsx` to collect all live tickers plus `'USD_KRW'` into a single `getPriceCacheByTickers` call before the loop, then replaced the per-asset `await getPriceCacheByTicker(asset.ticker)` calls inside the loop with synchronous `priceMap.get(asset.ticker)` lookups. The `getPriceCacheByTicker` (singular) function was kept for other callers.

---

### WR-01: MANUAL asset with no manual valuation silently falls back to price 0

**Files modified:** `lib/portfolio/portfolio.ts`
**Commit:** c2f2ab8
**Applied fix:** Added `missingValuation: boolean` field to the `AssetPerformance` interface with a JSDoc comment indicating the UI should flag it. In `computeAssetPerformance`, set `missingValuation = holding.priceType === 'manual' && latestManualValuationKrw === null` and simplified the `currentValueKrw` branch to `holding.priceType === 'manual' ? (latestManualValuationKrw ?? 0) : Math.round(...)` for clarity. The field is returned in the result object so downstream UI components can surface a warning for assets without a valuation.

**Note:** This fix requires human verification — the logic change is correct but the UI does not yet render a visible warning based on `missingValuation`. That UI surface is left as a follow-up.

---

### WR-02: `fxRateInt` falls back to `0` when FX cache is missing — USD display always shows $0

**Files modified:** `app/(app)/page.tsx`
**Commit:** d02d494
**Applied fix:** Changed `fxRateInt` from `fxCache?.priceKrw ?? 0` to `fxCache?.priceKrw ?? null` (typed `number | null`). Updated `computePortfolio` call to pass `fxRateInt ?? 0` (preserving type safety). Changed the "총 자산 (USD)" `DashboardStatCard` `primaryValue` to `fxRateInt !== null ? formatUsd(summary.totalValueUsd) : 'N/A'` so the card shows 'N/A' instead of '$0.00' when FX rate is unavailable.

---

### WR-03: `refreshAllPrices` fetches ALL assets with `priceType='live'` regardless of ticker

**Files modified:** `app/actions/prices.ts`
**Commit:** b23957d
**Applied fix:** Added `isNotNull` to the drizzle-orm import alongside `and` and `eq`. Updated the `.where()` clause from `eq(assets.priceType, 'live')` to `and(eq(assets.priceType, 'live'), isNotNull(assets.ticker))`. The existing `if (!asset.ticker) continue` guard was kept as a belt-and-suspenders safety check.

---

### WR-04: BOK API date uses server local time — may produce wrong date on UTC servers

**Files modified:** `lib/price/bok-fx.ts`
**Commit:** 43ce084
**Applied fix:** Replaced `new Date().toISOString().slice(0, 10).replace(/-/g, '')` with `new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 10).replace(/-/g, '')`. The `sv-SE` locale produces `YYYY-MM-DD HH:MM:SS` format, so `.slice(0, 10)` reliably extracts the date portion in KST before stripping hyphens to get `YYYYMMDD`.

---

_Fixed: 2026-04-13T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
