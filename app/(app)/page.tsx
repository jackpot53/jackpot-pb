import { Suspense } from 'react'
import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { refreshAllPricesInternal } from '@/app/actions/prices'
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
import { DashboardGoalsSection } from '@/components/app/dashboard-goals-section'
import { TodayReport } from '@/components/app/today-report'
import { fetchMarketNewsForTypes } from '@/lib/market-news/fetch'
import type { AssetPerformance } from '@/lib/portfolio/portfolio'

export default async function DashboardPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  // Fire-and-forget price refresh: schedules after the response is sent.
  // The page renders immediately with cached prices (stale badge shown if needed).
  // Next request will have fresh prices.
  after(() => { void refreshAllPricesInternal().catch(() => {}) })

  // Load performances + goals in parallel from DB cache — no external API wait
  const [{ performances, priceMap }, goalsList] = await Promise.all([
    loadPerformances(user.id),
    listGoals(user.id),
  ])

  // Step 3: Extract FX rate from price map
  const fxCache = priceMap.get('USD_KRW')
  // null signals FX rate unavailable (BOK key not configured or first fetch failed)
  const fxRateInt: number | null = fxCache?.priceKrw ?? null

  // Step 4: Portfolio summary + type allocation
  // Pass 0 when FX rate unavailable — computePortfolio guards against divide-by-zero
  const summary = computePortfolio(performances, fxRateInt ?? 0)
  const byType: AllocationSlice[] = aggregateByType(performances)

  // Step 6: Determine color sign for stat cards
  const returnSign =
    summary.returnPct > 0 ? 'positive' : summary.returnPct < 0 ? 'negative' : 'neutral'
  const gainLossSign =
    summary.gainLossKrw > 0 ? 'positive' : summary.gainLossKrw < 0 ? 'negative' : 'neutral'

  return (
    <div className="space-y-8">
      {/* 히어로 배너 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-700 via-indigo-700 to-violet-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-48 rounded-full bg-violet-900/40 blur-3xl" />
          <div className="absolute top-6 right-20 w-28 h-28 rounded-full border border-white/10" />
          <div className="absolute top-12 right-28 w-14 h-14 rounded-full border border-white/10" />
          <div className="absolute top-16 right-24 w-6 h-6 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full border border-white/10" />
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        </div>
        <div className="relative space-y-2">
          <div className="flex items-center gap-1.5 text-indigo-200 text-xs font-semibold tracking-widest uppercase">
            <span>💼</span>포트폴리오 요약
          </div>
          <h1 className="text-3xl font-bold tracking-tight">내 자산 현황</h1>
          <p className="text-indigo-100/70 text-sm">
            총 자산 <span className="text-white font-semibold">{formatKrw(summary.totalValueKrw)}</span>
            {summary.returnPct !== 0 && (
              <span className={`ml-2 font-medium ${summary.returnPct > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {summary.returnPct > 0 ? '▲' : '▼'} {Math.abs(summary.returnPct).toFixed(2)}%
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Row 1: Stat Cards — 4 columns on lg, 2 on md (DASH-01, DASH-04) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStatCard
          label="총 자산 (KRW)"
          primaryValue={formatKrw(summary.totalValueKrw)}
          accentColor="border-l-indigo-500"
        />
        <DashboardStatCard
          label="총 자산 (USD)"
          primaryValue={fxRateInt !== null ? formatUsd(summary.totalValueUsd) : 'N/A'}
          accentColor="border-l-blue-500"
        />
        <DashboardStatCard
          label="전체 수익률"
          primaryValue={formatReturn(summary.returnPct)}
          secondaryValue={formatKrw(summary.gainLossKrw)}
          secondarySign={returnSign}
          accentColor={returnSign === 'positive' ? 'border-l-emerald-500' : returnSign === 'negative' ? 'border-l-red-500' : 'border-l-slate-400'}
        />
        <DashboardStatCard
          label="평가손익 (KRW)"
          primaryValue={formatKrw(summary.gainLossKrw)}
          secondarySign={gainLossSign}
          accentColor={gainLossSign === 'positive' ? 'border-l-emerald-500' : gainLossSign === 'negative' ? 'border-l-red-500' : 'border-l-slate-400'}
        />
      </div>

      {/* Row 2: Allocation Pie Chart + Breakdown List (DASH-02) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Pie Chart */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50/60 to-transparent dark:from-blue-950/20 rounded-tl-[calc(var(--radius)-1px)]">
            <CardTitle className="text-base font-semibold text-blue-700 dark:text-blue-400">자산 배분</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">자산 유형별 비중을 시각화합니다</p>
          </CardHeader>
          <CardContent>
            <AllocationPieChart data={byType} />
          </CardContent>
        </Card>

        {/* Right: Breakdown by type */}
        <Card className="border-l-4 border-l-violet-500 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-violet-50/60 to-transparent dark:from-violet-950/20 rounded-tl-[calc(var(--radius)-1px)]">
            <CardTitle className="text-base font-semibold text-violet-700 dark:text-violet-400">유형별 합계</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">각 자산 유형의 평가금액 합계입니다</p>
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

      {/* Row 3: Today's Report — news streamed via Suspense (no TTFB block) */}
      <Suspense fallback={<TodayReport performances={performances} />}>
        <TodayReportWithNews performances={performances} />
      </Suspense>

      {/* Row 4: Goals Section — hidden when no goals (D-03, D-04) */}
      <DashboardGoalsSection goals={goalsList} totalValueKrw={summary.totalValueKrw} />
    </div>
  )
}

async function TodayReportWithNews({ performances }: { performances: AssetPerformance[] }) {
  const assetTypes = [...new Set(performances.map((a) => a.assetType))]
  const news = await fetchMarketNewsForTypes(assetTypes)
  return <TodayReport performances={performances} news={news} />
}
