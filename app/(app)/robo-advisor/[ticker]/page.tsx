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
import { ChevronLeft, Sparkles, BarChart3 } from 'lucide-react'
import { RoboAdvisorAiReport } from '@/components/app/robo-advisor-ai-report'
import { StockAnalysisHero } from '@/components/app/stock-analysis-hero'
import { BacktestStatsTable } from '@/components/app/backtest-stats-table'
import { formatSignalName, buildBacktestStats } from '@/lib/robo-advisor/analysis-helpers'

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
    .map((s) => formatSignalName(s.signalType))

  const backtestStats = buildBacktestStats(signals, statsMap)
  const code = stock.ticker.replace('.KS', '').replace('.KQ', '')

  return (
    <div className='space-y-6'>
      <StockAnalysisHero
        ticker={ticker}
        name={stock.name}
        market={stock.market}
        code={code}
        sector={stock.sector}
        marketCapKrw={stock.marketCapKrw}
        triggeredSignals={triggeredSignals}
        backtestStats={backtestStats}
      />

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

      <BacktestStatsTable stats={backtestStats} />

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
