'use client'

import { memo, useEffect, useMemo, useRef } from 'react'
import {
  createChart,
  LineSeries,
  HistogramSeries,
  LineStyle,
  createSeriesMarkers,
  type Time,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
} from 'lightweight-charts'
import type { OhlcPoint } from '@/lib/price/sparkline'
import { avgVolume } from '@/lib/robo-advisor/indicators/volume'
import { detectVolumeBreakouts, lastBreakoutFromEvents } from '@/lib/robo-advisor/signals/volume-breakout'
import { CHART_UP, CHART_DOWN, resolvePalette } from '@/lib/chart/theme'

interface Props {
  data: OhlcPoint[]
  height?: number
}

function fmtVol(v: number): string {
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`
  if (v >= 10_000) return `${(v / 10_000).toFixed(0)}만`
  return v.toLocaleString('ko-KR')
}

export const VolumePanel = memo(function VolumePanel({ data, height = 180 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const histSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const avgSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null)

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
      localization: {
        priceFormatter: fmtVol,
      },
      handleScroll: false,
      handleScale: false,
    })

    const histSeries = chart.addSeries(HistogramSeries, {
      priceLineVisible: false,
      lastValueVisible: false,
    })

    const avgSeries = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })

    markersRef.current = createSeriesMarkers(avgSeries) as ISeriesMarkersPluginApi<Time>
    histSeriesRef.current = histSeries
    avgSeriesRef.current = avgSeries
    chartRef.current = chart

    return () => {
      chart.remove()
      chartRef.current = null
      histSeriesRef.current = null
      avgSeriesRef.current = null
      markersRef.current = null
    }
  }, [])

  // detectVolumeBreakouts()를 한 번만 계산해 차트 마커와 시그널 배지 모두 재사용
  const breakoutEvents = useMemo(
    () => (data.length >= 22 ? detectVolumeBreakouts(data) : []),
    [data],
  )

  useEffect(() => {
    const chart = chartRef.current
    const histSeries = histSeriesRef.current
    const avgSeries = avgSeriesRef.current
    const markers = markersRef.current
    if (!chart || !histSeries || !avgSeries || !markers) return

    if (data.length < 22) {
      histSeries.setData([])
      avgSeries.setData([])
      markers.setMarkers([])
      return
    }

    const volumes = data.map((p) => p.volume ?? null)
    const avgVols = avgVolume(volumes, 20)

    const histData: { time: Time; value: number; color: string }[] = []
    const avgData: { time: Time; value: number }[] = []

    for (let i = 0; i < data.length; i++) {
      const vol = volumes[i]
      const t = data[i].date as Time
      if (vol !== null) {
        histData.push({
          time: t,
          value: vol,
          color: data[i].close >= data[i].open ? CHART_UP : CHART_DOWN,
        })
      }
      const avg = avgVols[i]
      if (avg !== null) {
        avgData.push({ time: t, value: avg })
      }
    }

    histSeries.setData(histData)
    avgSeries.setData(avgData)

    const signalMarkers: SeriesMarker<Time>[] = breakoutEvents.map((e) => ({
      time: e.date as Time,
      position: e.type === 'buy' ? ('belowBar' as const) : ('aboveBar' as const),
      shape: e.type === 'buy' ? ('arrowUp' as const) : ('arrowDown' as const),
      color: e.type === 'buy' ? CHART_UP : CHART_DOWN,
      text: e.type === 'buy' ? 'B' : 'S',
      size: 1,
    }))
    markers.setMarkers(signalMarkers)

    chart.timeScale().fitContent()
  }, [data, breakoutEvents])

  const signalInfo = useMemo(
    () => lastBreakoutFromEvents(breakoutEvents, data),
    [breakoutEvents, data],
  )

  const badgeText = signalInfo
    ? `${signalInfo.daysAgo}일 전 ${signalInfo.type === 'buy' ? '매수' : '매도'} 시그널 (${signalInfo.ratio.toFixed(1)}x)`
    : '최근 시그널 없음'

  const badgeClass = signalInfo
    ? signalInfo.type === 'buy'
      ? 'bg-red-50 border border-red-200 text-red-600'
      : 'bg-blue-50 border border-blue-200 text-blue-600'
    : 'bg-muted border border-border text-muted-foreground'

  const noData = data.length < 22

  return (
    <div data-component="VolumePanel" className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-foreground">거래량</p>
          {!noData && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-[1.5px] bg-amber-500 border-dashed border-b border-amber-500" />
                20일 평균
              </span>
            </div>
          )}
        </div>
        {!noData && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
            {badgeText}
          </span>
        )}
      </div>
      <div className="relative" style={{ height: `${height}px` }}>
        <div ref={containerRef} className="w-full h-full rounded-md overflow-hidden" />
        {noData && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            거래량 데이터가 부족합니다 (최소 22일 필요)
          </div>
        )}
      </div>
    </div>
  )
})
