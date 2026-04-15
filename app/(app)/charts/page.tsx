import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { LineChart, TrendingUp, LayoutGrid, PieChart } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { CandlestickChart, type CandlestickPoint } from '@/components/app/candlestick-chart'
import { AssetTypeBadge } from '@/components/app/asset-type-badge'
import { SummaryCards } from '@/components/app/assets-page-client'
import { getAllSnapshotsWithBreakdowns } from '@/db/queries/portfolio-snapshots'
import {
  toDailyCandlestick,
  toMonthlyCandlestick,
  toAnnualCandlestick,
  toMonthlyValueCandlestick,
  snapshotsForType,
} from '@/lib/snapshot/aggregation'
import { refreshAllPrices } from '@/app/actions/prices'
import { loadPerformances } from '@/lib/server/load-performances'
import { formatKrw } from '@/lib/portfolio'
import type { AssetPerformance } from '@/lib/portfolio'
import { PortfolioRadialChart } from '@/components/app/portfolio-radial-chart'
import type { AllocationItem } from '@/components/app/portfolio-radial-chart'

function ChartSkeleton() {
  return (
    <Card className="border">
      <CardHeader>
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-32 mt-1" />
        <Skeleton className="h-3 w-24 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[240px] w-full" />
      </CardContent>
    </Card>
  )
}

function CandlestickSummary({ data, title, subtitle }: { data: CandlestickPoint[]; title: string; subtitle: string }) {
  const last = data[data.length - 1]
  const isUp = last ? last.close >= last.open : true
  const color = isUp ? 'text-red-500' : 'text-blue-600'

  return (
    <div className="mb-3">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </div>
      {last ? (
        <>
          <p className={`text-2xl font-bold tabular-nums mt-0.5 ${color}`}>
            {last.close >= 0 ? '+' : ''}{formatKrw(last.close)}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-xs">
            {last.returnPct !== undefined && (
              <span className={`font-semibold ${color}`}>
                누적 {last.returnPct >= 0 ? '+' : ''}{last.returnPct.toFixed(2)}%
              </span>
            )}
            {last.delta !== undefined && last.delta !== 0 && (
              <span className="text-muted-foreground">
                전기대비 {last.delta >= 0 ? '+' : ''}{formatKrw(last.delta)}
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground mt-1">데이터 없음</p>
      )}
    </div>
  )
}

function AssetTypeCandlestickSummary({ data, assetType }: { data: CandlestickPoint[]; assetType: string }) {
  const last = data[data.length - 1]
  const isUp = last ? last.close >= last.open : true
  const color = isUp ? 'text-red-500' : 'text-blue-600'

  return (
    <div className="mb-2">
      <AssetTypeBadge assetType={assetType as any} />
      {last ? (
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className={`text-lg font-bold tabular-nums ${color}`}>
            {last.close >= 0 ? '+' : ''}{formatKrw(last.close)}
          </span>
          {last.returnPct !== undefined && (
            <span className={`text-xs font-semibold ${color}`}>
              {last.returnPct >= 0 ? '+' : ''}{last.returnPct.toFixed(2)}%
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mt-1">데이터 없음</p>
      )}
    </div>
  )
}

const ASSET_TYPE_ORDER = [
  'stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'savings', 'real_estate', 'insurance', 'precious_metal',
] as const

async function ChartsPageContent({ userId }: { userId: string }) {
  const [{ performances }, snapshots] = await Promise.all([
    (async () => { await refreshAllPrices(); return loadPerformances(userId) })(),
    getAllSnapshotsWithBreakdowns(userId).catch(() => []),
  ])

  const grouped = ASSET_TYPE_ORDER.reduce<Record<string, AssetPerformance[]>>((acc, type) => {
    const items = performances.filter((a) => a.assetType === type)
    if (items.length > 0) acc[type] = items
    return acc
  }, {})

  const dailyCandles = toDailyCandlestick(snapshots)
  const monthlyCandles = toMonthlyCandlestick(snapshots)
  const annualCandles = toAnnualCandlestick(snapshots)
  const valueCandles = toMonthlyValueCandlestick(snapshots)

  // 자산 배분 계산
  const totalValue = performances.reduce((s, a) => s + (a.currentValueKrw || a.totalCostKrw), 0)
  const allocations: AllocationItem[] = ASSET_TYPE_ORDER
    .map((type) => {
      const items = performances.filter((a) => a.assetType === type)
      const valueKrw = items.reduce((s, a) => s + (a.currentValueKrw || a.totalCostKrw), 0)
      return { type, valueKrw, pct: totalValue > 0 ? (valueKrw / totalValue) * 100 : 0 }
    })
    .filter((a) => a.valueKrw > 0)
    .sort((a, b) => b.pct - a.pct)

  // 자산별 월간 캔들 (데이터 있는 타입만)
  const typeCandles = ASSET_TYPE_ORDER
    .map((type) => {
      const typeSnaps = snapshotsForType(snapshots, type)
      const candles = toMonthlyCandlestick(typeSnaps)
      return { type, candles }
    })
    .filter(({ candles }) => candles.length > 0)

  return (
    <div className="space-y-6">
      <SummaryCards grouped={grouped} performances={performances} valueCandles={valueCandles} />
      <Separator className="bg-foreground" />

      {/* 전체 자산 누적 수익률 */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          <TrendingUp className="h-4 w-4 text-blue-500" />전체 자산 누적 수익률
        </h2>
        <div className="grid grid-cols-3 gap-6">
          <Card className="border">
            <CardHeader className="pb-3 border-b">
              <CandlestickSummary data={dailyCandles} title="일간" subtitle={`최근 ${dailyCandles.length}일`} />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[240px]">
                <CandlestickChart data={dailyCandles} />
              </div>
            </CardContent>
          </Card>
          <Card className="border">
            <CardHeader className="pb-3 border-b">
              <CandlestickSummary data={monthlyCandles} title="월간" subtitle={`${monthlyCandles.length}개월`} />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[240px]">
                <CandlestickChart data={monthlyCandles} />
              </div>
            </CardContent>
          </Card>
          <Card className="border">
            <CardHeader className="pb-3 border-b">
              <CandlestickSummary data={annualCandles} title="년간" subtitle={`${annualCandles.length}년`} />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[240px]">
                <CandlestickChart data={annualCandles} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator className="bg-foreground" />

      {/* 자산별 누적 수익률 */}
      {typeCandles.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <LayoutGrid className="h-4 w-4 text-violet-500" />자산별 누적 수익률
          </h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${typeCandles.length}, 1fr)` }}>
            {typeCandles.map(({ type, candles }) => (
              <Card key={type} className="border">
                <CardHeader className="pb-3 border-b">
                  <AssetTypeCandlestickSummary data={candles} assetType={type} />
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-[160px]">
                    <CandlestickChart data={candles} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Separator className="bg-foreground" />

      {/* 자산 배분 */}
      {allocations.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <PieChart className="h-4 w-4 text-emerald-500" />자산 배분
          </h2>
          <Card className="border">
            <CardContent className="pt-6">
              <PortfolioRadialChart allocations={allocations} totalValueKrw={totalValue} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default async function ChartsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <LineChart className="h-5 w-5" />차트
      </h1>
      <Separator className="bg-foreground" />
      <Suspense fallback={
        <div className="grid grid-cols-3 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      }>
        <ChartsPageContent userId={user.id} />
      </Suspense>
    </div>
  )
}
