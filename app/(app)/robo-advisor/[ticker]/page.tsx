import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser } from '@/utils/supabase/server'
import {
  getUniverseStock,
  getStockSignals,
  getBacktestStatsMap,
  getPriceHistory,
} from '@/db/queries/robo-advisor'
import { sma } from '@/lib/robo-advisor/indicators/sma'
import { bollinger } from '@/lib/robo-advisor/indicators/bollinger'
import { macd } from '@/lib/robo-advisor/indicators/macd'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, TrendingUp } from 'lucide-react'
import { RoboAdvisorAnalysisChart } from '@/components/app/robo-advisor-analysis-chart-wrapper'
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
        href='/robo-advisor'
        className='inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium'
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
        <p className='text-gray-500'>종목을 찾을 수 없습니다.</p>
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
    <div className='space-y-8'>
      {/* 종목 히어로 섹션 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0f1419] via-[#1a1f2e] to-[#0f1014] p-6 text-white shadow-xl">
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-48 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
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
          <div className="absolute top-1/2 right-16 w-32 h-32">
            <div className="absolute inset-0 rounded-full border-2 border-white/30" style={{ animation: 'pulse-ring-1 2s ease-out infinite' }} />
            <div className="absolute inset-0 rounded-full border-2 border-white/20" style={{ animation: 'pulse-ring-2 2.5s ease-out infinite' }} />
            <div className="absolute inset-0 rounded-full border-2 border-white/10" style={{ animation: 'pulse-ring-3 3s ease-out infinite' }} />
          </div>
        </div>

        <div className="relative flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-1.5 text-emerald-400/70 text-xs font-semibold tracking-widest uppercase">
                <TrendingUp className="h-3.5 w-3.5" />종목분석
              </div>
              <h1 className="text-4xl font-bold tracking-tight leading-tight" style={{ fontFamily: "'Sunflower', sans-serif" }}>{stock.name}</h1>
              <p className="text-white/60 text-sm">
                {stock.market} • {code} • {stock.sector || '미분류'}
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {stock.marketCapKrw
                    ? (stock.marketCapKrw / 1e12).toFixed(1)
                    : '미정'}{' '}
                  조
                </p>
                <p className="text-xs text-white/60">시가총액</p>
              </div>
              <StartPaperTradingButton ticker={ticker} />
            </div>
          </div>

          {/* 시그널 뱃지 */}
          {triggeredSignals.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {triggeredSignals.map((signal) => {
                const stats = backtestStats[signal]
                return (
                  <div
                    key={signal}
                    className='px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/40 rounded-full text-xs font-medium text-emerald-300'
                  >
                    {signal}
                    {stats && (
                      <span className='ml-2 text-emerald-400'>
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
      <div className='bg-white rounded-lg border border-gray-200 h-[450px] flex items-center justify-center'>
        <p className='text-gray-500'>차트는 준비 중입니다</p>
      </div>

      {/* 백테스트 통계 테이블 */}
      {Object.keys(backtestStats).length > 0 && (
        <div className='space-y-4'>
          <h2 className='text-xl font-bold text-gray-900'>
            백테스트 통계 (20일 보유)
          </h2>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-gray-200'>
                  <th className='px-4 py-2 text-left font-semibold text-gray-700'>
                    시그널
                  </th>
                  <th className='px-4 py-2 text-right font-semibold text-gray-700'>
                    승률
                  </th>
                  <th className='px-4 py-2 text-right font-semibold text-gray-700'>
                    평균 수익률
                  </th>
                  <th className='px-4 py-2 text-right font-semibold text-gray-700'>
                    중위 수익률
                  </th>
                  <th className='px-4 py-2 text-right font-semibold text-gray-700'>
                    샘플
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(backtestStats).map(([name, stats]) => (
                  <tr key={name} className='border-b border-gray-100'>
                    <td className='px-4 py-2 text-gray-900 font-medium'>
                      {name}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-semibold ${
                        stats.winRate >= 5000 ? 'text-emerald-600' : 'text-gray-700'
                      }`}
                    >
                      {(stats.winRate / 100).toFixed(1)}%
                    </td>
                    <td
                      className={`px-4 py-2 text-right ${
                        stats.avgReturn > 0 ? 'text-red-600' : 'text-blue-600'
                      }`}
                    >
                      {(stats.avgReturn / 100).toFixed(2)}%
                    </td>
                    <td
                      className={`px-4 py-2 text-right ${
                        stats.medianReturn > 0 ? 'text-red-600' : 'text-blue-600'
                      }`}
                    >
                      {(stats.medianReturn / 100).toFixed(2)}%
                    </td>
                    <td className='px-4 py-2 text-right text-gray-500'>
                      {stats.sampleCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI 분석 */}
      <div className='space-y-4'>
        <h2 className='text-xl font-bold text-gray-900'>AI 분석</h2>
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
      </div>
    </div>
  )
}

async function ChartSection({ ticker }: { ticker: string }) {
  try {
    const priceHistory = await getPriceHistory(ticker, 180)

    if (priceHistory.length === 0) {
      return <div className='text-red-500'>차트 데이터를 불러올 수 없습니다.</div>
    }

    const closes = priceHistory.map((p) => Number(p.close))
    const sma5Series = sma(closes, 5)
    const sma20Series = sma(closes, 20)
    const bollingerSeries = bollinger(closes, 20, 2)
    const macdSeries = macd(closes)

    const sma5 = []
    const sma20 = []
    const bollingerPoints = []
    const macdPoints = []

    for (let i = 0; i < priceHistory.length; i++) {
      const date = priceHistory[i].date

      if (sma5Series[i] !== null && sma5Series[i] !== undefined) {
        sma5.push({ time: date, value: sma5Series[i] as number })
      }

      if (sma20Series[i] !== null && sma20Series[i] !== undefined) {
        sma20.push({ time: date, value: sma20Series[i] as number })
      }

      if (
        bollingerSeries[i] &&
        bollingerSeries[i].upper !== null &&
        bollingerSeries[i].middle !== null &&
        bollingerSeries[i].lower !== null
      ) {
        const bb = bollingerSeries[i]
        bollingerPoints.push({
          time: date,
          upper: bb.upper!,
          mid: bb.middle!,
          lower: bb.lower!,
        })
      }

      if (
        macdSeries[i] &&
        macdSeries[i].macd !== null &&
        macdSeries[i].signal !== null &&
        macdSeries[i].histogram !== null
      ) {
        const m = macdSeries[i]
        macdPoints.push({
          time: date,
          macd: m.macd!,
          signal: m.signal!,
          hist: m.histogram!,
        })
      }
    }

    const candles = priceHistory.map((row) => ({
      time: row.date,
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: row.volume ? Number(row.volume) : null,
    }))

    const data = {
      candles,
      sma5,
      sma20,
      bollinger: bollingerPoints,
      macd: macdPoints,
      rsi: [],
    }

    return <RoboAdvisorAnalysisChart data={data} height={450} />
  } catch (error) {
    console.error('Chart error:', error)
    return <div className='text-red-500'>차트 렌더링 오류가 발생했습니다.</div>
  }
}
