'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { db } from '@/db'
import { assets } from '@/db/schema/assets'
import { and, eq, isNotNull, or } from 'drizzle-orm'
import { getPriceCacheByTickers, upsertPriceCache } from '@/db/queries/price-cache'
import { fetchYahooQuote } from '@/lib/price/yahoo'
import { fetchFinnhubQuote } from '@/lib/price/finnhub'
import { fetchBokFxRate } from '@/lib/price/bok-fx'
import { refreshFxIfStale } from '@/lib/price/cache'
import { fetchFunetfNav } from '@/lib/price/funetf'

const PRICE_TTL_MS = 5 * 60 * 1000
const KR_ASSET_TYPES = ['stock_kr', 'etf_kr']

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

/**
 * Refreshes all LIVE asset prices and the USD/KRW exchange rate.
 * Strategy: one bulk DB read to check staleness, then parallel API calls for stale tickers only.
 * This avoids N sequential DB round-trips while keeping connection pool usage low.
 */
export async function refreshAllPrices(): Promise<void> {
  await requireUser()

  // Step 1: Refresh FX rate (TTL 1 hour)
  await refreshFxIfStale()

  // Step 2: Fetch all priceable assets with a ticker (one query).
  // Includes: all priceType='live' assets AND fund assets with a ticker regardless of priceType
  // (existing fund assets may still have priceType='manual' from before live pricing was supported)
  const liveAssets = await db
    .select({ ticker: assets.ticker, assetType: assets.assetType })
    .from(assets)
    .where(and(
      isNotNull(assets.ticker),
      or(eq(assets.priceType, 'live'), eq(assets.assetType, 'fund'))
    ))

  const tickers = liveAssets.filter((a) => a.ticker).map((a) => a.ticker!)
  if (tickers.length === 0) return

  // Step 3: Bulk-fetch cache for all tickers (one query)
  const cacheMap = await getPriceCacheByTickers(tickers)
  const now = Date.now()

  const staleAssets = liveAssets.filter((a) => {
    if (!a.ticker) return false
    const cached = cacheMap.get(a.ticker)
    return !cached || now - cached.cachedAt.getTime() > PRICE_TTL_MS
  }) as { ticker: string; assetType: string }[]

  if (staleAssets.length === 0) return

  // Step 4: Fetch FX rate from cache (needed for USD→KRW conversion)
  const fxCache = cacheMap.get('USD_KRW')
  const fxRate = fxCache ? fxCache.priceKrw / 10000 : null

  // Step 5: Parallel API calls for stale tickers only (no DB calls inside)
  await Promise.allSettled(
    staleAssets.map(async ({ ticker, assetType }) => {
      try {
        if (assetType === 'fund') {
          const result = await fetchFunetfNav(ticker)
          if (!result || result.price <= 0) return
          const changeBps = result.changePercent !== null ? Math.round(result.changePercent * 100) : null
          await upsertPriceCache({ ticker, priceKrw: result.price, priceOriginal: result.price, currency: 'KRW', changeBps })
        } else if (KR_ASSET_TYPES.includes(assetType)) {
          const result = await fetchYahooQuote(ticker)
          if (!result || result.price <= 0) return
          const priceKrw = Math.round(result.price)
          const changeBps = result.changePercent !== null ? Math.round(result.changePercent * 100) : null
          await upsertPriceCache({ ticker, priceKrw, priceOriginal: priceKrw, currency: 'KRW', changeBps })
        } else {
          const finnhubResult = await fetchFinnhubQuote(ticker)
          if (finnhubResult === null || !fxRate) return
          const priceKrw = Math.round((finnhubResult.priceUsdCents / 100) * fxRate)
          const changeBps = finnhubResult.changePercent !== null ? Math.round(finnhubResult.changePercent * 100) : null
          await upsertPriceCache({ ticker, priceKrw, priceOriginal: finnhubResult.priceUsdCents, currency: 'USD', changeBps })
        }
      } catch {
        // stale fallback: skip on error, existing cache preserved
      }
    })
  )
}
