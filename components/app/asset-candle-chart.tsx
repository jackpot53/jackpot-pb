'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createChart,
  CandlestickSeries,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
  type MouseEventParams,
} from 'lightweight-charts'
import type { OhlcPoint } from '@/lib/price/sparkline'
import { useKisLivePrice } from '@/lib/ws/kis-ws-context'
import { CHART_UP, CHART_DOWN, resolvePalette } from '@/lib/chart/theme'

type Period = '일봉' | '주봉' | '월봉'

const PERIODS: Period[] = ['일봉', '주봉', '월봉']
const PERIOD_PARAMS: Record<Period, { interval: string; range: string }> = {
  '일봉': { interval: '1d', range: '1mo' },
  '주봉': { interval: '1wk', range: '6mo' },
  '월봉': { interval: '1mo', range: '2y' },
}

interface AssetCandleChartProps {
  ticker: string
  initialData: OhlcPoint[]
  assetType?: string
}

interface TooltipState {
  x: number
  y: number
  point: OhlcPoint
}

function fmtAxisPrice(v: number): string {
  if (v >= 100_000) return `${(v / 10_000).toFixed(0)}만`
  if (v >= 10_000) return `${(v / 10_000).toFixed(1)}만`
  if (v >= 1_000) return v.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
  if (v >= 100) return v.toFixed(1)
  return v.toFixed(2)
}

function fmtTooltipPrice(v: number): string {
  if (v >= 1_000) return v.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
  return v.toFixed(2)
}

function toSeriesData(points: OhlcPoint[]): CandlestickData<Time>[] {
  return points.map((p) => ({
    time: p.date,
    open: p.open,
    high: p.high,
    low: p.low,
    close: p.close,
  }))
}

