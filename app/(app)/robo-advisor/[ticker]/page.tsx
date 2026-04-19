import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser } from '@/utils/supabase/server'
import {
  getUniverseStock,
  getStockSignals,
  getBacktestStatsMap,
} from '@/db/queries/robo-advisor'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronLeft, TrendingUp, Sparkles, BarChart3 } from 'lucide-react'
import { RoboAdvisorAiReport } from '@/components/app/robo-advisor-ai-report'
import { StartPaperTradingButton } from '@/components/app/start-paper-trading-button'

export default async function StockAnalysisPage({
  params,
}: {
  params: Promise<{ ticker: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const { ticker } = await params

  return (
    <div className='space-y-6'>
      <Link
        href='/robo-advisor/stock'
        className='inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium text-sm transition-colors'
      >
        <ChevronLeft className='w-4 h-4' />
        로보어드바이저로 돌아가기
      </Link>

      <Suspense
        fallback={
          <div className='space-y-8'>
            <div className='space-y-2'>
              <Skeleton className='h-8 w-48' />
              <Skeleton className='h-6 w-96' />
            </div>
            <Skeleton className='h-[450px] w-full rounded-lg' />
          </div>
        }
      >
        <StockAnalysisContent ticker={ticker} />
      </Suspense>
    </div>
  )
}

async function StockAnalysisContent({ ticker }: { ticker: string }) {
  const [stock, signals, statsMap] = await Promise.all([
    getUniverseStock(ticker),
    getStockSignals(ticker),
    getBacktestStatsMap(),
  ])

  if (!stock) {
    return (
      <div className='text-center py-12'>
        <p className='text-muted-foreground'>종목을 찾을 수 없습니다.</p>
      </div>
    )
  }

  const triggeredSignals = signals
    .filter((s) => s.triggered)
    .map((s) => {
      const displayName = s.signalType
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      return displayName
    })

  const backtestStats: Record<
    string,
    {
      winRate: number
      sampleCount: number
      avgReturn: number
      medianReturn: number
    }
  > = {}

  for (const signal of signals) {
    const signalStats = statsMap.get(signal.signalType)?.get(20)
    if (signalStats) {
      const displayName = signal.signalType
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

      backtestStats[displayName] = {
        winRate: signalStats.winRate || 0,
        sampleCount: signalStats.sampleCount || 0,
        avgReturn: signalStats.avgReturn || 0,
        medianReturn: signalStats.medianReturn || 0,
      }
    }
  }

  const code = stock.ticker.replace('.KS', '').replace('.KQ', '')

  return (
    <div className='space-y-6'>
      {/* 종목 히어로 섹션 — 메인 로보어드바이저 페이지와 동일한 amber→orange→rose 그라디언트 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-amber-200/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-48 rounded-full bg-orange-300/15 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
          <style>{`
            @keyframes pulse-ring-1 {
              0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.6; }
              50% { opacity: 0.3; }
              100% { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
            }
            @keyframes pulse-ring-2 {
              0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0.4; }
              50% { opacity: 0.2; }
              100% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
            }
            @keyframes pulse-ring-3 {
              0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0.3; }
              50% { opacity: 0.15; }
              100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
            }
          `}</style>
          <div className="absolute top-1/2 right-16 w-32 h-32 hidden sm:block">
            <div className="absolute inset-0 rounded-full border-2 border-white/40" style={{ animation: 'pulse-ring-1 2s ease-out infinite' }} />
            <div className="absolute inset-0 rounded-full border-2 border-white/25" style={{ animation: 'pulse-ring-2 2.5s ease-out infinite' }} />
            <div className="absolute inset-0 rounded-full border-2 border-white/15" style={{ animation: 'pulse-ring-3 3s ease-out infinite' }} />
          </div>
        </div>

        <div className="relative flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-1.5 text-white/80 text-xs font-semibold tracking-widest uppercase">
                <TrendingUp className="h-3.5 w-3.5" />종목분석
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight" style={{ fontFamily: "'Sunflower', sans-serif" }}>{stock.name}</h1>
              <p className="text-white/80 text-sm">
                {stock.market} • {code} • {stock.sector || '미분류'}
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums">
                  {stock.marketCapKrw
                    ? (stock.marketCapKrw / 1e12).toFixed(1)
                    : '미정'}{' '}
                  <span className="text-base font-medium">조</span>
                </p>
                <p className="text-xs text-white/75">시가총액</p>
              </div>
              <StartPaperTradingButton ticker={ticker} />
            </div>
          </div>

          {triggeredSignals.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {triggeredSignals.map((signal) => {
                const stats = backtestStats[signal]
                return (
                  <div
                    key={signal}
                    className='px-3 py-1.5 bg-white/15 border border-white/30 backdrop-blur-sm rounded-full text-xs font-medium text-white'
                  >
                    {signal}
                    {stats && (
                      <span className='ml-2 text-white/85 font-semibold'>
                        승률 {(stats.winRate / 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 차트 */}
      <section className='space-y-3'>
        <h2 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <BarChart3 className="h-4 w-4 text-orange-500" />기술적 분석 차트
        </h2>
        <Card>
          <CardContent className='p-6'>
            <div className='h-[450px] flex items-center justify-center text-sm text-muted-foreground'>
              차트는 준비 중입니다
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 백테스트 통계 */}
      {Object.keys(backtestStats).length > 0 && (
        <section className='space-y-3'>
          <h2 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <TrendingUp className="h-4 w-4 text-rose-500" />백테스트 통계 · 20일 보유
          </h2>
          <Card>
            <CardContent className='p-0 overflow-hidden'>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm tabular-nums'>
                  <thead>
                    <tr className='border-b border-border bg-muted/40'>
                      <th className='px-4 py-2.5 text-left font-semibold text-muted-foreground text-xs'>시그널</th>
                      <th className='px-4 py-2.5 text-right font-semibold text-muted-foreground text-xs'>승률</th>
                      <th className='px-4 py-2.5 text-right font-semibold text-muted-foreground text-xs'>평균 수익률</th>
                      <th className='px-4 py-2.5 text-right font-semibold text-muted-foreground text-xs'>중위 수익률</th>
                      <th className='px-4 py-2.5 text-right font-semibold text-muted-foreground text-xs'>샘플</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(backtestStats).map(([name, stats]) => (
                      <tr key={name} className='border-b border-border last:border-0 hover:bg-muted/30 transition-colors'>
                        <td className='px-4 py-2.5 text-foreground font-medium'>{name}</td>
                        <td
                          className={`px-4 py-2.5 text-right font-semibold ${
                            stats.winRate >= 5000 ? 'text-emerald-600' : 'text-foreground/80'
                          }`}
                        >
                          {(stats.winRate / 100).toFixed(1)}%
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right font-medium ${
                            stats.avgReturn > 0 ? 'text-red-500' : 'text-blue-500'
                          }`}
                        >
                          {(stats.avgReturn / 100).toFixed(2)}%
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right ${
                            stats.medianReturn > 0 ? 'text-red-400' : 'text-blue-400'
                          }`}
                        >
                          {(stats.medianReturn / 100).toFixed(2)}%
                        </td>
                        <td className='px-4 py-2.5 text-right text-muted-foreground'>{stats.sampleCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* AI 분석 */}
      <section className='space-y-3'>
        <h2 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Sparkles className="h-4 w-4 text-amber-500" />AI 분석
        </h2>
        <Card>
          <CardContent className='p-6'>
            <RoboAdvisorAiReport
              ticker={ticker}
              stockName={stock.name}
              sector={stock.sector}
              market={stock.market}
              currentPrice={stock.marketCapKrw || 0}
              changePercent={null}
              changeAmount={null}
              marketCapKrw={stock.marketCapKrw}
              triggeredSignals={triggeredSignals}
              backtestStats={backtestStats}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

