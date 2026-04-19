'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createChart,
  LineSeries,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type MouseEventParams,
} from 'lightweight-charts'
import { Card } from '@/components/ui/card'
import { resolvePalette } from '@/lib/chart/theme'

interface DateRange {
  startDate: string
  endDate: string
}

const ROBOT_NAMES = ['Balanced', 'Growth', 'Conservative'] as const
const ROBOT_COLORS: Record<(typeof ROBOT_NAMES)[number], string> = {
  Balanced: '#6366f1',
  Growth: '#ec4899',
  Conservative: '#f59e0b',
}
const CHART_HEIGHT = 320

interface RobotPoint {
  date: string
  value: number
}

interface TooltipState {
  x: number
  y: number
  date: string
  values: Partial<Record<(typeof ROBOT_NAMES)[number], number>>
}

export function PaperTradingChart({ dateRange }: { dateRange: DateRange }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesMapRef = useRef<Record<string, ISeriesApi<'Line'>>>({})
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // TODO: DB에서 실제 데이터 조회 및 dateRange로 필터링
  const chartData = useMemo<Record<(typeof ROBOT_NAMES)[number], RobotPoint[]>>(
    () => ({
      Balanced: [
        { date: '2024-01-01', value: 100_000_000 },
        { date: '2024-02-01', value: 105_000_000 },
        { date: '2024-03-01', value: 103_000_000 },
        { date: '2024-04-01', value: 108_000_000 },
        { date: '2024-05-01', value: 107_000_000 },
      ],
      Growth: [
        { date: '2024-01-01', value: 100_000_000 },
        { date: '2024-02-01', value: 110_000_000 },
        { date: '2024-03-01', value: 108_000_000 },
        { date: '2024-04-01', value: 115_000_000 },
        { date: '2024-05-01', value: 112_000_000 },
      ],
      Conservative: [
        { date: '2024-01-01', value: 100_000_000 },
        { date: '2024-02-01', value: 102_000_000 },
        { date: '2024-03-01', value: 103_500_000 },
        { date: '2024-04-01', value: 105_000_000 },
        { date: '2024-05-01', value: 104_200_000 },
      ],
    }),
    [],
  )

  // dateRange 프리필터 적용 지점
  void dateRange

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const palette = resolvePalette(container)

    const chart = createChart(container, {
      autoSize: true,
      height: CHART_HEIGHT,
      layout: {
        background: { color: 'transparent' },
        textColor: palette.mutedText,
        attributionLogo: false,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: palette.grid, style: 2 },
        horzLines: { color: palette.grid, style: 2 },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: palette.mutedText, width: 1, style: 3 },
        horzLine: { color: palette.mutedText, width: 1, style: 3 },
      },
      localization: {
        priceFormatter: (v: number) => `₩${(v / 1_000_000).toFixed(0)}M`,
      },
      handleScroll: false,
      handleScale: false,
    })

    const seriesMap: Record<string, ISeriesApi<'Line'>> = {}
    for (const robot of ROBOT_NAMES) {
      const s = chart.addSeries(LineSeries, {
        color: ROBOT_COLORS[robot],
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
      })
      s.setData(chartData[robot].map((p) => ({ time: p.date as unknown as Time, value: p.value })))
      seriesMap[robot] = s
    }
    chart.timeScale().fitContent()

    chartRef.current = chart
    seriesMapRef.current = seriesMap

    setContainerWidth(container.clientWidth)
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidth(Math.floor(entry.contentRect.width))
    })
    ro.observe(container)

    const onMove = (param: MouseEventParams<Time>) => {
      if (!param.time || !param.point) {
        setTooltip(null)
        return
      }
      const values: TooltipState['values'] = {}
      for (const robot of ROBOT_NAMES) {
        const entry = param.seriesData.get(seriesMap[robot]) as { value: number } | undefined
        if (entry) values[robot] = entry.value
      }
      setTooltip({
        x: param.point.x,
        y: param.point.y,
        date: timeToIso(param.time),
        values,
      })
    }
    chart.subscribeCrosshairMove(onMove)

    return () => {
      ro.disconnect()
      chart.unsubscribeCrosshairMove(onMove)
      chart.remove()
      chartRef.current = null
      seriesMapRef.current = {}
    }
  }, [chartData])

  return (
    <Card data-component="PaperTradingChart" className="p-4">
      <h2 className="text-lg font-semibold mb-4">누적 수익 추이</h2>

      <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
        {ROBOT_NAMES.map((r) => (
          <div key={r} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-[2px] rounded"
              style={{ backgroundColor: ROBOT_COLORS[r] }}
            />
            <span className="text-muted-foreground">{r}</span>
          </div>
        ))}
      </div>

      <div className="relative" style={{ height: CHART_HEIGHT }}>
        <div ref={containerRef} className="w-full h-full" />
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-border bg-popover text-popover-foreground px-2.5 py-1.5 shadow text-[11px] min-w-[140px]"
            style={{
              left: Math.min(tooltip.x + 12, Math.max(0, containerWidth - 160)),
              top: Math.max(4, tooltip.y - 60),
            }}
          >
            <p className="text-muted-foreground mb-1">{tooltip.date}</p>
            {ROBOT_NAMES.map((r) => (
              <div key={r} className="flex items-center justify-between gap-3 tabular-nums">
                <span style={{ color: ROBOT_COLORS[r] }}>{r}</span>
                <span>
                  {tooltip.values[r] !== undefined
                    ? `₩${tooltip.values[r]!.toLocaleString('ko-KR')}`
                    : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

function timeToIso(time: Time): string {
  if (typeof time === 'string') return time
  if (typeof time === 'number') return new Date(time * 1000).toISOString().slice(0, 10)
  const t = time as { year: number; month: number; day: number }
  return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`
}
