'use client'

import {
  createChart,
  ColorType,
  LineStyle,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type Time,
} from 'lightweight-charts'
import { useEffect, useRef, useState } from 'react'

export type ChartData = {
  candles: {
    time: string
    open: number
    high: number
    low: number
    close: number
    volume: number | null
  }[]
  sma5: { time: string; value: number }[]
  sma20: { time: string; value: number }[]
  bollinger: { time: string; upper: number; mid: number; lower: number }[]
  rsi: { time: string; value: number }[]
  macd: { time: string; macd: number; signal: number; hist: number }[]
}

type Toggles = {
  sma5: boolean
  sma20: boolean
  bollinger: boolean
  volume: boolean
}

export function RoboAdvisorAnalysisChart({
  data,
  height = 450,
}: {
  data: ChartData
  height?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
  const [toggles, setToggles] = useState<Toggles>({
    sma5: true,
    sma20: true,
    bollinger: false,
    volume: true,
  })

  useEffect(() => {
    if (!containerRef.current) return

    const width = containerRef.current.clientWidth || 800
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#333333',
      },
      width,
      height,
    })

    const candlesSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#ef4444',
      downColor: '#3b82f6',
      borderUpColor: '#ef4444',
      borderDownColor: '#3b82f6',
      wickUpColor: '#ef4444',
      wickDownColor: '#3b82f6',
    })

    const candleData = data.candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))

    candlesSeries.setData(candleData)

    if (toggles.volume && data.candles.length > 0) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#9ca3af',
        priceScaleId: 'volume',
      })

      const volumeData = data.candles
        .filter((c) => c.volume !== null)
        .map((c) => ({
          time: c.time as Time,
          value: c.volume!,
          color: c.close >= c.open ? '#ef4444' : '#3b82f6',
        }))

      volumeSeries.setData(volumeData)
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      })
    }

    if (toggles.sma5 && data.sma5.length > 0) {
      const sma5Series = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 2,
      })
      sma5Series.setData(data.sma5.map((p) => ({ time: p.time as Time, value: p.value })))
    }

    if (toggles.sma20 && data.sma20.length > 0) {
      const sma20Series = chart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
      })
      sma20Series.setData(data.sma20.map((p) => ({ time: p.time as Time, value: p.value })))
    }

    if (toggles.bollinger && data.bollinger.length > 0) {
      const bbUpperSeries = chart.addSeries(LineSeries, {
        color: '#d1d5db',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
      })
      const bbMidSeries = chart.addSeries(LineSeries, {
        color: '#9ca3af',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
      })
      const bbLowerSeries = chart.addSeries(LineSeries, {
        color: '#d1d5db',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
      })

      bbUpperSeries.setData(data.bollinger.map((b) => ({ time: b.time as Time, value: b.upper })))
      bbMidSeries.setData(data.bollinger.map((b) => ({ time: b.time as Time, value: b.mid })))
      bbLowerSeries.setData(data.bollinger.map((b) => ({ time: b.time as Time, value: b.lower })))
    }

    chart.timeScale().fitContent()

    chartRef.current = chart

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [data, toggles, height])

  const toggleIndicator = (key: keyof Toggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const indicators: { key: keyof Toggles; label: string; activeClass: string }[] = [
    { key: 'sma5', label: 'SMA5', activeClass: 'bg-amber-500 text-white shadow-sm' },
    { key: 'sma20', label: 'SMA20', activeClass: 'bg-blue-500 text-white shadow-sm' },
    { key: 'bollinger', label: '볼린저', activeClass: 'bg-foreground text-background shadow-sm' },
    { key: 'volume', label: '거래량', activeClass: 'bg-muted-foreground text-background shadow-sm' },
  ]

  return (
    <div className='w-full space-y-3'>
      <div className='flex flex-wrap gap-1.5'>
        {indicators.map(({ key, label, activeClass }) => (
          <button
            key={key}
            onClick={() => toggleIndicator(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              toggles[key]
                ? activeClass
                : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground border border-border'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        ref={containerRef}
        className='w-full rounded-lg border border-border bg-card overflow-hidden'
        style={{ height: `${height}px` }}
      />
    </div>
  )
}
