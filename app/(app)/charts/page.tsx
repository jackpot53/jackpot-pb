import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { LineChart, TrendingUp, LayoutGrid, PieChart, DatabaseZap } from 'lucide-react'
import { AnimatedLogo } from '@/components/app/animated-logo'
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
import { after } from 'next/server'
import { refreshAllPricesInternal } from '@/app/actions/prices'
import { loadPerformances } from '@/lib/server/load-performances'
import { formatKrw } from '@/lib/portfolio'
import type { AssetPerformance } from '@/lib/portfolio'
import { PortfolioRadialChart } from '@/components/app/portfolio-radial-chart'
import type { AllocationItem } from '@/components/app/portfolio-radial-chart'
import { TakeSnapshotButton } from '@/components/app/take-snapshot-button'

function ChartSkeleton() {
  return (
    <Card className="border-l-4 border-l-slate-300 dark:border-l-slate-600">
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

// 가상 캔들스틱 바 데이터 (장식용)
const GHOST_BARS = [
  { h: 60, y: 30, wick: [10, 20] },
  { h: 90, y: 50, wick: [20, 15] },
  { h: 40, y: 80, wick: [10, 25] },
  { h: 110, y: 20, wick: [15, 10] },
  { h: 70, y: 60, wick: [20, 20] },
  { h: 50, y: 90, wick: [10, 30] },
  { h: 130, y: 10, wick: [20, 10] },
  { h: 80, y: 40, wick: [15, 20] },
  { h: 55, y: 70, wick: [25, 15] },
]

function NoDataCard({ title }: { title: string }) {
  return (
    <Card className="border-l-4 border-l-slate-300 dark:border-l-slate-600">
      <CardHeader className="pb-3 border-b">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">스냅샷 없음</p>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="relative h-[240px] flex items-center justify-center overflow-hidden">
          {/* 장식용 캔들스틱 실루엣 */}
          <svg
            viewBox="0 0 360 200"
            className="absolute inset-0 w-full h-full opacity-[0.07]"
            preserveAspectRatio="none"
          >
            {GHOST_BARS.map((b, i) => {
              const x = 20 + i * 36
              return (
                <g key={i} fill="currentColor" className="text-foreground">
                  {/* 위 심지 */}
                  <rect x={x + 6} y={b.y - b.wick[0]} width={2} height={b.wick[0]} />
                  {/* 몸통 */}
                  <rect x={x} y={b.y} width={14} height={b.h} rx={2} />
                  {/* 아래 심지 */}
                  <rect x={x + 6} y={b.y + b.h} width={2} height={b.wick[1]} />
                </g>
              )
            })}
            {/* 가로 기준선 */}
            {[40, 80, 120, 160].map((y) => (
              <line key={y} x1={0} y1={y} x2={360} y2={y} stroke="currentColor" strokeWidth={0.5} />
            ))}
          </svg>
          {/* 중앙 안내 */}
          <div className="relative flex flex-col items-center gap-2 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <DatabaseZap className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">아직 스냅샷이 없어요</p>
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
              자산을 등록하면<br />수익률 추이가 여기에 표시됩니다
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CandlestickSummary({ data, title, subtitle }: { data: CandlestickPoint[]; title: string; subtitle: string }) {
  const last = data[data.length - 1]
  const isUp = last ? last.close >= last.open : true
  const color = isUp ? 'text-red-400' : 'text-blue-400'

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
  const color = isUp ? 'text-red-400' : 'text-blue-400'

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
  // Fire-and-forget: refresh prices in the background after response is sent
  after(() => { void refreshAllPricesInternal().catch(() => {}) })

  const [{ performances }, snapshots] = await Promise.all([
    loadPerformances(userId),
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
      <Separator className="bg-white/[0.08]" />

      {/* 전체 자산 누적 수익률 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <TrendingUp className="h-4 w-4 text-blue-500" />전체 자산 누적 수익률
          </h2>
          {(dailyCandles.length === 0 && monthlyCandles.length === 0 && annualCandles.length === 0) && (
            <TakeSnapshotButton />
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dailyCandles.length > 0 ? (
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardHeader className="pb-3 border-b bg-gradient-to-r from-blue-500/10 to-transparent rounded-tl-[calc(var(--radius)-1px)]">
                <CandlestickSummary data={dailyCandles} title="일간" subtitle={`최근 ${dailyCandles.length}일`} />
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[240px]">
                  <CandlestickChart data={dailyCandles} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <NoDataCard title="일간" />
          )}
          {monthlyCandles.length > 0 ? (
            <Card className="border-l-4 border-l-violet-500 shadow-sm">
              <CardHeader className="pb-3 border-b bg-gradient-to-r from-violet-500/10 to-transparent rounded-tl-[calc(var(--radius)-1px)]">
                <CandlestickSummary data={monthlyCandles} title="월간" subtitle={`${monthlyCandles.length}개월`} />
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[240px]">
                  <CandlestickChart data={monthlyCandles} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <NoDataCard title="월간" />
          )}
          {annualCandles.length > 0 ? (
            <Card className="border-l-4 border-l-indigo-500 shadow-sm">
              <CardHeader className="pb-3 border-b bg-gradient-to-r from-indigo-500/10 to-transparent rounded-tl-[calc(var(--radius)-1px)]">
                <CandlestickSummary data={annualCandles} title="년간" subtitle={`${annualCandles.length}년`} />
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[240px]">
                  <CandlestickChart data={annualCandles} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <NoDataCard title="년간" />
          )}
        </div>
      </div>

      <Separator className="bg-white/[0.08]" />

      {/* 자산별 누적 수익률 */}
      {typeCandles.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <LayoutGrid className="h-4 w-4 text-violet-500" />자산별 누적 수익률
          </h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${typeCandles.length}, 1fr)` }}>
            {typeCandles.map(({ type, candles }) => (
              <Card key={type} className="border-l-4 border-l-violet-400 shadow-sm">
                <CardHeader className="pb-3 border-b bg-gradient-to-r from-violet-500/10 to-transparent rounded-tl-[calc(var(--radius)-1px)]">
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

      {/* 자산 배분 */}
      {allocations.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <PieChart className="h-4 w-4 text-emerald-500" />자산 배분
          </h2>
          <Card className="border-l-4 border-l-emerald-500 shadow-sm">
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
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      {/* 히어로 배너 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <style>{`
            @keyframes charts-bar { 0%,100%{transform:scaleY(1);opacity:.35} 50%{transform:scaleY(1.18);opacity:.6} }
            @keyframes charts-line { 0%{stroke-dashoffset:120} 100%{stroke-dashoffset:0} }
            @keyframes charts-glow { 0%,100%{opacity:.2} 50%{opacity:.55} }
            @keyframes charts-ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
          `}</style>
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-48 rounded-full bg-indigo-900/40 blur-3xl" />
          <div className="absolute top-6 right-20 w-28 h-28 rounded-full border border-white/10" />
          <div className="absolute top-12 right-28 w-14 h-14 rounded-full border border-white/10" />
          <div className="absolute top-16 right-24 w-6 h-6 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full border border-white/10" />
          {/* 미니 캔들스틱 차트 — 우측 */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden sm:block">
            <svg viewBox="0 0 100 64" className="w-24 h-16" aria-hidden="true">
              {/* 기준선 */}
              <line x1="0" y1="48" x2="100" y2="48" stroke="white" strokeWidth="0.4" opacity="0.15"/>
              <line x1="0" y1="32" x2="100" y2="32" stroke="white" strokeWidth="0.4" opacity="0.1"/>
              <line x1="0" y1="16" x2="100" y2="16" stroke="white" strokeWidth="0.4" opacity="0.1"/>
              {/* 캔들 1 — 상승 */}
              <g style={{ transformOrigin:'10px 48px', animation:'charts-bar 2.4s ease-in-out infinite' }}>
                <line x1="10" y1="28" x2="10" y2="52" stroke="white" strokeWidth="0.8" opacity="0.5"/>
                <rect x="7" y="33" width="6" height="14" rx="1" fill="white" opacity="0.5"/>
              </g>
              {/* 캔들 2 — 하락 */}
              <g style={{ transformOrigin:'24px 48px', animation:'charts-bar 2.4s ease-in-out infinite', animationDelay:'0.4s' }}>
                <line x1="24" y1="30" x2="24" y2="54" stroke="rgba(255,180,180,0.6)" strokeWidth="0.8"/>
                <rect x="21" y="36" width="6" height="16" rx="1" fill="rgba(255,180,180,0.4)"/>
              </g>
              {/* 캔들 3 — 상승 (큰) */}
              <g style={{ transformOrigin:'38px 48px', animation:'charts-bar 2.8s ease-in-out infinite', animationDelay:'0.8s' }}>
                <line x1="38" y1="18" x2="38" y2="52" stroke="white" strokeWidth="0.8" opacity="0.55"/>
                <rect x="35" y="22" width="6" height="26" rx="1" fill="white" opacity="0.55"/>
              </g>
              {/* 캔들 4 — 하락 */}
              <g style={{ transformOrigin:'52px 48px', animation:'charts-bar 2.4s ease-in-out infinite', animationDelay:'1.2s' }}>
                <line x1="52" y1="32" x2="52" y2="56" stroke="rgba(255,180,180,0.55)" strokeWidth="0.8"/>
                <rect x="49" y="38" width="6" height="14" rx="1" fill="rgba(255,180,180,0.35)"/>
              </g>
              {/* 캔들 5 — 상승 (최대) */}
              <g style={{ transformOrigin:'66px 48px', animation:'charts-bar 3s ease-in-out infinite', animationDelay:'1.6s' }}>
                <line x1="66" y1="12" x2="66" y2="52" stroke="white" strokeWidth="0.8" opacity="0.65"/>
                <rect x="63" y="16" width="6" height="30" rx="1" fill="white" opacity="0.65"/>
              </g>
              {/* 캔들 6 — 상승 */}
              <g style={{ transformOrigin:'80px 48px', animation:'charts-bar 2.6s ease-in-out infinite', animationDelay:'2s' }}>
                <line x1="80" y1="22" x2="80" y2="52" stroke="white" strokeWidth="0.8" opacity="0.5"/>
                <rect x="77" y="26" width="6" height="22" rx="1" fill="white" opacity="0.5"/>
              </g>
              {/* 추세선 */}
              <polyline
                points="10,42 24,44 38,30 52,40 66,20 80,28"
                fill="none" stroke="rgba(200,180,255,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray="120"
                style={{ animation:'charts-line 3s ease-out forwards, charts-glow 3s ease-in-out 3s infinite' }}
              />
            </svg>
          </div>
          {/* 바닥 티커 */}
          <div className="absolute bottom-0 left-0 right-0 h-6 overflow-hidden flex items-center" style={{ background: 'rgba(0,0,0,0.15)' }}>
            <div className="flex gap-6 whitespace-nowrap text-[10px] font-mono px-4" style={{ animation: 'charts-ticker 18s linear infinite' }}>
              {['KOSPI +0.8%', 'S&P500 +1.2%', 'BTC +3.4%', 'ETH +2.1%', 'GOLD +0.5%', 'KOSPI +0.8%', 'S&P500 +1.2%', 'BTC +3.4%', 'ETH +2.1%', 'GOLD +0.5%'].map((t, i) => (
                <span key={i} style={{ color: 'rgba(200,220,255,0.5)' }}>{t}</span>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
          {/* AnimatedLogo — 심장박동처럼 맥박치는 애니메이션 */}
          <style>{`
            @keyframes charts-logo-pulse {
              0%,100% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 6px rgba(139,92,246,0.4)); }
              20% { transform: scale(1.15) rotate(-3deg); filter: drop-shadow(0 0 24px rgba(139,92,246,0.9)); }
              35% { transform: scale(0.93) rotate(2deg); filter: drop-shadow(0 0 4px rgba(139,92,246,0.2)); }
              50% { transform: scale(1.1) rotate(-2deg); filter: drop-shadow(0 0 18px rgba(167,139,250,0.7)); }
              65% { transform: scale(0.97) rotate(1deg); }
            }
          `}</style>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-75 hidden sm:block"
            style={{ animation: 'charts-logo-pulse 2.4s ease-in-out infinite' }}>
            <AnimatedLogo size={108} />
          </div>
        </div>
        <div className="relative space-y-2">
          <div className="flex items-center gap-1.5 text-violet-200 text-xs font-semibold tracking-widest uppercase">
            <LineChart className="h-3.5 w-3.5" />수익률 분석
          </div>
          <h1 className="text-3xl font-bold tracking-tight">차트</h1>
          <p className="text-violet-100/70 text-sm">
            자산 성장 추이와 수익률을 <span className="text-violet-100/90 font-medium">캔들스틱 차트로 시각화</span>합니다
          </p>
        </div>
      </div>
      <Suspense fallback={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
