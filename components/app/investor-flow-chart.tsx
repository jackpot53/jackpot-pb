'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useChartSync, CHART_RIGHT_AXIS_WIDTH } from './chart-sync'
import {
  createChart,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts'
import { Skeleton } from '@/components/ui/skeleton'
import { resolvePalette, CHART_UP, CHART_DOWN } from '@/lib/chart/theme'
import type { Period } from '@/components/app/asset-candle-chart'
import type { InvestorFlowPoint } from '@/app/api/investor-flow/route'

interface Props {
  ticker: string
  period: Period
  range?: '1y' | '3y' | '5y'
}

function fmtFlow(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`
  if (abs >= 10_000) return `${(v / 10_000).toFixed(0)}만`
  return v.toLocaleString('ko-KR')
}

function aggregateByWeek(data: InvestorFlowPoint[]): InvestorFlowPoint[] {
  const map = new Map<string, InvestorFlowPoint>()
  for (const p of data) {
    const d = new Date(p.date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d.setDate(diff))
    const key = monday.toISOString().slice(0, 10)
    const existing = map.get(key)
    if (existing) {
      existing.institution += p.institution
      existing.foreign += p.foreign
      existing.individual += p.individual
    } else {
      map.set(key, { ...p, date: key })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

function aggregateByMonth(data: InvestorFlowPoint[]): InvestorFlowPoint[] {
  const map = new Map<string, InvestorFlowPoint>()
  for (const p of data) {
    const key = p.date.slice(0, 7) + '-01'
    const existing = map.get(key)
    if (existing) {
      existing.institution += p.institution
      existing.foreign += p.foreign
      existing.individual += p.individual
    } else {
      map.set(key, { ...p, date: key })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

function FlowChart({
  data,
  label,
  dataKey,
  height = 100,
}: {
  data: InvestorFlowPoint[]
  label: string
  dataKey: keyof Pick<InvestorFlowPoint, 'individual' | 'foreign' | 'institution'>
  height?: number
}) {
  const sync = useChartSync()
  const syncRef = useRef(sync)
  syncRef.current = sync

  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  // 차트 초기화 (마운트 시 1회)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const palette = resolvePalette(container)

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { color: 'transparent' },
        textColor: palette.mutedText,
        attributionLogo: false,
        fontSize: 10,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: palette.grid, style: 2 },
      },
      rightPriceScale: {
        borderVisible: false,
        minimumWidth: CHART_RIGHT_AXIS_WIDTH,
      },
      leftPriceScale: { visible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: false,
      },
      localization: { priceFormatter: fmtFlow },
    })

    const series = chart.addSeries(HistogramSeries, {
      base: 0,
      priceScaleId: 'right',
      priceLineVisible: false,
      lastValueVisible: false,
    })

    chart.priceScale('right').applyOptions({
      scaleMargins: { top: 0.1, bottom: 0.1 },
      borderVisible: false,
    })

    chartRef.current = chart
    seriesRef.current = series

    const unregister = syncRef.current.registerChart(chart)

    return () => {
      unregister()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // 데이터 업데이트
  useEffect(() => {
    const chart = chartRef.current
    const series = seriesRef.current
    if (!chart || !series) return

    series.setData(
      data.map((p) => ({
        time: p.date as Time,
        value: p[dataKey],
        color: p[dataKey] >= 0 ? CHART_UP : CHART_DOWN,
      })),
    )

    const shared = syncRef.current.getCurrentLogicalRange()
    if (shared) chart.timeScale().setVisibleLogicalRange(shared)
    else chart.timeScale().fitContent()
  }, [data, dataKey])

  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <div ref={containerRef} style={{ height }} className="w-full" />
    </div>
  )
}

export function InvestorFlowChart({ ticker, period, range = '1y' }: Props) {
  const [raw, setRaw] = useState<InvestorFlowPoint[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [unsupported, setUnsupported] = useState(false)

  useEffect(() => {
    setRaw(null)
    setUnsupported(false)
    setLoading(true)
    const ctrl = new AbortController()
    fetch(`/api/investor-flow?ticker=${encodeURIComponent(ticker)}&range=${range}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then((res: { data?: InvestorFlowPoint[]; unsupported?: boolean }) => {
        if (res.unsupported) { setUnsupported(true); return }
        setRaw(res.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [ticker, range])

  const data = useMemo(() => {
    if (!raw) return []
    if (period === '주봉') return aggregateByWeek(raw)
    if (period === '월봉') return aggregateByMonth(raw)
    return raw
  }, [raw, period])

  if (loading) {
    return (
      <div className="space-y-2">
        {['개인', '외국인', '기관'].map(l => (
          <div key={l}>
            <p className="text-[10px] text-muted-foreground mb-0.5">{l}</p>
            <Skeleton className="h-[100px] w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (unsupported) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
        해당 종목은 매매동향을 제공하지 않습니다 (미국 주식/ETF)
      </div>
    )
  }

  if (!raw || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
        매매동향 데이터를 불러오지 못했습니다
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <FlowChart data={data} label="개인" dataKey="individual" />
      <FlowChart data={data} label="외국인" dataKey="foreign" />
      <FlowChart data={data} label="기관" dataKey="institution" />
    </div>
  )
}
