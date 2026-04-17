'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { db } from '@/db'
import { assets } from '@/db/schema/assets'
import { priceCache } from '@/db/schema/price-cache'
import { and, eq, isNotNull, or, sql } from 'drizzle-orm'
import { getPriceCacheByTickers, upsertPriceCache } from '@/db/queries/price-cache'
import { fetchYahooQuote } from '@/lib/price/yahoo'
import { refreshFxIfStale } from '@/lib/price/cache'
import { fetchFunetfNav } from '@/lib/price/funetf'
import { timed } from '@/lib/perf'

const PRICE_TTL_MS = 5 * 60 * 1000
const KR_ASSET_TYPES = ['stock_kr', 'etf_kr']
// Dedup window: skip refresh if any price was cached within the last 150 s.
// Uses DB MAX(cached_at) so all serverless instances share the same guard.
const DEDUP_MS = 150_000

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

/**
 * Internal bulk refresh — no auth check.
 * Used by both the user-facing `refreshAllPrices` Server Action and the cron route handler.
 * Strategy: one MAX(cached_at) check → one bulk DB read → parallel API calls for stale tickers.
 */
export async function refreshAllPricesInternal(): Promise<void> {
  return timed('refreshAllPricesInternal', async () => {
  // Global dedup: if any ticker was refreshed within DEDUP_MS, skip entirely.
  // MAX(cached_at) is shared across all serverless instances — no per-process state.
  const [{ maxCachedAt }] = await db
    .select({ maxCachedAt: sql<Date | null>`MAX(${priceCache.cachedAt})` })
    .from(priceCache)

  if (maxCachedAt && Date.now() - new Date(maxCachedAt).getTime() < DEDUP_MS) return

  // Step 1: Refresh FX rate (TTL 1 hour)
  await refreshFxIfStale()

  // Step 2: Fetch all priceable assets with a ticker (one query).
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
  const cacheMap = await getPriceCacheByTickers([...tickers, 'USD_KRW'])
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

  // Step 5: Parallel API calls for stale tickers only
  await timed(`  fetch ${staleAssets.length} stale tickers`, () => Promise.allSettled(
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
  ))
  })
}

/**
 * User-facing Server Action: refreshes all LIVE asset prices and the USD/KRW FX rate.
 * Validates auth before delegating to the shared internal implementation.
 */
export async function refreshAllPrices(): Promise<void> {
  await requireUser()
  await refreshAllPricesInternal()
}
