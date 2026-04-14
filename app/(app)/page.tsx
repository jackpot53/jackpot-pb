import { refreshAllPrices } from '@/app/actions/prices'
import { listGoals } from '@/db/queries/goals'
import { loadPerformances } from '@/lib/server/load-performances'
import {
  computePortfolio,
  aggregateByType,
  formatKrw,
  formatUsd,
  formatReturn,
} from '@/lib/portfolio'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { DashboardStatCard } from '@/components/app/dashboard-stat-card'
import { AllocationPieChart, type AllocationSlice } from '@/components/app/allocation-pie-chart'
import { AssetTypeBadge } from '@/components/app/asset-type-badge'
import { PerformanceTable } from '@/components/app/performance-table'
import { DashboardGoalsSection } from '@/components/app/dashboard-goals-section'

export default async function DashboardPage() {
  // Step 1: Refresh all prices on-demand (D-01, D-03)
  await refreshAllPrices()

  // Step 2: Load performances + price map via shared helper
  const { performances, priceMap } = await loadPerformances()

  // Step 3: Extract FX rate from price map
  const fxCache = priceMap.get('USD_KRW')
  // null signals FX rate unavailable (BOK key not configured or first fetch failed)
  const fxRateInt: number | null = fxCache?.priceKrw ?? null

  // Step 4: Portfolio summary + type allocation
  // Pass 0 when FX rate unavailable — computePortfolio guards against divide-by-zero
  const summary = computePortfolio(performances, fxRateInt ?? 0)
  const byType: AllocationSlice[] = aggregateByType(performances)

  // Step 5: Load goals for dashboard goals section (D-03, D-04)
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
