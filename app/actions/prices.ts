'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { db } from '@/db'
import { assets } from '@/db/schema/assets'
import { and, eq, isNotNull } from 'drizzle-orm'
import { refreshPriceIfStale, refreshFxIfStale } from '@/lib/price/cache'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

/**
 * Refreshes all LIVE asset prices and the USD/KRW exchange rate.
 * Called on dashboard load (on-demand pattern, D-01).
 * Stale fallback applies if any individual API call fails (D-02, D-09).
 *
 * Execution order:
 * 1. FX rate first — needed for USD→KRW conversion in stock price upserts
 * 2. Then all LIVE assets with a ticker symbol
 */
export async function refreshAllPrices(): Promise<void> {
  await requireUser()

  // Step 1: Refresh FX rate (TTL 1 hour, D-09)
  await refreshFxIfStale()

  // Step 2: Fetch all assets with priceType='live' that have a ticker
  const liveAssets = await db
    .select({ id: assets.id, ticker: assets.ticker, assetType: assets.assetType })
    .from(assets)
    .where(and(eq(assets.priceType, 'live'), isNotNull(assets.ticker)))

  // Step 3: Refresh each live asset price sequentially (free-tier API rate limit caution)
  for (const asset of liveAssets) {
    if (!asset.ticker) continue
    await refreshPriceIfStale(asset.ticker, asset.assetType)
  }
}
