'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useChartSync, CHART_RIGHT_AXIS_WIDTH, HIDDEN_TIME_SCALE } from './chart-sync'
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
import { macd } from '@/lib/robo-advisor/indicators/macd'
import { detectMacdCrossesFromMacd, lastMacdCrossFromMacd } from '@/lib/robo-advisor/signals/macd-cross'
import { CHART_UP, CHART_DOWN, resolvePalette } from '@/lib/chart/theme'

interface Props {
  data: OhlcPoint[]
  height?: number
}

export function MacdPanel({ data, height = 180 }: Props) {
  const sync = useChartSync()
  const syncRef = useRef(sync)
  syncRef.current = sync

  const [axisWidth, setAxisWidth] = useState(CHART_RIGHT_AXIS_WIDTH)

  useEffect(() => sync.subscribeMasterAxisWidth(setAxisWidth), [sync])

  useEffect(() => {
    chartRef.current?.priceScale('right').applyOptions({ minimumWidth: axisWidth })
  }, [axisWidth])

  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const histSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const macdSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const signalSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null)

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
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: HIDDEN_TIME_SCALE,
    })

    const histSeries = chart.addSeries(HistogramSeries, {
      priceLineVisible: false,
      lastValueVisible: false,
    })

    const macdSeries = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })

    const signalSeries = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })

    macdSeries.createPriceLine({
      price: 0,
      lineStyle: LineStyle.Dashed,
      lineWidth: 1,
      color: palette.mutedText,
      axisLabelVisible: false,
      title: '',
    })

    markersRef.current = createSeriesMarkers(macdSeries) as ISeriesMarkersPluginApi<Time>
    histSeriesRef.current = histSeries
    macdSeriesRef.current = macdSeries
    signalSeriesRef.current = signalSeries
    chartRef.current = chart

    const unregister = syncRef.current.registerChart(chart)

    return () => {
      unregister()
      chart.remove()
      chartRef.current = null
      histSeriesRef.current = null
      macdSeriesRef.current = null
      signalSeriesRef.current = null
      markersRef.current = null
    }
  }, [])

  // macd()를 한 번만 계산해 차트 데이터와 시그널 배지 모두 재사용
  const macdResult = useMemo(
    () => (data.length >= 40 ? macd(data.map((p) => p.close)) : null),
    [data],
  )

  useEffect(() => {
    const chart = chartRef.current
    const histSeries = histSeriesRef.current
    const macdSeries = macdSeriesRef.current
    const signalSeries = signalSeriesRef.current
    const markers = markersRef.current
    if (!chart || !histSeries || !macdSeries || !signalSeries || !markers) return

    if (!macdResult) {
      histSeries.setData([])
      macdSeries.setData([])
      signalSeries.setData([])
      markers.setMarkers([])
      return
    }

    const histData: { time: Time; value: number; color: string }[] = []
    const macdData: { time: Time; value: number }[] = []
    const signalData: { time: Time; value: number }[] = []

    for (let i = 0; i < data.length; i++) {
      const m = macdResult[i]
      const t = data[i].date as Time
      if (m.histogram !== null) {
        histData.push({ time: t, value: m.histogram, color: m.histogram >= 0 ? CHART_UP : CHART_DOWN })
      }
      if (m.macd !== null) macdData.push({ time: t, value: m.macd })
      if (m.signal !== null) signalData.push({ time: t, value: m.signal })
    }

    histSeries.setData(histData)
    macdSeries.setData(macdData)
    signalSeries.setData(signalData)

    const dates = data.map((p) => p.date)
    const crosses = detectMacdCrossesFromMacd(macdResult, dates)
    const crossMarkers: SeriesMarker<Time>[] = crosses.map((c) => ({
      time: c.date as Time,
      position: c.type === 'golden' ? ('belowBar' as const) : ('aboveBar' as const),
      shape: c.type === 'golden' ? ('arrowUp' as const) : ('arrowDown' as const),
      color: c.type === 'golden' ? CHART_UP : CHART_DOWN,
      text: c.type === 'golden' ? 'G' : 'D',
      size: 1,
    }))
    markers.setMarkers(crossMarkers)

    const shared = syncRef.current.getCurrentLogicalRange()
    if (shared) chart.timeScale().setVisibleLogicalRange(shared)
    else chart.timeScale().fitContent()
  }, [data, macdResult])

  const signalInfo = useMemo(() => {
    if (!macdResult) return null
    return lastMacdCrossFromMacd(macdResult, data.map((p) => p.date))
  }, [data, macdResult])

  const badgeText = signalInfo
    ? `${signalInfo.daysAgo}일 전 ${signalInfo.type === 'golden' ? '골든 크로스 (매수)' : '데드 크로스 (매도)'}`
    : '최근 크로스 없음'

  const badgeClass = signalInfo
    ? signalInfo.type === 'golden'
      ? 'bg-red-50 border border-red-200 text-red-600'
      : 'bg-blue-50 border border-blue-200 text-blue-600'
    : 'bg-muted border border-border text-muted-foreground'

  const noData = data.length < 40

  return (
    <div data-component="MacdPanel">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-foreground">MACD (12, 26, 9)</p>
          {!noData && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-[1.5px] bg-blue-500" />
                MACD
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-[1.5px] bg-amber-500 border-dashed border-b border-amber-500" />
                Signal
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
      <div className="mt-2 relative overflow-hidden" style={{ height: `${height}px` }}>
        <div ref={containerRef} className="w-full h-full overflow-hidden" />
        {noData && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            MACD 계산을 위한 데이터가 부족합니다 (최소 40일 필요)
          </div>
        )}
      </div>
    </div>
  )
}
