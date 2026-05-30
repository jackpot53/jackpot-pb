'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useChartSync, CHART_RIGHT_AXIS_WIDTH, HIDDEN_TIME_SCALE } from './chart-sync'
import {
  createChart,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type Time,
} from 'lightweight-charts'
import { Skeleton } from '@/components/ui/skeleton'
import { resolvePalette, CHART_UP, CHART_DOWN } from '@/lib/chart/theme'
import type { Period } from '@/components/app/asset-candle-chart'
import type { InvestorFlowPoint } from '@/app/api/investor-flow/route'

// 투자자별 고정 색상 — CHART_UP(적)/CHART_DOWN(청)과 겹치지 않는 식별 색
const FLOW_COLORS = {
  institution: '#f59e0b', // 기관 — amber
  foreign:     '#3b82f6', // 외국인 — blue
  individual:  '#10b981', // 개인 — green
} as const

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

// 기간 시작점부터 순매수량을 누적해 추세 라인용 데이터로 변환
function toCumulative(data: InvestorFlowPoint[]): InvestorFlowPoint[] {
  let inst = 0, frgn = 0, indv = 0
  return data.map((d) => {
    inst += d.institution
    frgn += d.foreign
    indv += d.individual
    return { date: d.date, institution: inst, foreign: frgn, individual: indv }
  })
}

// 누적 순매수 추세 — 기관·외국인·개인 3개 라인을 한 패널에 겹쳐 표시
function CumulativeFlowChart({
  data,
  height = 140,
}: {
  data: InvestorFlowPoint[]
  height?: number
}) {
  const sync = useChartSync()
  const syncRef = useRef(sync)

  const [axisWidth, setAxisWidth] = useState(CHART_RIGHT_AXIS_WIDTH)

  useEffect(() => sync.subscribeMasterAxisWidth(setAxisWidth), [sync])

  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const instSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const frgnSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const indvSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    chart.priceScale('right').applyOptions({ minimumWidth: axisWidth })
    const rafId = requestAnimationFrame(() => {
      const w = chart.priceScale('right').width()
      if (w > 0) syncRef.current.setMasterAxisWidth(w)
    })
    return () => cancelAnimationFrame(rafId)
  }, [axisWidth])

  // 차트 초기화 (마운트 시 1회)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const palette = resolvePalette(container)

    const chart = createChart(container, {
      autoSize: true,
      handleScroll: false,
      handleScale: false,
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
      timeScale: HIDDEN_TIME_SCALE,
      localization: { priceFormatter: fmtFlow },
    })

    const commonOpts = {
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    } as const

    const instSeries = chart.addSeries(LineSeries, { ...commonOpts, color: FLOW_COLORS.institution })
    const frgnSeries = chart.addSeries(LineSeries, { ...commonOpts, color: FLOW_COLORS.foreign })
    const indvSeries = chart.addSeries(LineSeries, { ...commonOpts, color: FLOW_COLORS.individual })

    // 0 기준선 — 매수/매도 전환점 가독성 (MACD 패널 패턴 재사용)
    instSeries.createPriceLine({
      price: 0,
      lineStyle: LineStyle.Dashed,
      lineWidth: 1,
      color: palette.mutedText,
      axisLabelVisible: false,
      title: '',
    })

    chart.priceScale('right').applyOptions({
      scaleMargins: { top: 0.1, bottom: 0.1 },
      borderVisible: false,
    })

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

  // 데이터 업데이트
  useEffect(() => {
    const chart = chartRef.current
    const instSeries = instSeriesRef.current
    const frgnSeries = frgnSeriesRef.current
    const indvSeries = indvSeriesRef.current
    if (!chart || !instSeries || !frgnSeries || !indvSeries) return

    const toLine = (key: keyof Pick<InvestorFlowPoint, 'institution' | 'foreign' | 'individual'>): LineData[] =>
      data.map((p) => ({ time: p.date as Time, value: p[key] }))

    instSeries.setData(toLine('institution'))
    frgnSeries.setData(toLine('foreign'))
    indvSeries.setData(toLine('individual'))

    syncRef.current.applyRangeToChart(chart)

    const rafId = requestAnimationFrame(() => {
      const w = chart.priceScale('right').width()
      if (w > 0) syncRef.current.setMasterAxisWidth(w)
    })
    return () => cancelAnimationFrame(rafId)
  }, [data])

  return (
    <div>
      {/* 헤더 + 범례 — MACD 패널 범례 패턴 재사용 */}
      <div className="flex items-center gap-2 mb-0.5">
        <p className="text-[10px] text-muted-foreground">누적 순매수 추세</p>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="inline-block w-4 h-[1.5px]" style={{ background: FLOW_COLORS.institution }} />
          기관
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="inline-block w-4 h-[1.5px]" style={{ background: FLOW_COLORS.foreign }} />
          외국인
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="inline-block w-4 h-[1.5px]" style={{ background: FLOW_COLORS.individual }} />
          개인
        </span>
      </div>
      <div ref={containerRef} style={{ height }} className="w-full" />
    </div>
  )
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
      handleScroll: false,
      handleScale: false,
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
        visible: false,
      },
      leftPriceScale: { visible: false },
      timeScale: HIDDEN_TIME_SCALE,
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

    syncRef.current.applyRangeToChart(chart)
  }, [data, dataKey])

  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <div ref={containerRef} style={{ height }} className="w-full" />
    </div>
  )
}

function fillToMasterDates(
  points: InvestorFlowPoint[],
  masterDates: string[],
): InvestorFlowPoint[] {
  if (masterDates.length === 0) return points
  const byDate = new Map(points.map((p) => [p.date, p]))
  return masterDates.map((d) => byDate.get(d) ?? { date: d, institution: 0, foreign: 0, individual: 0 })
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

  const data = useMemo(() => {
    if (!raw) return []
    if (period === '주봉') return aggregateByWeek(fillToMasterDates(raw, masterDates))
    if (period === '월봉') return aggregateByMonth(fillToMasterDates(raw, masterDates))
    return fillToMasterDates(raw, masterDates)
  }, [raw, period, masterDates])

  // 누적 순매수 — 기간 집계 후의 data를 그대로 재사용 (별도 fetch 불필요)
  const cumulative = useMemo(() => toCumulative(data), [data])

  if (loading) {
    return (
      <div className="space-y-2">
        {/* 누적 추세 스켈레톤 */}
        <Skeleton className="h-[140px] w-full" />
        {/* 히스토그램 스켈레톤 */}
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
