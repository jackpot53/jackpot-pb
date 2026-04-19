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

} from '@/lib/portfolio'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { AllocationPieChart, type AllocationSlice } from '@/components/app/allocation-pie-chart'
import { AssetTypeBadge } from '@/components/app/asset-type-badge'
import { DashboardGoalsSection } from '@/components/app/dashboard-goals-section'
import { TodayReport } from '@/components/app/today-report'
import { timed } from '@/lib/perf'

export default async function DashboardPage() {
  const pageStart = performance.now()
  const user = await getAuthUser()
  if (!user) redirect('/login')

  // Fire-and-forget price refresh: schedules after the response is sent.
  // The page renders immediately with cached prices (stale badge shown if needed).
  // Next request will have fresh prices.
  after(() => { void refreshAllPricesInternal().catch(() => {}) })

  // Load performances + goals in parallel from DB cache — no external API wait
  const [{ performances, priceMap }, goalsList] = await timed('DashboardPage data', () => Promise.all([
    loadPerformances(user.id),
    listGoals(user.id),
  ]))
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[perf] DashboardPage total                  ${(performance.now() - pageStart).toFixed(0).padStart(5)}ms`)
  }

  // Step 3: Extract FX rate from price map
  const fxCache = priceMap.get('USD_KRW')
  // null signals FX rate unavailable (BOK key not configured or first fetch failed)
  const fxRateInt: number | null = fxCache?.priceKrw ?? null

  // Step 4: Portfolio summary + type allocation
  // Pass 0 when FX rate unavailable — computePortfolio guards against divide-by-zero
  const summary = computePortfolio(performances, fxRateInt ?? 0)
  const byType: AllocationSlice[] = aggregateByType(performances)
  const fxRateUnavailable = fxRateInt === null

  return (
    <div className="space-y-8">
      {fxRateUnavailable && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          환율 정보를 불러오는 중입니다. 미국 주식 평가금액이 일시적으로 부정확할 수 있습니다.
        </div>
      )}

      {/* 자산 현황 */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">자산 현황</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Pie Chart */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">자산 배분</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">자산 유형별 비중을 시각화합니다</p>
            </CardHeader>
            <CardContent>
              <AllocationPieChart data={byType} />
            </CardContent>
          </Card>

          {/* Right: Breakdown by type */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">유형별 합계</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">각 자산 유형의 평가금액 합계입니다</p>
            </CardHeader>
            <CardContent>
              {byType.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  아직 자산이 없습니다.{' '}
                  <a href="/assets" className="underline text-foreground">첫 자산을 추가해보세요 →</a>
                </p>
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
      </section>

      {/* 오늘의 리포트 */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">오늘의 리포트</h2>
        <TodayReport performances={performances} />
      </section>

      {/* 목표 */}
      <DashboardGoalsSection goals={goalsList} totalValueKrw={summary.totalValueKrw} />
    </div>
  )
}

