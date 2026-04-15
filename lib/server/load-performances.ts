import { getAssetsWithHoldings } from '@/db/queries/assets-with-holdings'
import { getPriceCacheByTickers } from '@/db/queries/price-cache'
import { computeAssetPerformance, type AssetPerformance } from '@/lib/portfolio'

// Stale threshold: prices older than 5 minutes show a stale badge in the performance table
const PRICE_TTL_MS = 5 * 60 * 1000

function isStalePrice(cachedAt: Date | null): boolean {
  if (!cachedAt) return true
  return Date.now() - cachedAt.getTime() > PRICE_TTL_MS
}

export async function loadPerformances(userId: string): Promise<{
  performances: AssetPerformance[]
  priceMap: Map<string, { priceKrw: number; cachedAt: Date | null }>
}> {
  const assetsWithHoldings = await getAssetsWithHoldings(userId)

  // Include live assets AND fund assets with a ticker (may have priceType='manual' in legacy data)
  const liveTickers = assetsWithHoldings
    .filter((a) => (a.priceType === 'live' || a.assetType === 'fund') && a.ticker)
    .map((a) => a.ticker!)
  const priceMap = await getPriceCacheByTickers([...liveTickers, 'USD_KRW'])

  const performances: AssetPerformance[] = []
  for (const asset of assetsWithHoldings.filter(
    (a) => Number(a.totalQuantity ?? 0) > 0 || Number(a.totalCostKrw ?? 0) > 0 || a.latestManualValuationKrw !== null
  )) {
    let currentPriceKrw = 0
    let cachedAt: Date | null = null
    let stale = false

    let dailyChangeBps: number | null = null
    if ((asset.priceType === 'live' || asset.assetType === 'fund') && asset.ticker) {
      const priceRow = priceMap.get(asset.ticker)
      currentPriceKrw = priceRow?.priceKrw ?? 0
      cachedAt = priceRow?.cachedAt ?? null
      stale = isStalePrice(cachedAt)
      dailyChangeBps = priceRow?.changeBps ?? null
    }

    // DB bigint columns returned as strings when coming from raw SQL subqueries —
    // explicitly coerce to number to prevent string concatenation in reduce().
    performances.push(
      computeAssetPerformance({
        holding: {
          ...asset,
          totalQuantity: Number(asset.totalQuantity ?? 0),
          avgCostPerUnit: Number(asset.avgCostPerUnit ?? 0),
          totalCostKrw: Number(asset.totalCostKrw ?? 0),
        },
        currentPriceKrw,
        isStale: stale,
        cachedAt,
        dailyChangeBps,
        latestManualValuationKrw: asset.latestManualValuationKrw !== null
          ? Number(asset.latestManualValuationKrw)
          : null,
      })
    )
  }

  return { performances, priceMap }
}
