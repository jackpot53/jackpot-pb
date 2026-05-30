'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useChartSync, HIDDEN_TIME_SCALE } from './chart-sync'
import {
  createChart,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
  type HistogramData,
  type LineData,
  type MouseEventParams,
  type Time,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type WhitespaceData,
} from 'lightweight-charts'
import { Skeleton } from '@/components/ui/skeleton'
import { resolvePalette } from '@/lib/chart/theme'
import type { Period } from '@/components/app/asset-candle-chart'
import type { ShortSellingPoint } from '@/lib/kis/short-selling'
import {
  detectShortSellingRisks,
  lastShortRiskFromEvents,
  type ShortRiskEvent,
} from '@/lib/robo-advisor/signals/short-selling-risk'

interface Props {
  ticker: string
  period: Period
  range?: '1y' | '3y' | '5y'
}

// null = masterDates에는 있지만 공매도 데이터가 없는 날짜 (whitespace)
interface ShortFilled {
  date: string
  shortVolume: number
  shortValue: number | null
  totalVolume: number
  totalValue: number
  shortRatio: number | null
}

function fmtKrw(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000_000_000) return `${sign}${(abs / 1_000_000_000_000).toFixed(1)}조`
  if (abs >= 100_000_000) {
    const eok = abs / 100_000_000
    return `${sign}${eok >= 1000 ? eok.toFixed(0) : eok.toFixed(1)}억`
  }
  if (abs >= 10_000) return `${sign}${(abs / 10_000).toFixed(0)}만`
  return v.toLocaleString('ko-KR')
}

function fmtPct(v: number): string {
  return `${v.toFixed(1)}%`
}

