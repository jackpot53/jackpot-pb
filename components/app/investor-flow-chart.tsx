'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useChartSync, HIDDEN_TIME_SCALE } from './chart-sync'
import {
  createChart,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type Time,
  type WhitespaceData,
} from 'lightweight-charts'
import { Skeleton } from '@/components/ui/skeleton'
import { resolvePalette, CHART_UP, CHART_DOWN } from '@/lib/chart/theme'
import type { Period } from '@/components/app/asset-candle-chart'
import type { InvestorFlowPoint } from '@/app/api/investor-flow/route'

const FLOW_COLORS = {
  institution: '#f59e0b',
  foreign:     '#3b82f6',
  individual:  '#10b981',
} as const

interface Props {
  ticker: string
  period: Period
  range?: '1y' | '3y' | '5y'
}

// null = masterDates 에는 있지만 API 데이터가 없는 날짜 (whitespace)
interface FlowFilled {
  date: string
  institution: number | null
  foreign: number | null
  individual: number | null
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

// 집계 후 masterDates 에 맞춰 fill — 없는 날짜는 null (whitespace)
function fillToMasterDates(points: InvestorFlowPoint[], masterDates: string[]): FlowFilled[] {
  if (masterDates.length === 0) return points.map(p => ({ ...p }))
  const byDate = new Map(points.map(p => [p.date, p]))
  return masterDates.map(d => {
    const p = byDate.get(d)
    return p
      ? { date: d, institution: p.institution, foreign: p.foreign, individual: p.individual }
      : { date: d, institution: null, foreign: null, individual: null }
  })
}

// 누적 순매수 — null 구간은 whitespace (라인 끊김) 처리
function toCumulative(data: FlowFilled[]): FlowFilled[] {
  let inst = 0, frgn = 0, indv = 0
  return data.map(d => {
    if (d.institution === null) return { date: d.date, institution: null, foreign: null, individual: null }
    inst += d.institution
    frgn += d.foreign!
    indv += d.individual!
    return { date: d.date, institution: inst, foreign: frgn, individual: indv }
  })
}

function CumulativeFlowChart({ data, height = 140 }: { data: FlowFilled[]; height?: number }) {
  const sync = useChartSync()
  const syncRef = useRef(sync)
  syncRef.current = sync

  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const instSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const frgnSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const indvSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const palette = resolvePalette(container)

    const chart = createChart(container, {
      autoSize: true,
      handleScroll: false,
      handleScale: false,
      layout: { background: { color: 'transparent' }, textColor: palette.mutedText, attributionLogo: false, fontSize: 10 },
      grid: { vertLines: { visible: false }, horzLines: { color: palette.grid, style: 2 } },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: HIDDEN_TIME_SCALE,
    })

    const commonOpts = { lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false } as const
    const instSeries = chart.addSeries(LineSeries, { ...commonOpts, color: FLOW_COLORS.institution })
    const frgnSeries = chart.addSeries(LineSeries, { ...commonOpts, color: FLOW_COLORS.foreign })
    const indvSeries = chart.addSeries(LineSeries, { ...commonOpts, color: FLOW_COLORS.individual })

    instSeries.createPriceLine({ price: 0, lineStyle: LineStyle.Dashed, lineWidth: 1, color: palette.mutedText, axisLabelVisible: false, title: '' })

    chartRef.current = chart
    instSeriesRef.current = instSeries
    frgnSeriesRef.current = frgnSeries
    indvSeriesRef.current = indvSeries

    const unregister = syncRef.current.registerChart(chart)
    return () => {
      unregister()
      chart.remove()
      chartRef.current = null
      instSeriesRef.current = null
      frgnSeriesRef.current = null
      indvSeriesRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    const instSeries = instSeriesRef.current
    const frgnSeries = frgnSeriesRef.current
    const indvSeries = indvSeriesRef.current
    if (!chart || !instSeries || !frgnSeries || !indvSeries) return

    const toLine = (key: keyof Pick<FlowFilled, 'institution' | 'foreign' | 'individual'>): (LineData | WhitespaceData)[] =>
      data.map(p => {
        const v = p[key]
        return v === null ? { time: p.date as Time } : { time: p.date as Time, value: v }
      })

    instSeries.setData(toLine('institution'))
    frgnSeries.setData(toLine('foreign'))
    indvSeries.setData(toLine('individual'))

    syncRef.current.applyRangeToChart(chart)
  }, [data])

