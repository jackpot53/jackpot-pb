'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { db } from '@/db'
import { assets } from '@/db/schema/assets'
import { priceCache } from '@/db/schema/price-cache'
import { and, eq, isNotNull, or, sql } from 'drizzle-orm'
import { getPriceCacheByTickers, upsertPriceCache } from '@/db/queries/price-cache'
import { refreshFxIfStale } from '@/lib/price/cache'
import { fetchFunetfNav } from '@/lib/price/funetf'
import { fetchYahooQuote } from '@/lib/price/yahoo'
import { timed } from '@/lib/perf'

const PRICE_TTL_MS = 5 * 60 * 1000
const KR_ASSET_TYPES = ['stock_kr', 'etf_kr']
const DEDUP_MS = 150_000
const CONCURRENCY = 10

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let idx = 0
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++
      results[i] = await tasks[i]()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}

export async function refreshAllPricesInternal(): Promise<void> {
  return timed('refreshAllPricesInternal', async () => {
    const [{ maxCachedAt }] = await db
      .select({ maxCachedAt: sql<Date | null>`MAX(${priceCache.cachedAt})` })
      .from(priceCache)

    if (maxCachedAt && Date.now() - new Date(maxCachedAt).getTime() < DEDUP_MS) return

    await refreshFxIfStale()

    const liveAssets = await db
      .select({ ticker: assets.ticker, assetType: assets.assetType })
      .from(assets)
      .where(and(
        isNotNull(assets.ticker),
        or(eq(assets.priceType, 'live'), eq(assets.assetType, 'fund'))
      ))

    const tickers = liveAssets.filter((a) => a.ticker).map((a) => a.ticker!)
    if (tickers.length === 0) return

    const cacheMap = await getPriceCacheByTickers([...tickers, 'USD_KRW'])
    const now = Date.now()

    const staleAssets = liveAssets.filter((a) => {
      if (!a.ticker) return false
      const cached = cacheMap.get(a.ticker)
      return !cached || now - cached.cachedAt.getTime() > PRICE_TTL_MS
    }) as { ticker: string; assetType: string }[]

    if (staleAssets.length === 0) return

    const fxCache = cacheMap.get('USD_KRW')
    const fxRate = fxCache ? fxCache.priceKrw / 10000 : null

    await timed(`  fetch ${staleAssets.length} stale tickers`, () =>
      withConcurrency(
        staleAssets.map(({ ticker, assetType }) => async () => {
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
              // US stocks/ETFs and crypto
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
        }),
        CONCURRENCY,
      )
    )
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

/**
 * Fetches and caches the price for a single ticker.
 * Used when creating a new asset so the price is available immediately on redirect.
 * Silently swallows errors — caller should not depend on success.
 */
export async function refreshSinglePriceInternal(ticker: string, assetType: string): Promise<void> {
  await refreshFxIfStale()
  const cacheMap = await getPriceCacheByTickers(['USD_KRW'])
  const fxRate = cacheMap.get('USD_KRW')?.priceKrw ? cacheMap.get('USD_KRW')!.priceKrw / 10000 : null

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
}
