'use client'

import { useEffect, useRef } from 'react'
import {
  createChart,
  CandlestickSeries,
  CrosshairMode,
  type IChartApi,
} from 'lightweight-charts'
import type { OhlcPoint } from '@/lib/price/sparkline'
import { CHART_UP, CHART_DOWN } from '@/lib/chart/theme'

interface MiniCandleChartProps {
  data: OhlcPoint[]
  width?: number
  height?: number
}

export function MiniCandleChart({
  data,
  width = 80,
  height = 36,
}: MiniCandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || data.length < 2) return

    const chart = createChart(container, {
      width,
      height,
      autoSize: false,
      layout: {
        background: { color: 'transparent' },
        textColor: 'transparent',
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: { visible: false },
      crosshair: { mode: CrosshairMode.Hidden },
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
      priceLineVisible: false,
      lastValueVisible: false,
    })

    series.setData(
      data.map((d) => ({
        time: d.date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      })),
    )

    chart.timeScale().fitContent()
    chartRef.current = chart

    return () => {
      chart.remove()
      chartRef.current = null
    }
  }, [data, width, height])

  if (data.length < 2) return null

  return (
    <div
      ref={containerRef}
      style={{ width, height }}
    />
  )
}
