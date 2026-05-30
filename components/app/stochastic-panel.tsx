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
import { stochastic } from '@/lib/robo-advisor/indicators/stochastic'
import {
  detectStochasticSignalsFromStoch,
  lastStochasticSignalFromStoch,
} from '@/lib/robo-advisor/signals/stochastic-signals'
import { CHART_UP, CHART_DOWN, resolvePalette } from '@/lib/chart/theme'

interface Props {
  data: OhlcPoint[]
  height?: number
}

const MIN_DATA = 17  // kPeriod(14) + dPeriod(3)

export function StochasticPanel({ data, height = 120 }: Props) {
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
  const kSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const dSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
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

    // %K 실선
    const kSeries = chart.addSeries(LineSeries, {
      color: '#f97316',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })

    // %D 점선
    const dSeries = chart.addSeries(LineSeries, {
      color: '#a78bfa',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })

    // 과매수 80, 과매도 20 기준선
    kSeries.createPriceLine({
      price: 80,
      lineStyle: LineStyle.Dashed,
      lineWidth: 1,
      color: CHART_DOWN,
      axisLabelVisible: false,
      title: '80',
    })
    kSeries.createPriceLine({
      price: 20,
      lineStyle: LineStyle.Dashed,
      lineWidth: 1,
      color: CHART_UP,
      axisLabelVisible: false,
      title: '20',
    })

    markersRef.current = createSeriesMarkers(kSeries) as ISeriesMarkersPluginApi<Time>
    kSeriesRef.current = kSeries
    dSeriesRef.current = dSeries
    chartRef.current = chart

    const unregister = syncRef.current.registerChart(chart)

    return () => {
      unregister()
      chart.remove()
      chartRef.current = null
      kSeriesRef.current = null
      dSeriesRef.current = null
      markersRef.current = null
    }
  }, [])

  // stochastic()을 한 번만 계산해 차트 데이터와 시그널 배지 모두 재사용
  const stochResult = useMemo(
    () => {
      if (data.length < MIN_DATA) return null
      const highs  = data.map((p) => p.high)
      const lows   = data.map((p) => p.low)
      const closes = data.map((p) => p.close)
      return stochastic(highs, lows, closes)
    },
    [data],
  )

  useEffect(() => {
    const chart = chartRef.current
    const kSeries = kSeriesRef.current
    const dSeries = dSeriesRef.current
    const markers = markersRef.current
    if (!chart || !kSeries || !dSeries || !markers) return

    if (!stochResult) {
      kSeries.setData([])
      dSeries.setData([])
      markers.setMarkers([])
      return
    }

    const kData: (LineData | WhitespaceData)[] = []
    const dData: (LineData | WhitespaceData)[] = []

    for (let i = 0; i < data.length; i++) {
      const s = stochResult[i]
      const t = data[i].date as Time
      kData.push(s.k !== null ? { time: t, value: s.k } : { time: t })
      dData.push(s.d !== null ? { time: t, value: s.d } : { time: t })
    }

    kSeries.setData(kData)
    dSeries.setData(dData)

    const dates = data.map((p) => p.date)
    const events = detectStochasticSignalsFromStoch(stochResult, dates)
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
  }, [data, stochResult])

  const signalInfo = useMemo(() => {
    if (!stochResult) return null
    return lastStochasticSignalFromStoch(stochResult, data.map((p) => p.date))
  }, [data, stochResult])

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
    <div data-component="StochasticPanel">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-foreground">Stochastic (14, 3)</p>
          {!noData && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-[1.5px] bg-orange-400" />
                %K
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-[1.5px] bg-violet-400 border-dashed border-b border-violet-400" />
                %D
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
            Stochastic 계산을 위한 데이터가 부족합니다 (최소 17일 필요)
          </div>
        )}
      </div>
    </div>
  )
}
