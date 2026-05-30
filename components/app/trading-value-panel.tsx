'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
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
import { tradingValue, avgTradingValue } from '@/lib/robo-advisor/indicators/trading-value'
import {
  detectTradingValueFlows,
  lastTradingValueFlowFromEvents,
  cumulativeValueFlow,
  cumulativeValueFlowRolling,
} from '@/lib/robo-advisor/signals/trading-value-flow'
import { CHART_UP, CHART_DOWN, resolvePalette } from '@/lib/chart/theme'

interface Props {
  data: OhlcPoint[]
  height?: number
}

function fmtKrw(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000_000_000) return `${sign}${(abs / 1_000_000_000_000).toFixed(1)}조`
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)}억`
  if (abs >= 10_000) return `${sign}${(abs / 10_000).toFixed(0)}만`
  return v.toLocaleString('ko-KR')
}

export function TradingValuePanel({ data, height = 180 }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const histSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const avgSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const flowSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const flowRollingSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
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
      rightPriceScale: { visible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: false,
      },
      localization: {
        priceFormatter: fmtKrw,
      },
      handleScroll: false,
      handleScale: false,
    })

    // 히스토그램 + 20일 평균: 상단 65%
    const histSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: 'tv',
      priceLineVisible: false,
      lastValueVisible: false,
    })

    const avgSeries = chart.addSeries(LineSeries, {
      priceScaleId: 'tv',
      color: '#f59e0b',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })

    chart.priceScale('tv').applyOptions({
      scaleMargins: { top: 0.05, bottom: 0.38 },
      borderVisible: false,
    })

    // 누적 자금 흐름 선: 하단 35%
    const flowSeries = chart.addSeries(LineSeries, {
      priceScaleId: 'flow',
      color: '#8b5cf6',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })

    const flowRollingSeries = chart.addSeries(LineSeries, {
      priceScaleId: 'flow',
      color: '#06b6d4',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })

    chart.priceScale('flow').applyOptions({
      scaleMargins: { top: 0.68, bottom: 0.05 },
      borderVisible: false,
    })

    markersRef.current = createSeriesMarkers(histSeries) as ISeriesMarkersPluginApi<Time>
    histSeriesRef.current = histSeries
    avgSeriesRef.current = avgSeries
    flowSeriesRef.current = flowSeries
    flowRollingSeriesRef.current = flowRollingSeries
    chartRef.current = chart

    return () => {
      chart.remove()
      chartRef.current = null
      histSeriesRef.current = null
      avgSeriesRef.current = null
      flowSeriesRef.current = null
      flowRollingSeriesRef.current = null
      markersRef.current = null
    }
  }, [])

  // detectTradingValueFlows()를 한 번만 계산해 차트 마커와 시그널 배지 모두 재사용
  const flowEvents = useMemo(
    () => (data.length >= 22 ? detectTradingValueFlows(data) : []),
    [data],
  )

  useEffect(() => {
    const chart = chartRef.current
    const histSeries = histSeriesRef.current
    const avgSeries = avgSeriesRef.current
    const flowLine = flowSeriesRef.current
    const flowRollingLine = flowRollingSeriesRef.current
    const markers = markersRef.current
    if (!chart || !histSeries || !avgSeries || !flowLine || !flowRollingLine || !markers) return

    if (data.length < 22) {
      histSeries.setData([])
      avgSeries.setData([])
      flowLine.setData([])
      flowRollingLine.setData([])
      markers.setMarkers([])
      return
    }

    const closes = data.map((p) => p.close)
    const volumes = data.map((p) => p.volume ?? null)
    const tvs = tradingValue(closes, volumes)
    const avgTVs = avgTradingValue(tvs, 20)

    const histData: { time: Time; value: number; color: string }[] = []
    const avgData: { time: Time; value: number }[] = []

    for (let i = 0; i < data.length; i++) {
      const tv = tvs[i]
      const t = data[i].date as Time
      if (tv !== null) {
        histData.push({
          time: t,
          value: tv,
          color: data[i].close >= data[i].open ? CHART_UP : CHART_DOWN,
        })
      }
      const avg = avgTVs[i]
      if (avg !== null) {
        avgData.push({ time: t, value: avg })
      }
    }

    histSeries.setData(histData)
    avgSeries.setData(avgData)

    const cFlow = cumulativeValueFlow(data)
    const cFlowRolling = cumulativeValueFlowRolling(data)

    const flowData: { time: Time; value: number }[] = []
    const flowRollingData: { time: Time; value: number }[] = []

    for (let i = 0; i < data.length; i++) {
      const t = data[i].date as Time
      const f = cFlow[i]
      const fr = cFlowRolling[i]
      if (f !== null) flowData.push({ time: t, value: f })
      if (fr !== null) flowRollingData.push({ time: t, value: fr })
    }

    flowLine.setData(flowData)
    flowRollingLine.setData(flowRollingData)

    const signalMarkers: SeriesMarker<Time>[] = flowEvents.map((e) => ({
      time: e.date as Time,
      position: e.type === 'buy' ? ('belowBar' as const) : ('aboveBar' as const),
      shape: e.type === 'buy' ? ('arrowUp' as const) : ('arrowDown' as const),
      color: e.type === 'buy' ? CHART_UP : CHART_DOWN,
      text: e.type === 'buy' ? 'B' : 'S',
      size: 1,
    }))
    markers.setMarkers(signalMarkers)

    chart.timeScale().fitContent()
  }, [data, flowEvents])

  const signalInfo = useMemo(
    () => lastTradingValueFlowFromEvents(flowEvents, data),
    [flowEvents, data],
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
    <div data-component="TradingValuePanel" className="rounded-xl border border-border bg-card p-3">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center justify-between w-full px-1"
      >
        <div className="flex items-center gap-2">
          <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
          <p className="text-xs font-medium text-foreground">거래대금</p>
          {isOpen && !noData && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-[1.5px] bg-amber-500 border-dashed border-b border-amber-500" />
                20일 평균
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-[1.5px] bg-violet-500" />
                전체 누적
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-[1.5px] bg-cyan-500 border-dashed border-b border-cyan-500" />
                60일 누적
              </span>
            </div>
          )}
        </div>
        {!noData && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
            {badgeText}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="mt-2 relative" style={{ height: `${height}px` }}>
          <div ref={containerRef} className="w-full h-full rounded-md overflow-hidden" />
          {noData && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              거래대금 데이터가 부족합니다 (최소 22일 필요)
            </div>
          )}
        </div>
      )}
    </div>
  )
}