  return (
    <div>
      <div className="flex items-center gap-2 mb-0.5">
        <p className="text-[10px] text-muted-foreground">누적 순매수 추세</p>
        {(['institution', 'foreign', 'individual'] as const).map(k => (
          <span key={k} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="inline-block w-4 h-[1.5px]" style={{ background: FLOW_COLORS[k] }} />
            {k === 'institution' ? '기관' : k === 'foreign' ? '외국인' : '개인'}
          </span>
        ))}
      </div>
      <div ref={containerRef} style={{ height }} className="w-full" />
    </div>
  )
}

function FlowChart({
  data, label, dataKey, height = 100,
}: {
  data: FlowFilled[]
  label: string
  dataKey: keyof Pick<FlowFilled, 'individual' | 'foreign' | 'institution'>
  height?: number
}) {
  const sync = useChartSync()
  const syncRef = useRef(sync)
  syncRef.current = sync

  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const palette = resolvePalette(container)

    const chart = createChart(container, {
      autoSize: true,
      handleScroll: false,
      handleScale: false,
      layout: { background: { color: 'transparent' }, textColor: palette.mutedText, attributionLogo: false, fontSize: 10 },
      grid: { vertLines: { visible: false }, horzLines: { color: palette.grid, style: 2 } },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: HIDDEN_TIME_SCALE,
      localization: { priceFormatter: fmtFlow },
    })

    const series = chart.addSeries(HistogramSeries, { base: 0, priceScaleId: 'right', priceLineVisible: false, lastValueVisible: false })
    chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } })

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

  useEffect(() => {
    const chart = chartRef.current
    const series = seriesRef.current
    if (!chart || !series) return

    const chartData: (HistogramData | WhitespaceData)[] = data.map(p => {
      const v = p[dataKey]
      return v === null
        ? { time: p.date as Time }
        : { time: p.date as Time, value: v, color: v >= 0 ? CHART_UP : CHART_DOWN }
    })
    series.setData(chartData)

    syncRef.current.applyRangeToChart(chart)
  }, [data, dataKey])

  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <div ref={containerRef} style={{ height }} className="w-full" />
    </div>
  )
}

export function InvestorFlowChart({ ticker, period, range = '1y' }: Props) {
  const sync = useChartSync()
  const [raw, setRaw] = useState<InvestorFlowPoint[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [unsupported, setUnsupported] = useState(false)
  const [masterDates, setMasterDates] = useState<string[]>([])

  useEffect(() => sync.subscribeMasterDates(setMasterDates), [sync])

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

  // 집계 먼저 → masterDates fill — 주봉/월봉은 집계된 날짜로 fill
  const data = useMemo(() => {
    if (!raw) return []
    if (period === '주봉') return fillToMasterDates(aggregateByWeek(raw), masterDates)
    if (period === '월봉') return fillToMasterDates(aggregateByMonth(raw), masterDates)
    return fillToMasterDates(raw, masterDates)
  }, [raw, period, masterDates])

  const cumulative = useMemo(() => toCumulative(data), [data])

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-[140px] w-full" />
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
      <CumulativeFlowChart data={cumulative} />
      <FlowChart data={data} label="개인" dataKey="individual" />
      <FlowChart data={data} label="외국인" dataKey="foreign" />
      <FlowChart data={data} label="기관" dataKey="institution" />
    </div>
  )
}
