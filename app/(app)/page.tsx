import { refreshAllPrices } from '@/app/actions/prices'
import { getAssetsWithHoldings } from '@/db/queries/assets-with-holdings'
import { getPriceCacheByTickers } from '@/db/queries/price-cache'
import { listGoals } from '@/db/queries/goals'
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
import { DashboardGoalsSection } from '@/components/app/dashboard-goals-section'

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

  // Step 3: Get FX rate + all live asset prices in one bulk query
  const liveTickers = assetsWithHoldings
    .filter((a) => a.priceType === 'live' && a.ticker)
    .map((a) => a.ticker!)
  const priceMap = await getPriceCacheByTickers([...liveTickers, 'USD_KRW'])
  const fxCache = priceMap.get('USD_KRW')
  // null signals FX rate unavailable (BOK key not configured or first fetch failed)
  const fxRateInt: number | null = fxCache?.priceKrw ?? null

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

  // Step 5: Portfolio summary + type allocation
  // Pass 0 when FX rate unavailable — computePortfolio guards against divide-by-zero
  const summary = computePortfolio(performances, fxRateInt ?? 0)
  const byType: AllocationSlice[] = aggregateByType(performances)

  // Step 6b: Load goals for dashboard goals section (D-03, D-04)
  const goalsList = await listGoals()

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
          primaryValue={fxRateInt !== null ? formatUsd(summary.totalValueUsd) : 'N/A'}
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

      {/* Row 4: Goals Section — hidden when no goals (D-03, D-04) */}
      <DashboardGoalsSection goals={goalsList} totalValueKrw={summary.totalValueKrw} />
    </div>
  )
}
