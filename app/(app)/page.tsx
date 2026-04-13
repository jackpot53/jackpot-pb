import { refreshAllPrices } from '@/app/actions/prices'
import { getAssetsWithHoldings } from '@/db/queries/assets-with-holdings'
import { getPriceCacheByTicker } from '@/db/queries/price-cache'
import {
  computeAssetPerformance,
  computePortfolio,
  aggregateByType,
  formatKrw,
  formatUsd,
  formatReturn,
  type AssetPerformance,
} from '@/lib/portfolio'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { DashboardStatCard } from '@/components/app/dashboard-stat-card'
import { AllocationPieChart, type AllocationSlice } from '@/components/app/allocation-pie-chart'
import { AssetTypeBadge } from '@/components/app/asset-type-badge'
import { PerformanceTable } from '@/components/app/performance-table'

// Stale threshold: prices older than 5 minutes show a stale badge in the performance table
const PRICE_TTL_MS = 5 * 60 * 1000

function isStalePrice(cachedAt: Date | null): boolean {
  if (!cachedAt) return true
  return Date.now() - cachedAt.getTime() > PRICE_TTL_MS
}

export default async function DashboardPage() {
  // Step 1: Refresh all prices on-demand (D-01, D-03)
  await refreshAllPrices()

  // Step 2: Load all asset positions
  const assetsWithHoldings = await getAssetsWithHoldings()

  // Step 3: Get FX rate from cache (USD/KRW)
  const fxCache = await getPriceCacheByTicker('USD_KRW')
  const fxRateInt = fxCache?.priceKrw ?? 0

  // Step 4: Compute per-asset performance
  const performances: AssetPerformance[] = []
  for (const asset of assetsWithHoldings) {
    let currentPriceKrw = 0
    let cachedAt: Date | null = null
    let stale = false

    if (asset.priceType === 'live' && asset.ticker) {
      const priceRow = await getPriceCacheByTicker(asset.ticker)
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

  // Step 5: Portfolio summary + type allocation
  const summary = computePortfolio(performances, fxRateInt)
  const byType: AllocationSlice[] = aggregateByType(performances)

  // Step 6: Determine color sign for stat cards
  const returnSign =
    summary.returnPct > 0 ? 'positive' : summary.returnPct < 0 ? 'negative' : 'neutral'
  const gainLossSign =
    summary.gainLossKrw > 0 ? 'positive' : summary.gainLossKrw < 0 ? 'negative' : 'neutral'

  return (
    <div className="space-y-8">
      {/* Row 1: Stat Cards — 4 columns on lg, 2 on md (DASH-01, DASH-04) */}
      <div className="grid grid-cols-4 gap-4 md:grid-cols-2">
        <DashboardStatCard
          label="총 자산 (KRW)"
          primaryValue={formatKrw(summary.totalValueKrw)}
        />
        <DashboardStatCard
          label="총 자산 (USD)"
          primaryValue={formatUsd(summary.totalValueUsd)}
        />
        <DashboardStatCard
          label="전체 수익률"
          primaryValue={formatReturn(summary.returnPct)}
          secondaryValue={formatKrw(summary.gainLossKrw)}
          secondarySign={returnSign}
        />
        <DashboardStatCard
          label="평가손익 (KRW)"
          primaryValue={formatKrw(summary.gainLossKrw)}
          secondarySign={gainLossSign}
        />
      </div>

      {/* Row 2: Allocation Pie Chart + Breakdown List (DASH-02) */}
      <div className="grid grid-cols-2 gap-6 md:grid-cols-1">
        {/* Left: Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">자산 배분</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationPieChart data={byType} />
          </CardContent>
        </Card>

        {/* Right: Breakdown by type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">유형별 합계</CardTitle>
          </CardHeader>
          <CardContent>
            {byType.length === 0 ? (
              <p className="text-sm text-muted-foreground">데이터 없음</p>
            ) : (
              <div className="space-y-0">
                {byType.map((entry, i) => (
                  <div key={entry.assetType}>
                    <div className="flex items-center justify-between py-3">
                      <AssetTypeBadge assetType={entry.assetType as 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'savings' | 'real_estate'} />
                      <div className="text-right">
                        <p className="text-base font-semibold">{formatKrw(entry.totalValueKrw)}</p>
                        <p className="text-sm text-muted-foreground">{entry.sharePct.toFixed(1)}%</p>
                      </div>
                    </div>
                    {i < byType.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">종목별 성과</CardTitle>
        </CardHeader>
        <CardContent>
          <PerformanceTable rows={performances} />
        </CardContent>
      </Card>
    </div>
  )
}