export function AssetCandleChart({ ticker, initialData, assetType }: AssetCandleChartProps) {
  const [period, setPeriod] = useState<Period>('일봉')
  const [fetchedByPeriod, setFetchedByPeriod] = useState<Partial<Record<Period, OhlcPoint[]>>>({})
  const [loading, setLoading] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const liveTick = useKisLivePrice(ticker, assetType ?? null)

  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  const baseData = useMemo<OhlcPoint[]>(
    () => period === '일봉'
      ? (fetchedByPeriod['일봉'] ?? initialData)
      : (fetchedByPeriod[period] ?? []),
    [period, initialData, fetchedByPeriod],
  )

  // 일봉에서만 live tick overlay 적용.
  const data = useMemo<OhlcPoint[]>(() => {
    if (!liveTick || baseData.length === 0 || period !== '일봉') return baseData
    const last = baseData[baseData.length - 1]
    const merged: OhlcPoint = {
      ...last,
      close: liveTick.price,
      high: Math.max(last.high, liveTick.price),
      low: Math.min(last.low, liveTick.price),
    }
    return [...baseData.slice(0, -1), merged]
  }, [baseData, liveTick, period])

  // initialData가 비어있으면 일봉 데이터를 직접 fetch
  useEffect(() => {
    if (initialData.length > 0) return
    const { interval, range } = PERIOD_PARAMS['일봉']
    fetch(`/api/sparklines?tickers=${encodeURIComponent(ticker)}&interval=${interval}&range=${range}`)
      .then((r) => r.json())
      .then((res: Record<string, OhlcPoint[]>) => {
        const d = res[ticker]
        if (d && d.length >= 2) setFetchedByPeriod((prev) => ({ ...prev, '일봉': d }))
      })
      .catch(() => {})
  }, [ticker, initialData.length])

  // 주/월봉 전환 시 호출 — 사용자 액션에서 직접 트리거.
  const selectPeriod = useCallback(
    (next: Period) => {
      setPeriod(next)
      if (next === '일봉' || fetchedByPeriod[next]) return
      const { interval, range } = PERIOD_PARAMS[next]
      setLoading(true)
      fetch(`/api/sparklines?tickers=${encodeURIComponent(ticker)}&interval=${interval}&range=${range}`)
        .then((r) => r.json())
        .then((res: Record<string, OhlcPoint[]>) => {
          const d = res[ticker]
          if (d && d.length >= 2) {
            setFetchedByPeriod((prev) => ({ ...prev, [next]: d }))
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    },
    [fetchedByPeriod, ticker],
  )

  // Chart 생성(한 번)
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
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: palette.mutedText, width: 1, style: 3 },
        horzLine: { color: palette.mutedText, width: 1, style: 3 },
      },
      localization: {
        priceFormatter: fmtAxisPrice,
      },
      handleScroll: false,
      handleScale: false,
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: CHART_UP,
      downColor: CHART_DOWN,
      borderUpColor: CHART_UP,
      borderDownColor: CHART_DOWN,
      wickUpColor: CHART_UP,
      wickDownColor: CHART_DOWN,
    })

    chartRef.current = chart
    seriesRef.current = series

    setContainerWidth(container.clientWidth)
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidth(Math.floor(entry.contentRect.width))
    })
    ro.observe(container)

    // 크로스헤어 툴팁
    const onMove = (param: MouseEventParams<Time>) => {
      if (!param.time || !param.point || !container) {
        setTooltip(null)
        return
      }
      const bar = param.seriesData.get(series) as CandlestickData<Time> | undefined
      if (!bar) {
        setTooltip(null)
        return
      }
      const timeStr =
        typeof param.time === 'string'
          ? param.time
          : typeof param.time === 'number'
            ? new Date(param.time * 1000).toISOString().slice(0, 10)
            : `${(param.time as { year: number; month: number; day: number }).year}-${String((param.time as { month: number }).month).padStart(2, '0')}-${String((param.time as { day: number }).day).padStart(2, '0')}`
      setTooltip({
        x: param.point.x,
        y: param.point.y,
        point: {
          date: timeStr,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        },
      })
    }
    chart.subscribeCrosshairMove(onMove)

    return () => {
      ro.disconnect()
      chart.unsubscribeCrosshairMove(onMove)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // 데이터/기간 교체 시 setData (live tick 제외 시나리오)
  useEffect(() => {
    const series = seriesRef.current
    const chart = chartRef.current
    if (!series || !chart || baseData.length === 0) return
    series.setData(toSeriesData(baseData))
    chart.timeScale().fitContent()
  }, [baseData])

  // Live tick → 마지막 캔들만 patch (일봉)
  useEffect(() => {
    const series = seriesRef.current
    if (!series || period !== '일봉' || data.length === 0) return
    const last = data[data.length - 1]
    series.update({
      time: last.date,
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
    })
  }, [data, period])

  if (baseData.length === 0) {
    return null
  }

  const changePct = tooltip
    ? ((tooltip.point.close - tooltip.point.open) / tooltip.point.open) * 100
    : null
  const isUp = tooltip ? tooltip.point.close >= tooltip.point.open : true

  return (
    <div data-component="AssetCandleChart" className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-2 pt-2 pb-1">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => selectPeriod(p)}
            className={`px-2.5 py-0.5 text-xs rounded-md font-medium transition-colors ${
              period === p
                ? 'bg-muted text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {p}
          </button>
        ))}
        {loading && <span className="text-xs text-muted-foreground ml-1">…</span>}
      </div>

      <div ref={containerRef} className="relative flex-1 min-h-0">
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-border bg-popover text-popover-foreground px-3 py-2 shadow-md text-xs min-w-[140px]"
            style={{
              left: tooltip.x > containerWidth * 0.6 ? tooltip.x - 158 : tooltip.x + 12,
              top: Math.max(4, tooltip.y - 80),
            }}
          >
            <p className="text-muted-foreground mb-1.5 font-medium">{tooltip.point.date}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 tabular-nums">
              <span className="text-muted-foreground">시가</span>
              <span className="font-medium">{fmtTooltipPrice(tooltip.point.open)}</span>
              <span className="text-muted-foreground">고가</span>
              <span className={`font-medium ${isUp ? 'text-red-500' : 'text-blue-500'}`}>{fmtTooltipPrice(tooltip.point.high)}</span>
              <span className="text-muted-foreground">저가</span>
              <span className={`font-medium ${isUp ? 'text-red-500' : 'text-blue-500'}`}>{fmtTooltipPrice(tooltip.point.low)}</span>
              <span className="text-muted-foreground">종가</span>
              <span className={`font-medium ${isUp ? 'text-red-500' : 'text-blue-500'}`}>{fmtTooltipPrice(tooltip.point.close)}</span>
            </div>
            {changePct !== null && (
              <div className={`mt-1.5 font-semibold text-sm ${isUp ? 'text-red-500' : 'text-blue-500'}`}>
                {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
