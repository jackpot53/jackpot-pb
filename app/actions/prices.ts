'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { db } from '@/db'
import { assets } from '@/db/schema/assets'
import { and, eq, isNotNull, or } from 'drizzle-orm'
import { getPriceCacheByTickers, upsertPriceCache } from '@/db/queries/price-cache'
import { fetchYahooQuote } from '@/lib/price/yahoo'
import { refreshFxIfStale } from '@/lib/price/cache'
import { fetchFunetfNav } from '@/lib/price/funetf'

const PRICE_TTL_MS = 5 * 60 * 1000
const KR_ASSET_TYPES = ['stock_kr', 'etf_kr']
// Process-level guard: skip redundant DB round-trips when prices were recently refreshed.
// Half of PRICE_TTL_MS (150 s) keeps prices fresh while avoiding repeated checks on warm containers.
let lastRefreshedAt = 0

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
  if (Date.now() - lastRefreshedAt < 150_000) return

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
  if (tickers.length === 0) { lastRefreshedAt = Date.now(); return }

  // Step 3: Bulk-fetch cache for all tickers (one query), including USD_KRW for FX conversion
  const cacheMap = await getPriceCacheByTickers([...tickers, 'USD_KRW'])
  const now = Date.now()

  const staleAssets = liveAssets.filter((a) => {
    if (!a.ticker) return false
    const cached = cacheMap.get(a.ticker)
    return !cached || now - cached.cachedAt.getTime() > PRICE_TTL_MS
  }) as { ticker: string; assetType: string }[]

  if (staleAssets.length === 0) { lastRefreshedAt = Date.now(); return }

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
          const result = await fetchYahooQuote(ticker)
          if (!result || result.price <= 0) return
          if (!fxRate) return
          const priceUsdCents = Math.round(result.price * 100)
          const priceKrw = Math.round(result.price * fxRate)
          const changeBps = result.changePercent !== null ? Math.round(result.changePercent * 100) : null
          await upsertPriceCache({ ticker, priceKrw, priceOriginal: priceUsdCents, currency: 'USD', changeBps })
        }
      } catch {
        // stale fallback: skip on error, existing cache preserved
      }
    })
  )
  lastRefreshedAt = Date.now()
}
