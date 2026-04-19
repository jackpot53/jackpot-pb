'use client'
import { useRef, useEffect, useCallback, useState } from 'react'
import { scaleBand, scaleLinear } from 'd3-scale'
import { select } from 'd3-selection'
import { axisBottom, axisLeft } from 'd3-axis'
import { CandlestickChart } from 'lucide-react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import type { SnapshotRow } from '@/db/queries/portfolio-snapshots'
import type { GoalRow } from '@/db/queries/goals'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4']
const ML = 64
const MR = 80
const MT = 16
const MB = 36
const CHART_H = 260

type Period = 'daily' | 'monthly' | 'yearly'
const PERIOD_LABELS: Record<Period, string> = { daily: '일별', monthly: '월별', yearly: '년도별' }

interface CandleData {
  date: string
  open: number
  high: number
  low: number
  close: number
}

function aggregateCandles(snapshots: SnapshotRow[], period: Period): CandleData[] {
  if (period === 'daily') {
    return snapshots.map(s => ({
      date: s.snapshotDate,
      open: s.totalValueKrw,
      high: s.totalValueKrw,
      low: s.totalValueKrw,
      close: s.totalValueKrw,
    }))
  }
  const key = (s: SnapshotRow) =>
    period === 'monthly' ? s.snapshotDate.slice(0, 7) : s.snapshotDate.slice(0, 4)
  const groups = new Map<string, SnapshotRow[]>()
  for (const s of snapshots) {
    const k = key(s)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(s)
  }
  return Array.from(groups.entries()).map(([, rows]) => ({
    date: rows[rows.length - 1].snapshotDate,
    open: rows[0].totalValueKrw,
    high: Math.max(...rows.map(r => r.totalValueKrw)),
    low: Math.min(...rows.map(r => r.totalValueKrw)),
    close: rows[rows.length - 1].totalValueKrw,
  }))
}

function tickLabel(date: string, period: Period): string {
  if (period === 'yearly') return date.slice(0, 4)
  if (period === 'monthly') {
    const [yyyy, mm] = date.split('-')
    return `${yyyy.slice(2)}.${mm}`
  }
  const [, mm, dd] = date.split('-')
  return `${mm}.${dd}`
}

function formatKrwShort(v: number): string {
  if (Math.abs(v) >= 1e8) return `${(v / 1e8).toFixed(1)}억`
  if (Math.abs(v) >= 1e4) return `${(v / 1e4).toFixed(0)}만`
  return String(v)
}

interface TooltipState {
  x: number
  y: number
  candle: CandleData
}

interface GoalAchievementChartProps {
  snapshots: SnapshotRow[]
  goals: GoalRow[]
}

