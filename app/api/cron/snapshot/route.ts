import type { NextRequest } from 'next/server'
import { getAssetsWithHoldings } from '@/db/queries/assets-with-holdings'
import { getPriceCacheByTickers } from '@/db/queries/price-cache'
import { refreshFxIfStale, refreshPriceIfStale } from '@/lib/price/cache'
import {
  computeAssetPerformance,
  computePortfolio,
  type AssetPerformance,
} from '@/lib/portfolio'
import { writePortfolioSnapshot } from '@/lib/snapshot/writer'
import { db } from '@/db'
import { assets } from '@/db/schema/assets'
import { and, eq, isNotNull } from 'drizzle-orm'

const PRICE_TTL_MS = 5 * 60 * 1000

function isStalePrice(cachedAt: Date | null): boolean {
  if (!cachedAt) return true
  return Date.now() - cachedAt.getTime() > PRICE_TTL_MS
}

/**
 * Nightly portfolio snapshot cron job.
 * Vercel calls this GET endpoint at 00:00 UTC (= 09:00 KST) per vercel.json schedule.
 * Auth: Authorization: Bearer {CRON_SECRET} header only — no Supabase session.
 *
 * Per D-03: refreshes prices (with stale fallback on failure), then writes snapshot.
 * Per D-04: Route Handler (not Server Action — cron sends GET, not POST from trusted origin).
 *
 * Security: T-04-01, T-04-02 — CRON_SECRET header check; fail-closed if env var not set.
 * Idempotency: T-04-04 — onConflictDoNothing via writePortfolioSnapshot.
 *
 * Data retention: one row per day; with 365 rows/year Supabase storage is negligible.
 * Future: add pruning after 12 months if retention becomes a concern.
 */
export async function GET(request: NextRequest) {
  // T-04-01, T-04-02: Security — CRON_SECRET auth; fail-closed when env var not set
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Step 1: Refresh FX rate (stale fallback applies if BOK API fails — D-03, D-09)
    await refreshFxIfStale()

    // Step 2: Refresh prices for all LIVE assets with a ticker
    // Use Promise.allSettled to apply stale fallback per asset (D-03)
    const liveAssets = await db
      .select({ ticker: assets.ticker, assetType: assets.assetType })
      .from(assets)
      .where(and(eq(assets.priceType, 'live'), isNotNull(assets.ticker)))

    await Promise.allSettled(
      liveAssets.map((a) => refreshPriceIfStale(a.ticker!, a.assetType))
    )

    // Step 3: Assemble portfolio data (same pattern as app/(app)/page.tsx, without requireUser())
    // The cron route has direct DB access — no Supabase session required.
    const assetsWithHoldings = await getAssetsWithHoldings()

    const liveTickers = assetsWithHoldings
      .filter((a) => a.priceType === 'live' && a.ticker)
      .map((a) => a.ticker!)
    const priceMap = await getPriceCacheByTickers([...liveTickers, 'USD_KRW'])
    const fxCache = priceMap.get('USD_KRW')
    const fxRateInt: number = fxCache?.priceKrw ?? 0

    // Step 4: Compute per-asset performance
    const performances: AssetPerformance[] = []
    for (const asset of assetsWithHoldings) {
      let currentPriceKrw = 0
      let cachedAt: Date | null = null
      let stale = false

      if (asset.priceType === 'live' && asset.ticker) {
        const priceRow = priceMap.get(asset.ticker)
        currentPriceKrw = priceRow?.priceKrw ?? 0
        cachedAt = priceRow?.cachedAt ?? null
        stale = isStalePrice(cachedAt)
      }

      performances.push(
        computeAssetPerformance({
          holding: asset,
          currentPriceKrw,
          isStale: stale,
          cachedAt,
          latestManualValuationKrw: asset.latestManualValuationKrw,
        })
      )
    }

    // Step 5: Compute portfolio summary
    // Pass 0 when FX rate unavailable — computePortfolio guards divide-by-zero
    const summary = computePortfolio(performances, fxRateInt)

    // Step 6: Write snapshot row (idempotent — onConflictDoNothing on snapshotDate UNIQUE)
    // Use UTC date — cron runs at 00:00 UTC = 09:00 KST (same calendar day)
    const snapshotDate = new Date().toISOString().slice(0, 10)  // 'YYYY-MM-DD' UTC
    // returnBps = overall return vs. cost basis × 10000 (e.g. 13.18% = 13180 bps)
    const returnBps = Math.round((summary.returnPct / 100) * 10000)

    await writePortfolioSnapshot({
      snapshotDate,
      totalValueKrw: summary.totalValueKrw,
      totalCostKrw: summary.totalCostKrw,
      returnBps,
    })

    return Response.json({ ok: true, snapshotDate })
  } catch (error) {
    console.error('[cron/snapshot] error:', error)
    return Response.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
