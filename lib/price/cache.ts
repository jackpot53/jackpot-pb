import { getPriceCacheByTicker, upsertPriceCache } from '@/db/queries/price-cache'
import { fetchFinnhubQuote } from '@/lib/price/finnhub'
import { fetchYahooFxRate } from '@/lib/price/yahoo'
import { fetchBokFxRate } from '@/lib/price/bok-fx'
import { fetchFunetfNav } from '@/lib/price/funetf'
import { fetchKisQuote } from '@/lib/price/kis'

const KR_ASSET_TYPES = ['stock_kr', 'etf_kr']
const US_ASSET_TYPES = ['stock_us', 'etf_us']

const PRICE_TTL_MS = 5 * 60 * 1000    // 5 minutes (D-01)
const FX_TTL_MS = 60 * 60 * 1000      // 1 hour (D-09)

function isStale(cachedAt: Date, ttlMs: number): boolean {
  return Date.now() - cachedAt.getTime() > ttlMs
}

/**
 * Refreshes price for a LIVE stock/ETF asset if cache is older than 5 minutes.
 * If API returns null (unavailable / KRX not covered), existing cache is preserved (D-02).
 *
 * @param ticker - Asset ticker symbol (e.g. 'AAPL', '005930.KS')
 * @param assetType - Used to determine USD→KRW conversion path
 */
export async function refreshPriceIfStale(ticker: string, assetType: string): Promise<void> {
  const cached = await getPriceCacheByTicker(ticker)

  // If cache exists and is fresh, skip API call
  if (cached && !isStale(cached.cachedAt, PRICE_TTL_MS)) return

  // Korean funds → FunETF (returns KRW NAV directly, no FX needed)
  if (assetType === 'fund') {
    const result = await fetchFunetfNav(ticker)
    if (result === null || result.price <= 0) return
    const changeBps = result.changePercent !== null ? Math.round(result.changePercent * 100) : null
    await upsertPriceCache({ ticker, priceKrw: result.price, priceOriginal: result.price, currency: 'KRW', changeBps })
    return
  }

  // Korean stocks/ETFs → KIS (returns KRW directly, no FX needed)
  if (KR_ASSET_TYPES.includes(assetType)) {
    const result = await fetchKisQuote(ticker, assetType)
    if (result === null) return

    const priceKrw = Math.round(result.price)
    if (priceKrw <= 0) return

    const changeBps = result.changePercent !== null ? Math.round(result.changePercent * 100) : null
    await upsertPriceCache({ ticker, priceKrw, priceOriginal: priceKrw, currency: 'KRW', changeBps })
    return
  }

  // US stocks/ETFs → KIS (returns USD float, convert via FX rate)
  if (US_ASSET_TYPES.includes(assetType)) {
    const result = await fetchKisQuote(ticker, assetType)

    // D-02: If API fails/returns null, do NOT write zero — preserve existing cache
    if (result === null) return

    // Need FX rate to convert USD → KRW
    const fxCache = await getPriceCacheByTicker('USD_KRW')
    // FX rate stored as integer × 10000 (D-17). If unavailable, skip update.
    if (!fxCache || fxCache.priceKrw === 0) return

    const fxRate = fxCache.priceKrw / 10000  // e.g. 13565000 → 1356.5
    const priceUsdCents = Math.round(result.price * 100)
    const priceKrw = Math.round(result.price * fxRate)
    const changeBps = result.changePercent !== null ? Math.round(result.changePercent * 100) : null

    await upsertPriceCache({
      ticker,
      priceKrw,
      priceOriginal: priceUsdCents,
      currency: 'USD',
      changeBps,
    })
    return
  }

  // Crypto → Finnhub (returns USD cents, convert via FX rate)
  const finnhubResult = await fetchFinnhubQuote(ticker)

  // D-02: If API fails/returns null, do NOT write zero — preserve existing cache
  if (finnhubResult === null) return

  // Need FX rate to convert USD → KRW
  const fxCache = await getPriceCacheByTicker('USD_KRW')
  // FX rate stored as integer × 10000 (D-17). If unavailable, skip update.
  if (!fxCache || fxCache.priceKrw === 0) return

  const fxRate = fxCache.priceKrw / 10000  // e.g. 13565000 → 1356.5
  const priceUsd = finnhubResult.priceUsdCents / 100
  const priceKrw = Math.round(priceUsd * fxRate)
  const changeBps = finnhubResult.changePercent !== null ? Math.round(finnhubResult.changePercent * 100) : null

  await upsertPriceCache({
    ticker,
    priceKrw,
    priceOriginal: finnhubResult.priceUsdCents,
    currency: 'USD',
    changeBps,
  })
}

/**
 * Refreshes USD/KRW exchange rate if cache is older than 1 hour.
 * Cached as ticker 'USD_KRW'. priceKrw stores rate × 10000 (integer) per D-17.
 * If BOK API fails, existing cache is preserved (D-09 stale fallback).
 */
export async function refreshFxIfStale(): Promise<void> {
  const cached = await getPriceCacheByTicker('USD_KRW')

  if (cached && !isStale(cached.cachedAt, FX_TTL_MS)) return

  const rateInt = await fetchBokFxRate() ?? await fetchYahooFxRate()
  if (rateInt === null) return             // stale fallback: keep existing cache

  await upsertPriceCache({
    ticker: 'USD_KRW',
    priceKrw: rateInt,
    priceOriginal: rateInt,
    currency: 'KRW',
  })
}

/**
 * Reads priceCache for a ticker. Returns null if no cache entry exists.
 */
export { getPriceCacheByTicker as getPriceFromCache }
