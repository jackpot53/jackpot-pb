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
import { ChevronLeft } from 'lucide-react'
import { RoboAdvisorAnalysisChart } from '@/components/app/robo-advisor-analysis-chart-wrapper'
import { RoboAdvisorAiReport } from '@/components/app/robo-advisor-ai-report'

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
      {/* 종목 헤더 */}
      <div className='space-y-4'>
        <div className='flex items-start justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900'>{stock.name}</h1>
            <p className='text-sm text-gray-500 mt-1'>
              {stock.market} • {code} • {stock.sector || '미분류'}
            </p>
          </div>
          <div className='text-right'>
            <p className='text-2xl font-bold text-gray-900'>
              {stock.marketCapKrw
                ? (stock.marketCapKrw / 1e12).toFixed(1)
                : '미정'}{' '}
              조
            </p>
            <p className='text-sm text-gray-500'>시가총액</p>
          </div>
        </div>

        {/* 시그널 뱃지 */}
        <div className='flex flex-wrap gap-2 pt-4'>
          {triggeredSignals.length > 0 ? (
            triggeredSignals.map((signal) => {
              const stats = backtestStats[signal]
              return (
                <div
                  key={signal}
                  className='px-3 py-1 bg-yellow-100 border border-yellow-400 rounded-full text-sm font-medium text-yellow-800'
                >
                  {signal}
                  {stats && (
                    <span className='ml-2 text-yellow-700'>
                      승률 {(stats.winRate / 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              )
            })
          ) : (
            <p className='text-sm text-gray-500'>발동된 시그널이 없습니다.</p>
          )}
        </div>
      </div>

      {/* 차트 */}
      <Suspense fallback={<Skeleton className='h-[450px] w-full rounded-lg' />}>
        <ChartSection ticker={ticker} />
      </Suspense>

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
    const response = await fetch(
      `/api/robo-advisor/${ticker}/ohlc?days=180`,
      { next: { revalidate: 3600 } },
    )

    if (!response.ok) {
      return <div className='text-red-500'>차트 데이터를 불러올 수 없습니다.</div>
    }

    const data = await response.json()

    return <RoboAdvisorAnalysisChart data={data} height={450} />
  } catch (error) {
    console.error('Chart error:', error)
    return <div className='text-red-500'>차트 렌더링 오류가 발생했습니다.</div>
  }
}
