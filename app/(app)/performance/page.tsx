import { getAssetsWithHoldings } from '@/db/queries/assets-with-holdings'
import { getPriceCacheByTickers } from '@/db/queries/price-cache'
import { computeAssetPerformance, type AssetPerformance } from '@/lib/portfolio'
import { Card, CardContent } from '@/components/ui/card'
import { PerformanceFilterClient } from '@/components/app/performance-filter-client'

// Same stale threshold as dashboard
const PRICE_TTL_MS = 5 * 60 * 1000

function isStalePrice(cachedAt: Date | null): boolean {
  if (!cachedAt) return true
  return Date.now() - cachedAt.getTime() > PRICE_TTL_MS
}

export default async function PerformancePage() {
  // Load all asset positions
  const assetsWithHoldings = await getAssetsWithHoldings()

  // Get cached prices — do NOT call refreshAllPrices() on this page
  // Dashboard is the canonical price refresh trigger (see RESEARCH.md open question resolution)
  const liveTickers = assetsWithHoldings
    .filter((a) => a.priceType === 'live' && a.ticker)
    .map((a) => a.ticker!)
  const priceMap = await getPriceCacheByTickers([...liveTickers, 'USD_KRW'])

  // Compute per-asset performance (same logic as dashboard)
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">성과 비교</h1>
      <Card>
        <CardContent className="pt-6">
          <PerformanceFilterClient rows={performances} />
        </CardContent>
      </Card>
    </div>
  )
}
