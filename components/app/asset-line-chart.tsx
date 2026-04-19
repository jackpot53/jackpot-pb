'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createChart,
  LineSeries,
  LineStyle,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type MouseEventParams,
} from 'lightweight-charts'
import type { AssetHistoryPoint } from '@/lib/asset-history-types'
import { formatKrw } from '@/lib/portfolio'
import { resolvePalette } from '@/lib/chart/theme'

interface AssetLineChartProps {
  data: AssetHistoryPoint[]
  kind: 'line-nav' | 'line-projected'
  positive?: boolean
}

interface TooltipState {
  x: number
  y: number
  value: number
  date: string
}

export function AssetLineChart({ data, kind, positive = true }: AssetLineChartProps) {
  const color = positive ? '#ef4444' : '#3b82f6'
  const isProjected = kind === 'line-projected'

  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const solidSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const dashedSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [todayX, setTodayX] = useState<number | null>(null)

  const todayDate = useMemo(() => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  }, [])

  const todayAnchor = useMemo(() => {
    if (!isProjected) return null
    const hit = data.find((d) => d.date >= todayDate)
    return hit?.date ?? null
  }, [data, todayDate, isProjected])

  useEffect(() => {
    const container = containerRef.current
    if (!container || data.length < 2) return

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
        tickMarkFormatter: (time: Time) => {
          const iso = timeToIso(time)
          const [y, m, d] = iso.split('-')
          if (isProjected) return `${y}.${Number(m)}`
          return `${Number(m)}/${Number(d)}`
        },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: palette.mutedText, width: 1, style: 3 },
        horzLine: { color: palette.mutedText, width: 1, style: 3 },
      },
      localization: {
        priceFormatter: (v: number) => formatKrw(v).replace('₩', ''),
      },
      handleScroll: false,
      handleScale: false,
    })

    const solidSeries = chart.addSeries(LineSeries, {
      color,
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      lastValueVisible: false,
      priceLineVisible: false,
    })
    const dashedSeries = chart.addSeries(LineSeries, {
      color,
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      lastValueVisible: false,
      priceLineVisible: false,
    })

    chartRef.current = chart
    solidSeriesRef.current = solidSeries
    dashedSeriesRef.current = dashedSeries

    const label = kind === 'line-nav' ? 'NAV' : '평가금'

    const onMove = (param: MouseEventParams<Time>) => {
      if (!param.time || !param.point) {
        setTooltip(null)
        return
      }
      const solid = param.seriesData.get(solidSeries) as { value: number } | undefined
      const dashed = param.seriesData.get(dashedSeries) as { value: number } | undefined
      const v = solid?.value ?? dashed?.value
      if (v === undefined) {
        setTooltip(null)
        return
      }
      setTooltip({
        x: param.point.x,
        y: param.point.y,
        value: v,
        date: timeToIso(param.time),
      })
      // label 미사용 방지용 참조
      void label
    }
    chart.subscribeCrosshairMove(onMove)

    const updateTodayX = () => {
      if (!todayAnchor) {
        setTodayX(null)
        return
      }
      const x = chart.timeScale().timeToCoordinate(todayAnchor as unknown as Time)
      setTodayX(x === null ? null : x)
    }
    const ts = chart.timeScale()
    ts.subscribeVisibleTimeRangeChange(updateTodayX)
    ts.subscribeVisibleLogicalRangeChange(updateTodayX)

    return () => {
      chart.unsubscribeCrosshairMove(onMove)
      ts.unsubscribeVisibleTimeRangeChange(updateTodayX)
      ts.unsubscribeVisibleLogicalRangeChange(updateTodayX)
      chart.remove()
      chartRef.current = null
      solidSeriesRef.current = null
      dashedSeriesRef.current = null
    }
  }, [color, isProjected, kind, todayAnchor, data.length])

  useEffect(() => {
    const solidSeries = solidSeriesRef.current
    const dashedSeries = dashedSeriesRef.current
    const chart = chartRef.current
    if (!solidSeries || !dashedSeries || !chart || data.length === 0) return

    const solidData = data.filter((d) => !d.projected).map((d) => ({ time: d.date as unknown as Time, value: d.value }))
    const dashedData = data.filter((d) => d.projected).map((d) => ({ time: d.date as unknown as Time, value: d.value }))

    solidSeries.setData(solidData)
    dashedSeries.setData(isProjected ? dashedData : [])
    chart.timeScale().fitContent()
  }, [data, isProjected])

  if (data.length < 2) {
    return (
      <div data-component="AssetLineChart" className="flex items-center justify-center h-full text-xs text-muted-foreground">
        데이터 수집 중
      </div>
    )
  }

  const tooltipLabel = kind === 'line-nav' ? 'NAV' : '평가금'

  return (
    <div data-component="AssetLineChart" ref={containerRef} className="relative w-full h-full">
      {/* 오늘 수직선 */}
      {isProjected && todayX !== null && (
        <div
          className="pointer-events-none absolute top-0 bottom-0"
          style={{ left: todayX }}
        >
          <div className="w-px h-full border-l border-dashed border-muted-foreground/60" />
          <span className="absolute -top-px left-1 text-[9px] text-muted-foreground bg-background/80 px-0.5">오늘</span>
        </div>
      )}

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-popover text-popover-foreground px-2.5 py-1.5 shadow text-[11px]"
          style={{
            left: tooltip.x + 12,
            top: Math.max(0, tooltip.y - 48),
          }}
        >
          <p className="text-muted-foreground mb-0.5">{tooltip.date}</p>
          <p className="font-semibold" style={{ color }}>{tooltipLabel} {formatKrw(tooltip.value)}</p>
        </div>
      )}
    </div>
  )
}

function timeToIso(time: Time): string {
  if (typeof time === 'string') return time
  if (typeof time === 'number') return new Date(time * 1000).toISOString().slice(0, 10)
  const t = time as { year: number; month: number; day: number }
  return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`
}
