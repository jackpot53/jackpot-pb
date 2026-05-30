'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useChartSync, CHART_RIGHT_AXIS_WIDTH, HIDDEN_TIME_SCALE } from './chart-sync'
import {
  createChart,
  HistogramSeries,
  LineStyle,
  createSeriesMarkers,
  type Time,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type WhitespaceData,
  type HistogramData,
} from 'lightweight-charts'
import type { OhlcPoint } from '@/lib/price/sparkline'
import { volumeOscillator } from '@/lib/robo-advisor/indicators/volume-oscillator'
import {
  detectVolumeOscillatorCrossesFromVo,
  lastVolumeOscillatorCrossFromVo,
} from '@/lib/robo-advisor/signals/volume-oscillator'
import { CHART_UP, CHART_DOWN, resolvePalette } from '@/lib/chart/theme'

interface Props {
  data: OhlcPoint[]
  height?: number
}

const MIN_DATA = 20

function fmtVo(v: number): string {
  return v.toFixed(1) + '%'
}

export function VolumeOscillatorPanel({ data, height = 120 }: Props) {
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
  const histSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
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
        priceFormatter: fmtVo,
      },
    })

    const histSeries = chart.addSeries(HistogramSeries, {
      priceLineVisible: false,
      lastValueVisible: false,
    })

    histSeries.createPriceLine({
      price: 0,
      lineStyle: LineStyle.Dashed,
      lineWidth: 1,
      color: palette.mutedText,
      axisLabelVisible: false,
      title: '',
    })

    markersRef.current = createSeriesMarkers(histSeries) as ISeriesMarkersPluginApi<Time>
    histSeriesRef.current = histSeries
    chartRef.current = chart

    const unregister = syncRef.current.registerChart(chart)

    return () => {
      unregister()
      chart.remove()
      chartRef.current = null
      histSeriesRef.current = null
      markersRef.current = null
    }
  }, [])

  // volumeOscillator()를 한 번만 계산해 차트 데이터와 시그널 배지 모두 재사용
  const voResult = useMemo(
    () => (data.length >= MIN_DATA
      ? volumeOscillator(data.map((p) => p.volume ?? null), 5, 20)
      : null),
    [data],
  )

  useEffect(() => {
    const chart = chartRef.current
    const histSeries = histSeriesRef.current
    const markers = markersRef.current
    if (!chart || !histSeries || !markers) return

    if (!voResult) {
      histSeries.setData([])
      markers.setMarkers([])
      return
    }

    const histData: (HistogramData | WhitespaceData)[] = []
    for (let i = 0; i < data.length; i++) {
      const v = voResult[i]
      const t = data[i].date as Time
      if (v !== null) {
        histData.push({ time: t, value: v, color: v >= 0 ? CHART_UP : CHART_DOWN })
      } else {
        // whitespace({ time }) — 캔들 차트와 논리 인덱스를 맞춤
        histData.push({ time: t })
      }
    }
    histSeries.setData(histData)

    const closes = data.map((p) => p.close)
    const dates = data.map((p) => p.date)
    const events = detectVolumeOscillatorCrossesFromVo(voResult, closes, dates)
    const crossMarkers: SeriesMarker<Time>[] = events.map((e) => ({
      time: e.date as Time,
      position: e.type === 'buy' ? ('belowBar' as const) : ('aboveBar' as const),
      shape: e.type === 'buy' ? ('arrowUp' as const) : ('arrowDown' as const),
      color: e.type === 'buy' ? CHART_UP : CHART_DOWN,
      text: e.type === 'buy' ? '매수' : '매도',
      size: 1,
    }))
    markers.setMarkers(crossMarkers)

    syncRef.current.applyRangeToChart(chart)

    const rafId = requestAnimationFrame(() => {
      const w = chart.priceScale('right').width()
      if (w > 0) syncRef.current.setMasterAxisWidth(w)
    })
    return () => cancelAnimationFrame(rafId)
  }, [data, voResult])

  const signalInfo = useMemo(() => {
    if (!voResult) return null
    const closes = data.map((p) => p.close)
    const dates = data.map((p) => p.date)
    return lastVolumeOscillatorCrossFromVo(voResult, closes, dates)
  }, [data, voResult])

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
    <div data-component="VolumeOscillatorPanel">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-foreground">거래량 오실레이터 (5, 20)</p>
          {!noData && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-2.5 rounded-sm" style={{ background: CHART_UP }} />
                팽창
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-2.5 rounded-sm" style={{ background: CHART_DOWN }} />
                수축
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
            거래량 오실레이터 계산을 위한 데이터가 부족합니다 (최소 20일 필요)
          </div>
        )}
      </div>
    </div>
  )
}
