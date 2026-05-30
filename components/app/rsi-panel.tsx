'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useChartSync, CHART_RIGHT_AXIS_WIDTH, HIDDEN_TIME_SCALE } from './chart-sync'
import {
  createChart,
  LineSeries,
  LineStyle,
  createSeriesMarkers,
  type Time,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type WhitespaceData,
  type LineData,
} from 'lightweight-charts'
import type { OhlcPoint } from '@/lib/price/sparkline'
import { rsi } from '@/lib/robo-advisor/indicators/rsi'
import { detectRsiSignalsFromRsi, lastRsiSignalFromRsi } from '@/lib/robo-advisor/signals/rsi-signals'
import { CHART_UP, CHART_DOWN, resolvePalette } from '@/lib/chart/theme'

interface Props {
  data: OhlcPoint[]
  height?: number
}

const MIN_DATA = 15

export function RsiPanel({ data, height = 120 }: Props) {
  const sync = useChartSync()
  const syncRef = useRef(sync)
  syncRef.current = sync

  const [axisWidth, setAxisWidth] = useState(CHART_RIGHT_AXIS_WIDTH)

  useEffect(() => sync.subscribeMasterAxisWidth(setAxisWidth), [sync])

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

  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
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
        visible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: HIDDEN_TIME_SCALE,
      localization: {
        priceFormatter: (v: number) => v.toFixed(0),
      },
    })

    const lineSeries = chart.addSeries(LineSeries, {
      color: '#8b5cf6',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })

    // 과매수 70, 과매도 30, 중립 50 기준선
    lineSeries.createPriceLine({
      price: 70,
      lineStyle: LineStyle.Dashed,
      lineWidth: 1,
      color: CHART_DOWN,
      axisLabelVisible: false,
      title: '70',
    })
    lineSeries.createPriceLine({
      price: 30,
      lineStyle: LineStyle.Dashed,
      lineWidth: 1,
      color: CHART_UP,
      axisLabelVisible: false,
      title: '30',
    })
    lineSeries.createPriceLine({
      price: 50,
      lineStyle: LineStyle.Dotted,
      lineWidth: 1,
      color: palette.mutedText,
      axisLabelVisible: false,
      title: '',
    })

    markersRef.current = createSeriesMarkers(lineSeries) as ISeriesMarkersPluginApi<Time>
    lineSeriesRef.current = lineSeries
    chartRef.current = chart

    const unregister = syncRef.current.registerChart(chart)

    return () => {
      unregister()
      chart.remove()
      chartRef.current = null
      lineSeriesRef.current = null
      markersRef.current = null
    }
  }, [])

  // rsi()를 한 번만 계산해 차트 데이터와 시그널 배지 모두 재사용
  const rsiResult = useMemo(
    () => (data.length >= MIN_DATA ? rsi(data.map((p) => p.close), 14) : null),
    [data],
  )

  useEffect(() => {
    const chart = chartRef.current
    const lineSeries = lineSeriesRef.current
    const markers = markersRef.current
    if (!chart || !lineSeries || !markers) return

    if (!rsiResult) {
      lineSeries.setData([])
      markers.setMarkers([])
      return
    }

    const lineData: (LineData | WhitespaceData)[] = []
    for (let i = 0; i < data.length; i++) {
      const v = rsiResult[i]
      const t = data[i].date as Time
      if (v !== null) {
        lineData.push({ time: t, value: v })
      } else {
        lineData.push({ time: t })
      }
    }
    lineSeries.setData(lineData)

    const dates = data.map((p) => p.date)
    const events = detectRsiSignalsFromRsi(rsiResult, dates)
    const signalMarkers: SeriesMarker<Time>[] = events.map((e) => ({
      time: e.date as Time,
      position: e.type === 'buy' ? ('belowBar' as const) : ('aboveBar' as const),
      shape: e.type === 'buy' ? ('arrowUp' as const) : ('arrowDown' as const),
      color: e.type === 'buy' ? CHART_UP : CHART_DOWN,
      text: e.type === 'buy' ? '매수' : '매도',
      size: 1,
    }))
    markers.setMarkers(signalMarkers)

    syncRef.current.applyRangeToChart(chart)

    const rafId = requestAnimationFrame(() => {
      const w = chart.priceScale('right').width()
      if (w > 0) syncRef.current.setMasterAxisWidth(w)
    })
    return () => cancelAnimationFrame(rafId)
  }, [data, rsiResult])

  const signalInfo = useMemo(() => {
    if (!rsiResult) return null
    return lastRsiSignalFromRsi(rsiResult, data.map((p) => p.date))
  }, [data, rsiResult])

  const badgeText = signalInfo
    ? `${signalInfo.daysAgo}일 전 ${signalInfo.type === 'buy' ? '매수' : '매도'} 시그널`
    : '최근 시그널 없음'

  const badgeClass = signalInfo
    ? signalInfo.type === 'buy'
      ? 'bg-red-50 border border-red-200 text-red-600'
      : 'bg-blue-50 border border-blue-200 text-blue-600'
    : 'bg-muted border border-border text-muted-foreground'

  const noData = data.length < MIN_DATA

  return (
    <div data-component="RsiPanel">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-foreground">RSI (14)</p>
          {!noData && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-[1.5px]" style={{ background: CHART_DOWN }} />
                과매수 70
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-[1.5px]" style={{ background: CHART_UP }} />
                과매도 30
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
            RSI 계산을 위한 데이터가 부족합니다 (최소 15일 필요)
          </div>
        )}
      </div>
    </div>
  )
}