export function GoalAchievementChart({ snapshots, goals }: GoalAchievementChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [period, setPeriod] = useState<Period>('daily')
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const draw = useCallback(() => {
    if (!svgRef.current || !wrapRef.current) return
    const W = wrapRef.current.clientWidth
    if (W === 0) return

    const chartW = Math.max(W - ML - MR, 60)
    const totalH = CHART_H + MT + MB

    const svg = select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', W).attr('height', totalH)

    const candles = aggregateCandles(snapshots, period)
    if (candles.length === 0) return

    const allValues = candles.flatMap(c => [c.high, c.low])
    const goalValues = goals.map(g => g.targetAmountKrw)
    const allMax = Math.max(...allValues, ...goalValues)
    const allMin = Math.min(...allValues, ...goalValues)
    const pad = (allMax - allMin) * 0.08

    const yScale = scaleLinear()
      .domain([Math.max(0, allMin - pad), allMax + pad])
      .range([CHART_H, 0])
      .nice()

    const xScale = scaleBand()
      .domain(candles.map(c => c.date))
      .range([0, chartW])
      .padding(0.3)

    const chart = svg.append('g').attr('transform', `translate(${ML},${MT})`)

    // Y axis + grid
    chart.append('g')
      .call(axisLeft(yScale).ticks(5).tickFormat(v => formatKrwShort(Number(v))))
      .call(g => g.select('.domain').remove())
      .call(g => {
        g.selectAll('.tick line')
          .clone()
          .attr('x2', chartW)
          .style('stroke', 'var(--border)')
          .style('stroke-dasharray', '3,3')
          .style('opacity', '0.5')
        g.selectAll('.tick text')
          .style('font-size', '11px')
          .style('fill', 'var(--muted-foreground)')
      })

    // Goal target lines
    goals.forEach((goal, gi) => {
      const color = COLORS[gi % COLORS.length]
      const y = yScale(goal.targetAmountKrw)
      chart.append('line')
        .attr('x1', 0).attr('x2', chartW)
        .attr('y1', y).attr('y2', y)
        .style('stroke', color)
        .style('stroke-width', 1.5)
        .style('stroke-dasharray', '5,3')
        .style('opacity', '0.8')
      chart.append('text')
        .attr('x', chartW + 6)
        .attr('y', y)
        .attr('dominant-baseline', 'middle')
        .style('font-size', '10px')
        .style('fill', color)
        .text(goal.name)
    })

    // X axis
    const maxTicks = 8
    const step = Math.ceil(candles.length / maxTicks)
    const xTicks = candles.map(c => c.date).filter((_, i) => i % step === 0 || i === candles.length - 1)

    chart.append('g')
      .attr('transform', `translate(0,${CHART_H})`)
      .call(
        axisBottom(xScale)
          .tickValues(xTicks)
          .tickFormat(d => tickLabel(String(d), period))
      )
      .call(g => g.select('.domain').remove())
      .call(g => {
        g.selectAll('.tick line').remove()
        g.selectAll('.tick text')
          .style('font-size', '10px')
          .style('fill', 'var(--muted-foreground)')
      })

    // Candles
    const candleW = xScale.bandwidth()
    candles.forEach(c => {
      const x = xScale(c.date) ?? 0
      const cx = x + candleW / 2
      const isUp = c.close >= c.open
      const color = isUp ? '#10B981' : '#EF4444'
      const bodyTop = yScale(Math.max(c.open, c.close))
      const bodyBot = yScale(Math.min(c.open, c.close))
      const bodyH = Math.max(bodyBot - bodyTop, 1.5)

      // Wick
      chart.append('line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', yScale(c.high)).attr('y2', yScale(c.low))
        .style('stroke', color)
        .style('stroke-width', 1.5)

      // Body
      chart.append('rect')
        .attr('x', x)
        .attr('y', bodyTop)
        .attr('width', candleW)
        .attr('height', bodyH)
        .attr('fill', color)
        .attr('opacity', 0.85)
    })

    // Hover overlay per candle
    candles.forEach(c => {
      const x = xScale(c.date) ?? 0
      chart.append('rect')
        .attr('x', x)
        .attr('y', 0)
        .attr('width', candleW)
        .attr('height', CHART_H)
        .style('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('mouseenter', (event: MouseEvent) => {
          const rect = wrapRef.current!.getBoundingClientRect()
          setTooltip({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            candle: c,
          })
        })
        .on('mouseleave', () => setTooltip(null))
    })
  }, [snapshots, goals, period])

  useEffect(() => {
    draw()
    const ro = new ResizeObserver(() => requestAnimationFrame(draw))
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [draw])

  const insufficient = snapshots.length < 2 || goals.length === 0

  return (
    <Card data-component="GoalAchievementChart" className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-1">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CandlestickChart className="h-4 w-4" />날짜별 달성률
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">자산 추이와 목표 달성선을 캔들 차트로 비교합니다</p>
        </div>
        <div
          className="flex rounded-md border divide-x overflow-hidden text-xs"
        >
          {(['daily', 'monthly', 'yearly'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 transition-colors ${
                period === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="flex flex-col justify-center">
        {insufficient ? (
          <div className="space-y-3 py-2">
            {/* 범례 스켈레톤 */}
            <div className="flex gap-4 mb-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Skeleton className="w-5 h-0.5 rounded-full" />
                  <Skeleton className="h-3 w-12 rounded" />
                </div>
              ))}
            </div>
            {/* Y축 + 캔들 스켈레톤 */}
            <div className="flex gap-3 items-end" style={{ height: 260 }}>
              <div className="flex flex-col justify-between h-full py-1 shrink-0">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-3 w-10 rounded" style={{ opacity: 0.5 - i * 0.05 }} />
                ))}
              </div>
              <div className="flex-1 flex items-end justify-around h-full pb-6 gap-1">
                {[...Array(12)].map((_, i) => {
                  const h = 40 + Math.sin(i * 0.8) * 30 + i * 8
                  return (
                    <Skeleton
                      key={i}
                      className="flex-1 rounded-sm"
                      style={{ height: Math.min(h, 200), opacity: 0.4 + (i % 3) * 0.15 }}
                    />
                  )
                })}
              </div>
            </div>
            {/* X축 스켈레톤 */}
            <div className="flex justify-around pl-14">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-3 w-8 rounded" style={{ opacity: 0.4 }} />
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground pt-1">
              스냅샷이 쌓이면 차트가 표시됩니다
            </p>
          </div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-4">
              {goals.map((g, i) => (
                <div key={g.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="inline-block w-5 h-0.5 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  {g.name}
                </div>
              ))}
            </div>
            <div ref={wrapRef} className="relative w-full select-none">
              <svg ref={svgRef} style={{ display: 'block', overflow: 'visible' }} height={CHART_H + MT + MB} />
              {tooltip && (
                <div
                  className="absolute z-10 pointer-events-none bg-card border border-border rounded-md px-3 py-2 shadow-lg text-sm"
                  style={{ left: tooltip.x + 14, top: Math.max(0, tooltip.y - 90) }}
                >
                  <p className="text-xs text-muted-foreground mb-2">{tooltip.candle.date}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs font-mono">
                    <span className="text-muted-foreground">시가</span>
                    <span className="text-right">{formatKrwShort(tooltip.candle.open)}</span>
                    <span className="text-muted-foreground">고가</span>
                    <span className="text-right text-emerald-400">{formatKrwShort(tooltip.candle.high)}</span>
                    <span className="text-muted-foreground">저가</span>
                    <span className="text-right text-red-400">{formatKrwShort(tooltip.candle.low)}</span>
                    <span className="text-muted-foreground">종가</span>
                    <span className="text-right">{formatKrwShort(tooltip.candle.close)}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
