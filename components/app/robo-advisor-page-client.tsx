'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { X, CandlestickChart } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { RoboAdvisorTickerSearch, type TickerSuggestion } from '@/components/app/robo-advisor-ticker-search'
import type { Period } from '@/components/app/asset-candle-chart'
import type { OhlcPoint } from '@/lib/price/sparkline'

const AssetCandleChart = dynamic(
  () => import('@/components/app/asset-candle-chart').then(m => ({ default: m.AssetCandleChart })),
  { ssr: false, loading: () => <Skeleton className="h-full w-full rounded-lg" /> },
)
const InvestorFlowChart = dynamic(
  () => import('@/components/app/investor-flow-chart').then(m => ({ default: m.InvestorFlowChart })),
  { ssr: false, loading: () => <Skeleton className="h-24 w-full rounded-lg" /> },
)
const MacdPanel = dynamic(
  () => import('@/components/app/macd-panel').then(m => ({ default: m.MacdPanel })),
  { ssr: false, loading: () => <Skeleton className="h-[180px] w-full rounded-xl" /> },
)
const VolumePanel = dynamic(
  () => import('@/components/app/volume-panel').then(m => ({ default: m.VolumePanel })),
  { ssr: false, loading: () => <Skeleton className="h-[180px] w-full rounded-xl" /> },
)
const TradingValuePanel = dynamic(
  () => import('@/components/app/trading-value-panel').then(m => ({ default: m.TradingValuePanel })),
  { ssr: false, loading: () => <Skeleton className="h-[180px] w-full rounded-xl" /> },
)

const PERIOD_RANGES: Record<string, string> = { '일봉': '3y', '주봉': '3y', '월봉': '5y' }

export function RoboAdvisorPageClient() {
  const [selectedTicker, setSelectedTicker] = useState<TickerSuggestion | null>(null)
  const [tickerOhlc, setTickerOhlc] = useState<OhlcPoint[] | null>(null)
  const [tickerChartLoading, setTickerChartLoading] = useState(false)
  const [chartPeriod, setChartPeriod] = useState<Period>('일봉')
  const [chartDataForMacd, setChartDataForMacd] = useState<OhlcPoint[]>([])

  const handleTickerSelect = useCallback((s: TickerSuggestion) => {
    setSelectedTicker(s)
    setTickerOhlc(null)
    setChartDataForMacd([])
  }, [])

  useEffect(() => {
    if (!selectedTicker) return
    setTickerChartLoading(true)
    const ctrl = new AbortController()
    fetch(
      `/api/sparklines?tickers=${encodeURIComponent(selectedTicker.ticker)}&interval=1d&range=3y`,
      { signal: ctrl.signal },
    )
      .then((r) => r.json())
      .then((res: Record<string, OhlcPoint[]>) => setTickerOhlc(res[selectedTicker.ticker] ?? []))
      .catch(() => {})
      .finally(() => setTickerChartLoading(false))
    return () => ctrl.abort()
  }, [selectedTicker])

  return (
    <div data-component="RoboAdvisorPageClient" className="space-y-4">
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <CandlestickChart className="w-4 h-4 text-muted-foreground" />
            종목 차트 조회
          </p>
          {selectedTicker && (
            <button
              onClick={() => { setSelectedTicker(null); setTickerOhlc(null) }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
              닫기
            </button>
          )}
        </div>
        <RoboAdvisorTickerSearch
          onSelect={handleTickerSelect}
          selectedTicker={selectedTicker?.ticker ?? null}
        />
        {selectedTicker && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold">{selectedTicker.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{selectedTicker.ticker}</span>
            </div>
            <div className="h-[400px]">
              {tickerChartLoading ? (
                <Skeleton className="h-full w-full rounded-lg" />
              ) : tickerOhlc && tickerOhlc.length > 0 ? (
                <AssetCandleChart
                  ticker={selectedTicker.ticker}
                  initialData={tickerOhlc}
                  periodRanges={PERIOD_RANGES}
                  onPeriodChange={setChartPeriod}
                  showVolume
                  onDataChange={setChartDataForMacd}
                />
              ) : !tickerChartLoading ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  차트 데이터를 불러오지 못했습니다
                </div>
              ) : null}
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <VolumePanel data={chartDataForMacd} />
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <TradingValuePanel data={chartDataForMacd} />
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-2">투자자별 매매동향 (순매수량, 단위: 주)</p>
              <InvestorFlowChart
                ticker={selectedTicker.ticker}
                period={chartPeriod}
                range="1y"
              />
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <MacdPanel data={chartDataForMacd} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
