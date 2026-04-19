'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createChart,
  CandlestickSeries,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
  type Time,
  type MouseEventParams,
} from 'lightweight-charts'
import { CHART_UP, CHART_DOWN, resolvePalette } from '@/lib/chart/theme'

export interface CandlestickPoint {
  date: string
  label?: string
  open: number
  high: number
  low: number
  close: number
  returnPct?: number
  delta?: number
}

interface CandlestickChartProps {
  data: CandlestickPoint[]
  formatPrice?: (v: number) => string
}

function defaultFormatPrice(v: number): string {
  const abs = Math.abs(v)
  const sign = v >= 0 ? '+' : '−'
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)}억`
  if (abs >= 10_000) return `${sign}${(abs / 10_000).toFixed(0)}만`
  return (v >= 0 ? '+' : '') + v.toLocaleString()
}

function axisFormatPrice(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? '−' : ''
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)}억`
  if (abs >= 10_000) return `${sign}${(abs / 10_000).toFixed(0)}만`
  return v.toLocaleString()
}

interface TooltipState {
  x: number
  y: number
  point: CandlestickPoint
}

export function CandlestickChart({ data, formatPrice = defaultFormatPrice }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  // `date` 필드는 YYYY-MM-DD, YYYY-MM, 'YYYY', 'd0'/'d1' 등 다양한 형태로 들어온다.
  // lightweight-charts는 엄격한 시간값을 요구하므로 인덱스를 하루 간격 UTCTimestamp 로
  // 매핑해 시리즈에 넘기고, 원본 포인트는 별도 Map 으로 보관해 툴팁·축 라벨에 사용한다.
  const pointByTime = useMemo(() => {
    const m = new Map<number, CandlestickPoint>()
    data.forEach((p, i) => m.set(indexToTime(i), p))
    return m
  }, [data])

  // 도메인이 양/음을 걸치면 0 기준선 포함 필요
  const spansZero = useMemo(() => {
    if (data.length === 0) return false
    let lo = Infinity
    let hi = -Infinity
    for (const p of data) {
      if (p.low < lo) lo = p.low
      if (p.high > hi) hi = p.high
    }
    return lo < 0 && hi > 0
  }, [data])

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
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderVisible: false,
        tickMarkFormatter: (time: Time) => {
          const key = typeof time === 'number' ? time : 0
          const p = pointByTime.get(key)
          if (p?.label) return p.label
          if (p?.date) return p.date.slice(5).replace('-', '/')
          return ''
        },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: palette.mutedText, width: 1, style: 3 },
        horzLine: { color: palette.mutedText, width: 1, style: 3 },
      },
      localization: {
        priceFormatter: axisFormatPrice,
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

    const onMove = (param: MouseEventParams<Time>) => {
      if (!param.time || !param.point) {
        setTooltip(null)
        return
      }
      const key = typeof param.time === 'number' ? param.time : 0
      const p = pointByTime.get(key)
      if (!p) {
        setTooltip(null)
        return
      }
      setTooltip({ x: param.point.x, y: param.point.y, point: p })
    }
    chart.subscribeCrosshairMove(onMove)

    return () => {
      chart.unsubscribeCrosshairMove(onMove)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [pointByTime])

  useEffect(() => {
    const series = seriesRef.current
    const chart = chartRef.current
    if (!series || !chart || data.length === 0) return

    const seriesData: CandlestickData<Time>[] = data.map((d, i) => ({
      time: indexToTime(i) as UTCTimestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))
    series.setData(seriesData)

    // 0 기준선 (손익 분기 시각화)
    if (spansZero) {
      series.createPriceLine({
        price: 0,
        color: 'rgba(156,163,175,0.6)',
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: false,
        title: '',
      })
    }

    chart.timeScale().fitContent()
  }, [data, spansZero])

  if (data.length === 0) return null

  const isTooltipUp = tooltip ? tooltip.point.close >= tooltip.point.open : true

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-popover text-popover-foreground px-3 py-2 shadow text-xs min-w-[120px]"
          style={{
            left: tooltip.x + 12,
            top: Math.max(0, tooltip.y - 80),
          }}
        >
          <p className="text-muted-foreground mb-1.5 font-medium">{tooltip.point.label ?? tooltip.point.date}</p>
          <div className={`font-semibold ${isTooltipUp ? 'text-red-500' : 'text-blue-500'}`}>
            <div className="text-sm">{formatPrice(tooltip.point.close)}</div>
          </div>
          {tooltip.point.returnPct !== undefined && (
            <div className={`mt-0.5 ${isTooltipUp ? 'text-red-400' : 'text-blue-400'}`}>
              누적 {tooltip.point.returnPct >= 0 ? '+' : ''}{tooltip.point.returnPct.toFixed(2)}%
            </div>
          )}
          {tooltip.point.delta !== undefined && (
            <div className="text-muted-foreground mt-0.5">
              전기 대비 {formatPrice(tooltip.point.delta)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 1970-01-02 부터 하루 간격. 0 은 timeScale 내부에서 특수 처리되는 경우가 있어 피한다.
function indexToTime(i: number): number {
  return (i + 1) * 86_400
}
