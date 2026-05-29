import { getPriceCacheByTicker, upsertPriceCache } from '@/db/queries/price-cache'
import { fetchYahooQuote, fetchYahooFxRate } from '@/lib/price/yahoo'
import { fetchFunetfNav } from '@/lib/price/funetf'

const PRICE_TTL_MS = 5 * 60 * 1000
const FX_TTL_MS = 60 * 60 * 1000

const KR_ASSET_TYPES = ['stock_kr', 'etf_kr']

function isStale(cachedAt: Date, ttlMs: number): boolean {
  return Date.now() - cachedAt.getTime() > ttlMs
}

export async function refreshPriceIfStale(ticker: string, assetType: string): Promise<void> {
  const cached = await getPriceCacheByTicker(ticker)
  if (cached && !isStale(cached.cachedAt, PRICE_TTL_MS)) return

  if (assetType === 'fund') {
    const result = await fetchFunetfNav(ticker)
    if (result === null || result.price <= 0) return
    const changeBps = result.changePercent !== null ? Math.round(result.changePercent * 100) : null
    await upsertPriceCache({ ticker, priceKrw: result.price, priceOriginal: result.price, currency: 'KRW', changeBps })
    return
  }

  if (KR_ASSET_TYPES.includes(assetType)) {
    const result = await fetchYahooQuote(ticker)
    if (result === null || result.price <= 0) return
    const priceKrw = Math.round(result.price)
    const changeBps = result.changePercent !== null ? Math.round(result.changePercent * 100) : null
    await upsertPriceCache({ ticker, priceKrw, priceOriginal: priceKrw, currency: 'KRW', changeBps })
    return
  }

  // US stocks/ETFs and crypto — price in USD, convert via FX
  const result = await fetchYahooQuote(ticker)
  if (result === null || result.price <= 0) return

  const fxCache = await getPriceCacheByTicker('USD_KRW')
  if (!fxCache || fxCache.priceKrw === 0) return
  const fxRate = fxCache.priceKrw / 10000

  const priceUsdCents = Math.round(result.price * 100)
  const priceKrw = Math.round(result.price * fxRate)
  const changeBps = result.changePercent !== null ? Math.round(result.changePercent * 100) : null
  await upsertPriceCache({ ticker, priceKrw, priceOriginal: priceUsdCents, currency: 'USD', changeBps })
}

export async function refreshFxIfStale(): Promise<void> {
  const cached = await getPriceCacheByTicker('USD_KRW')
  if (cached && !isStale(cached.cachedAt, FX_TTL_MS)) return

  const rateInt = await fetchYahooFxRate()
  if (rateInt === null) return

  await upsertPriceCache({
    ticker: 'USD_KRW',
    priceKrw: rateInt,
    priceOriginal: rateInt,
    currency: 'KRW',
  })
}

export { getPriceCacheByTicker as getPriceFromCache }
