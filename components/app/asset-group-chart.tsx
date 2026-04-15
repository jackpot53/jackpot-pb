'use client'
import { useState, useMemo } from 'react'
import { CandlestickChart } from './candlestick-chart'
import type { CandlestickPoint } from './candlestick-chart'
import type { OhlcPoint } from '@/lib/price/sparkline'
import type { AssetPerformance } from '@/lib/portfolio'
import type { MonthlyDataPoint, AnnualDataPoint } from '@/lib/snapshot/aggregation'

type Tab = '30일' | '월별' | '연간'

interface AssetGroupChartProps {
  assets: AssetPerformance[]
  sparklines?: Record<string, number[]>
  ohlcData?: Record<string, OhlcPoint[]>
  monthlyData?: MonthlyDataPoint[]
  annualData?: AnnualDataPoint[]
}

function formatAxisKrw(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`
  if (abs >= 10_000) return `${(v / 10_000).toFixed(0)}만`
  return v.toLocaleString()
}

function monthlyToCandlestick(data: MonthlyDataPoint[]): CandlestickPoint[] {
  return data.map((d, i) => {
    const open = i > 0 ? data[i - 1].totalValueKrw : d.totalValueKrw
    const close = d.totalValueKrw
    return {
      date: `${d.label}-01`,
      label: `${parseInt(d.label.slice(5), 10)}월`,
      open,
      close,
      high: Math.max(open, close),
      low: Math.min(open, close),
    }
  })
}

function annualToCandlestick(data: AnnualDataPoint[]): CandlestickPoint[] {
  return data.map((d, i) => {
    const open = i > 0 ? data[i - 1].totalValueKrw : d.totalValueKrw
    const close = d.totalValueKrw
    return {
      date: `${d.year}-01-01`,
      label: String(d.year),
      open,
      close,
      high: Math.max(open, close),
      low: Math.min(open, close),
    }
  })
}

const TABS: Tab[] = ['30일', '월별', '연간']

export function AssetGroupChart({ assets, ohlcData = {}, monthlyData = [], annualData = [] }: AssetGroupChartProps) {
  const [tab, setTab] = useState<Tab>('30일')

  const tickerOptions = useMemo(() => {
    return assets
      .filter(a => a.priceType === 'live' && a.ticker && ohlcData[a.ticker])
      .sort((a, b) => b.currentValueKrw - a.currentValueKrw)
      .map(a => ({ ticker: a.ticker!, name: a.name, valueKrw: a.currentValueKrw }))
  }, [assets, ohlcData])

  const [selectedTicker, setSelectedTicker] = useState<string>('')
  const effectiveTicker = selectedTicker && ohlcData[selectedTicker] ? selectedTicker : tickerOptions[0]?.ticker ?? ''

  const dailyCandlestick = useMemo((): CandlestickPoint[] => {
    const ohlc = ohlcData[effectiveTicker]
    if (!ohlc) return []
    return ohlc.map(d => ({
      date: d.date,
      label: d.date.slice(5).replace('-', '/'),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))
  }, [ohlcData, effectiveTicker])

  const monthlyCandlestick = useMemo(() => monthlyToCandlestick(monthlyData), [monthlyData])
  const annualCandlestick = useMemo(() => annualToCandlestick(annualData), [annualData])

  const isEmpty =
    (tab === '30일' && dailyCandlestick.length === 0) ||
    (tab === '월별' && monthlyCandlestick.length < 2) ||
    (tab === '연간' && annualCandlestick.length < 2)

  const currentData =
    tab === '30일' ? dailyCandlestick
    : tab === '월별' ? monthlyCandlestick
    : annualCandlestick

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === '30일' && tickerOptions.length > 1 && (
          <select
            value={effectiveTicker}
            onChange={e => setSelectedTicker(e.target.value)}
            className="text-xs border border-border rounded px-2 py-1 bg-background"
          >
            {tickerOptions.map(t => (
              <option key={t.ticker} value={t.ticker}>{t.name} ({t.ticker})</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {isEmpty ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-400 text-center px-4">
            {tab === '30일' ? '시세 데이터 없음' : '스냅샷 데이터 부족'}
          </div>
        ) : (
          <CandlestickChart
            data={currentData}
            formatPrice={tab === '30일' ? undefined : formatAxisKrw}
          />
        )}
      </div>
    </div>
  )
}