function aggregateByWeek(data: ShortSellingPoint[]): ShortSellingPoint[] {
  const map = new Map<string, ShortSellingPoint>()
  for (const p of data) {
    const d = new Date(p.date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d.setDate(diff))
    const key = monday.toISOString().slice(0, 10)
    const existing = map.get(key)
    if (existing) {
      existing.shortVolume += p.shortVolume
      existing.shortValue += p.shortValue
      existing.totalVolume += p.totalVolume
      existing.totalValue += p.totalValue
      existing.shortRatio = existing.totalVolume > 0
        ? (existing.shortVolume / existing.totalVolume) * 100 : 0
    } else {
      map.set(key, { ...p, date: key })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

function aggregateByMonth(data: ShortSellingPoint[]): ShortSellingPoint[] {
  const map = new Map<string, ShortSellingPoint>()
  for (const p of data) {
    const key = p.date.slice(0, 7) + '-01'
    const existing = map.get(key)
    if (existing) {
      existing.shortVolume += p.shortVolume
      existing.shortValue += p.shortValue
      existing.totalVolume += p.totalVolume
      existing.totalValue += p.totalValue
      existing.shortRatio = existing.totalVolume > 0
        ? (existing.shortVolume / existing.totalVolume) * 100 : 0
    } else {
      map.set(key, { ...p, date: key })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

function fillToMasterDates(points: ShortSellingPoint[], masterDates: string[]): ShortFilled[] {
  if (masterDates.length === 0) return points.map(p => ({ ...p }))
  const byDate = new Map(points.map(p => [p.date, p]))
  return masterDates.map(d => {
    const p = byDate.get(d)
    return p
      ? { date: d, shortVolume: p.shortVolume, shortValue: p.shortValue, totalVolume: p.totalVolume, totalValue: p.totalValue, shortRatio: p.shortRatio }
      : { date: d, shortVolume: 0, shortValue: null, totalVolume: 0, totalValue: 0, shortRatio: null }
  })
}

const COLOR_RISK = '#f59e0b'
const COLOR_RISK_HIGH = '#ef4444'
const COLOR_NORMAL = '#94a3b8'

// ── 차트 서브 컴포넌트 ──────────────────────────────────────────────────────
// InvestorFlowChart의 FlowChart와 같은 방식으로 분리:
// 부모가 early return 후 이 컴포넌트가 마운트될 때만 useEffect([], []) 실행.
function ShortChart({ data, riskEvents }: { data: ShortFilled[]; riskEvents: ShortRiskEvent[] }) {
  const sync = useChartSync()
  const syncRef = useRef(sync)
  syncRef.current = sync

  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const histSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const ratioSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null)

  const [tooltip, setTooltip] = useState<{
    x: number; y: number; date: string
    shortValue: number | null; shortRatio: number | null
  } | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)

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
      rightPriceScale: { visible: false },
      timeScale: HIDDEN_TIME_SCALE,
      localization: { priceFormatter: fmtKrw },
    })

    const histSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: 'right',
      priceLineVisible: false,
      lastValueVisible: false,
    })

    chart.priceScale('right').applyOptions({
      scaleMargins: { top: 0.1, bottom: 0.35 },
      borderVisible: false,
    })

    const ratioSeries = chart.addSeries(LineSeries, {
      priceScaleId: 'ratio',
      color: COLOR_RISK,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })

    chart.priceScale('ratio').applyOptions({
      scaleMargins: { top: 0.72, bottom: 0.05 },
      borderVisible: false,
      visible: false,
    })

    markersRef.current = createSeriesMarkers(histSeries) as ISeriesMarkersPluginApi<Time>
    histSeriesRef.current = histSeries
    ratioSeriesRef.current = ratioSeries
    chartRef.current = chart

    const ro = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidth(Math.floor(entry.contentRect.width))
    })
    ro.observe(container)

    const onMove = (param: MouseEventParams<Time>) => {
      if (!param.time || !param.point) { setTooltip(null); return }
      const bar = param.seriesData.get(histSeries) as HistogramData<Time> | undefined
      const ratioBar = param.seriesData.get(ratioSeries) as LineData<Time> | undefined
      if (!bar && !ratioBar) { setTooltip(null); return }
      const date = typeof param.time === 'string' ? param.time : ''
      setTooltip({
        x: param.point.x, y: param.point.y, date,
        shortValue: bar && 'value' in bar ? bar.value : null,
        shortRatio: ratioBar && 'value' in ratioBar ? ratioBar.value : null,
      })
    }
    chart.subscribeCrosshairMove(onMove)

    const unregister = syncRef.current.registerChart(chart)
    return () => {
      ro.disconnect()
      chart.unsubscribeCrosshairMove(onMove)
      unregister()
      chart.remove()
      chartRef.current = null
      histSeriesRef.current = null
      ratioSeriesRef.current = null
      markersRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    const histSeries = histSeriesRef.current
    const ratioSeries = ratioSeriesRef.current
    const markers = markersRef.current
    if (!chart || !histSeries || !ratioSeries || !markers) return

    const riskDates = new Set(riskEvents.map(e => e.date))
    const extremeDates = new Set(riskEvents.filter(e => e.reason === 'extreme').map(e => e.date))

    const histData: (HistogramData<Time> | WhitespaceData<Time>)[] = data.map(p => {
      if (p.shortValue === null) return { time: p.date as Time }
      return {
        time: p.date as Time,
        value: p.shortValue,
        color: extremeDates.has(p.date) ? COLOR_RISK_HIGH : riskDates.has(p.date) ? COLOR_RISK : COLOR_NORMAL,
      }
    })

    const ratioData: (LineData<Time> | WhitespaceData<Time>)[] = data.map(p => {
      if (p.shortRatio === null) return { time: p.date as Time }
      return { time: p.date as Time, value: p.shortRatio }
    })

    histSeries.setData(histData)
    ratioSeries.setData(ratioData)

    const signalMarkers: SeriesMarker<Time>[] = riskEvents.map((e) => ({
      time: e.date as Time,
      position: 'aboveBar' as const,
      shape: 'arrowDown' as const,
      color: e.reason === 'extreme' ? COLOR_RISK_HIGH : COLOR_RISK,
      text: '!',
      size: 1,
    }))
    markers.setMarkers(signalMarkers)

    syncRef.current.applyRangeToChart(chart)
  }, [data, riskEvents])

  return (
    <div style={{ position: 'relative', height: 200 }}>
      <div ref={containerRef} className="w-full h-full overflow-hidden" />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-popover text-popover-foreground px-2.5 py-1.5 shadow-md text-[11px]"
          style={{
            left: tooltip.x > containerWidth * 0.6 ? tooltip.x - 150 : tooltip.x + 10,
            top: Math.max(4, tooltip.y - 44),
          }}
        >
          <p className="text-muted-foreground mb-1 font-medium text-[10px]">{tooltip.date}</p>
          <div className="grid grid-cols-2 gap-x-2.5 gap-y-0.5 tabular-nums">
            {tooltip.shortValue !== null && <>
              <span className="text-muted-foreground">공매도 대금</span>
              <span className="font-semibold">{fmtKrw(tooltip.shortValue)}</span>
            </>}
            {tooltip.shortRatio !== null && <>
              <span className="text-muted-foreground">공매도 비중</span>
              <span style={{ color: COLOR_RISK }}>{fmtPct(tooltip.shortRatio)}</span>
            </>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 메인 패널 ────────────────────────────────────────────────────────────────
export function ShortSellingPanel({ ticker, period, range = '1y' }: Props) {
  const sync = useChartSync()
  const [raw, setRaw] = useState<ShortSellingPoint[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [unsupported, setUnsupported] = useState(false)
  const [masterDates, setMasterDates] = useState<string[]>([])

  useEffect(() => sync.subscribeMasterDates(setMasterDates), [sync])

  useEffect(() => {
    setRaw(null)
    setUnsupported(false)
    setLoading(true)
    const ctrl = new AbortController()
    fetch(`/api/short-selling?ticker=${encodeURIComponent(ticker)}&range=${range}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then((res: { data?: ShortSellingPoint[]; unsupported?: boolean }) => {
        if (res.unsupported) { setUnsupported(true); return }
        setRaw(res.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [ticker, range])

  const data = useMemo(() => {
    if (!raw) return []
    if (period === '주봉') return fillToMasterDates(aggregateByWeek(raw), masterDates)
    if (period === '월봉') return fillToMasterDates(aggregateByMonth(raw), masterDates)
    return fillToMasterDates(raw, masterDates)
  }, [raw, period, masterDates])

  const solidPoints = useMemo(
    () => data
      .filter((p) => p.shortRatio !== null)
      .map((p) => ({
        date: p.date,
        shortVolume: p.shortVolume,
        shortValue: p.shortValue ?? 0,
        totalVolume: p.totalVolume,
        totalValue: p.totalValue,
        shortRatio: p.shortRatio ?? 0,
      } satisfies ShortSellingPoint)),
    [data],
  )

  const riskEvents = useMemo(() => detectShortSellingRisks(solidPoints), [solidPoints])

  const signalInfo = useMemo(
    () => lastShortRiskFromEvents(riskEvents, solidPoints),
    [riskEvents, solidPoints],
  )

  const badgeText = signalInfo
    ? `${signalInfo.daysAgo}일 전 공매도 ${signalInfo.reason === 'extreme' ? '극단' : '급증'} 경고 (비중 ${signalInfo.ratio.toFixed(1)}%)`
    : '최근 위험신호 없음'

  const badgeClass = signalInfo
    ? signalInfo.reason === 'extreme'
      ? 'bg-red-50 border border-red-200 text-red-600'
      : 'bg-amber-50 border border-amber-200 text-amber-600'
    : 'bg-muted border border-border text-muted-foreground'

  if (loading) return <Skeleton className="h-[200px] w-full" />

  if (unsupported) {
    return (
      <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
        해당 종목은 공매도 데이터를 제공하지 않습니다 (미국 주식/ETF)
      </div>
    )
  }

  if (!raw || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
        공매도 데이터를 불러오지 못했습니다
      </div>
    )
  }

  return (
    <div data-component="ShortSellingPanel">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-foreground">공매도</p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-2.5 rounded-sm" style={{ background: COLOR_NORMAL }} />
              거래대금
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-[1.5px]" style={{ background: COLOR_RISK }} />
              비중(%)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-2.5 rounded-sm" style={{ background: COLOR_RISK }} />
              급증
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-2.5 rounded-sm" style={{ background: COLOR_RISK_HIGH }} />
              극단
            </span>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
          {badgeText}
        </span>
      </div>
      <div className="mt-2">
        <ShortChart data={data} riskEvents={riskEvents} />
      </div>
    </div>
  )
}
