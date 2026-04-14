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

  const liveTickers = assetsWithHoldings
    .filter((a) => a.priceType === 'live' && a.ticker)
    .map((a) => a.ticker!)
  const priceMap = await getPriceCacheByTickers([...liveTickers, 'USD_KRW'])

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
        latestManualValuationKrw: asset.latestManualValuationKrw !== null
          ? Number(asset.latestManualValuationKrw)
          : null,
      })
    )
  }

  return { performances, priceMap }
}
