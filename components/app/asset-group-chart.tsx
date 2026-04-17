'use client'
import { useState, useMemo } from 'react'
import { CandlestickChart } from './candlestick-chart'
import type { CandlestickPoint } from './candlestick-chart'
import type { AssetPerformance } from '@/lib/portfolio'
import type { MonthlyDataPoint, AnnualDataPoint, DailyDataPoint } from '@/lib/snapshot/aggregation'

type Tab = '일별' | '월별' | '연간'

interface AssetGroupChartProps {
  assets: AssetPerformance[]
  sparklines?: Record<string, number[]>
  monthlyData?: MonthlyDataPoint[]
  annualData?: AnnualDataPoint[]
  dailyData?: DailyDataPoint[]
}

interface DayProfit {
  profit: number
  totalValue: number
  totalCost: number
  label: string
}

/**
 * 그룹 내 전체 자산의 일별 누적 수익금 시계열을 계산한다.
 * 라이브 자산: currentValueKrw × (price[i] / price[last]) 로 과거 가치를 역추정
 * 수동/비라이브 자산: currentValueKrw 상수로 근사
 * 라이브 종목이 하나도 없으면 null 반환
 */
function computeDailyGroupProfitSeries(
  assets: AssetPerformance[],
  sparklines: Record<string, number[]>
): DayProfit[] | null {
  const liveAssets = assets.filter(
    a => a.priceType === 'live' && a.ticker && sparklines[a.ticker] && sparklines[a.ticker].length >= 2
  )

  if (liveAssets.length === 0) return null

  const minLen = Math.min(...liveAssets.map(a => sparklines[a.ticker!].length))
  const totalCost = assets.reduce((s, a) => s + a.totalCostKrw, 0)
  const manualValue = assets
    .filter(a => !(a.priceType === 'live' && a.ticker && sparklines[a.ticker]))
    .reduce((s, a) => s + a.currentValueKrw, 0)

  const today = new Date()

  return Array.from({ length: minLen }, (_, i) => {
    const liveValue = liveAssets.reduce((s, a) => {
      const prices = sparklines[a.ticker!]
      const lastPrice = prices[prices.length - 1]
      if (!lastPrice) return s
      return s + a.currentValueKrw * (prices[i] / lastPrice)
    }, 0)

    const totalValue = liveValue + manualValue
    const profit = totalValue - totalCost

    // index 0 = (minLen - 1)일 전, 마지막 index = 오늘
    const daysAgo = minLen - 1 - i
    const d = new Date(today)
    d.setDate(d.getDate() - daysAgo)
    const label = `${d.getMonth() + 1}/${d.getDate()}`

    return { profit, totalValue, totalCost, label }
  })
}

function dailyToCandlesticks(series: DayProfit[]): CandlestickPoint[] {
  return series.map((d, i) => {
    const open = i > 0 ? series[i - 1].profit : d.profit
    const close = d.profit
    const returnPct = d.totalCost > 0 ? (d.profit / d.totalCost) * 100 : 0
    return {
      date: `d${i}`,
      label: d.label,
      open,
      close,
      high: Math.max(open, close),
      low: Math.min(open, close),
      returnPct,
      delta: close - open,
    }
  })
}

function monthlyToCandlesticks(data: MonthlyDataPoint[]): CandlestickPoint[] {
  return data.map((d, i) => {
    const open = i > 0 ? data[i - 1].profitKrw : d.profitKrw
    const close = d.profitKrw
    const totalCost = d.totalValueKrw - d.profitKrw
    const returnPct = totalCost > 0 ? (d.profitKrw / totalCost) * 100 : 0
    return {
      date: `${d.label}-01`,
      label: `${parseInt(d.label.slice(5), 10)}월`,
      open,
      close,
      high: Math.max(open, close),
      low: Math.min(open, close),
      returnPct,
      delta: close - open,
    }
  })
}

function annualToCandlesticks(data: AnnualDataPoint[]): CandlestickPoint[] {
  return data.map((d, i) => {
    const open = i > 0 ? data[i - 1].profitKrw : d.profitKrw
    const close = d.profitKrw
    const totalCost = d.totalValueKrw - d.profitKrw
    const returnPct = totalCost > 0 ? (d.profitKrw / totalCost) * 100 : 0
    return {
      date: `${d.year}-01-01`,
      label: String(d.year),
      open,
      close,
      high: Math.max(open, close),
      low: Math.min(open, close),
      returnPct,
      delta: close - open,
    }
  })
}

const TABS: Tab[] = ['일별', '월별', '연간']

function snapshotDailyToCandlesticks(data: DailyDataPoint[]): CandlestickPoint[] {
  return data.map((d, i) => {
    const open = i > 0 ? data[i - 1].profitKrw : d.profitKrw
    const close = d.profitKrw
    const returnPct = d.totalCostKrw > 0 ? (d.profitKrw / d.totalCostKrw) * 100 : 0
    return {
      date: `d${i}`,
      label: d.label,
      open,
      close,
      high: Math.max(open, close),
      low: Math.min(open, close),
      returnPct,
      delta: close - open,
    }
  })
}

export function AssetGroupChart({ assets, sparklines = {}, monthlyData = [], annualData = [], dailyData = [] }: AssetGroupChartProps) {
  const [tab, setTab] = useState<Tab>(() => {
    const live = assets.filter(a => a.priceType === 'live' && a.ticker && sparklines[a.ticker]?.length >= 2)
    if (live.length > 0) return '일별'
    if (dailyData.length >= 2) return '일별'
    if (monthlyData.length >= 1) return '월별'
    if (annualData.length >= 1) return '연간'
    return '일별'
  })

  const dailySeries = useMemo(
    () => computeDailyGroupProfitSeries(assets, sparklines),
    [assets, sparklines]
  )

  const dailyCandlesticks = useMemo(() => {
    if (dailySeries) return dailyToCandlesticks(dailySeries)
    if (dailyData.length >= 2) return snapshotDailyToCandlesticks(dailyData)
    return []
  }, [dailySeries, dailyData])

  const monthlyCandlesticks = useMemo(() => monthlyToCandlesticks(monthlyData), [monthlyData])
  const annualCandlesticks = useMemo(() => annualToCandlesticks(annualData), [annualData])

  const isEmpty =
    (tab === '일별' && dailyCandlesticks.length === 0) ||
    (tab === '월별' && monthlyCandlesticks.length < 1) ||
    (tab === '연간' && annualCandlesticks.length < 1)

  const currentData =
    tab === '일별' ? dailyCandlesticks
    : tab === '월별' ? monthlyCandlesticks
    : annualCandlesticks

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex gap-1 bg-white/10 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              tab === t ? 'bg-white/20 shadow text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        {isEmpty ? (
          <div className="h-full flex items-center justify-center text-xs text-white/40 text-center px-4">
            {tab === '일별' ? '시세 데이터 없음' : '스냅샷 데이터 부족'}
          </div>
        ) : (
          <CandlestickChart data={currentData} />
        )}
      </div>
    </div>
  )
}
