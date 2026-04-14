'use client'
import { useRef, useEffect, useCallback, useState } from 'react'
import * as d3 from 'd3'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { InsufficientDataMessage } from '@/components/app/annual-return-chart'
import type { SnapshotRow } from '@/db/queries/portfolio-snapshots'
import type { GoalRow } from '@/db/queries/goals'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4']
const ML = 48
const MR = 36
const MT = 16
const MB = 36
const CHART_H = 260

type Period = 'daily' | 'monthly' | 'yearly'

const PERIOD_LABELS: Record<Period, string> = { daily: '일별', monthly: '월별', yearly: '년도별' }

// ── Aggregation ───────────────────────────────────────────────────────────────
// Snapshots are already ordered ascending; last-in-group wins → end-of-period value.
function aggregate(snapshots: SnapshotRow[], period: Period): SnapshotRow[] {
  if (period === 'daily') return snapshots
  const key = (s: SnapshotRow) =>
    period === 'monthly' ? s.snapshotDate.slice(0, 7) : s.snapshotDate.slice(0, 4)
  const map = new Map<string, SnapshotRow>()
  for (const s of snapshots) map.set(key(s), s)
  return Array.from(map.values())
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

// ── Types ─────────────────────────────────────────────────────────────────────
interface TooltipState {
  x: number
  y: number
  date: string
  items: { name: string; pct: number; color: string }[]
}

interface GoalAchievementChartProps {
  snapshots: SnapshotRow[]
  goals: GoalRow[]
}

// ── Component ─────────────────────────────────────────────────────────────────
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

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', W).attr('height', totalH)

    const rows = aggregate(snapshots, period).map(s => ({
      date: s.snapshotDate,
      pcts: goals.map(g => (s.totalValueKrw / g.targetAmountKrw) * 100),
    }))

    const dates = rows.map(r => r.date)
    const allPcts = rows.flatMap(r => r.pcts)
    const maxPct = Math.max(...allPcts, 100) * 1.08

    const xScale = d3.scalePoint<string>()
      .domain(dates)
      .range([0, chartW])
      .padding(0.1)

    const yScale = d3.scaleLinear()
      .domain([0, maxPct])
      .range([CHART_H, 0])
      .nice()

    const chart = svg.append('g').attr('transform', `translate(${ML},${MT})`)

    // Y axis + horizontal grid
    chart.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(v => `${Number(v).toFixed(0)}%`))
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

    // 100% reference line
    const y100 = yScale(100)
    chart.append('line')
      .attr('x1', 0).attr('x2', chartW)
      .attr('y1', y100).attr('y2', y100)
      .style('stroke', '#10B981')
      .style('stroke-width', '1.5')
      .style('stroke-dasharray', '5,3')
      .style('opacity', '0.7')

    chart.append('text')
      .attr('x', chartW + 4)
      .attr('y', y100)
      .attr('dominant-baseline', 'middle')
      .style('font-size', '10px')
      .style('fill', '#10B981')
      .text('달성')

    // X axis
    const maxTicks = period === 'yearly' ? dates.length : 8
    const step = Math.ceil(dates.length / maxTicks)
    const xTicks = dates.filter((_, i) => i % step === 0 || i === dates.length - 1)

    chart.append('g')
      .attr('transform', `translate(0,${CHART_H})`)
      .call(
        d3.axisBottom(xScale)
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

    // Lines + dots per goal
    goals.forEach((goal, gi) => {
      const color = COLORS[gi % COLORS.length]
      const lineData = rows.map(r => ({ date: r.date, pct: r.pcts[gi] }))

      const lineFn = d3.line<{ date: string; pct: number }>()
        .x(d => xScale(d.date) ?? 0)
        .y(d => yScale(Math.min(d.pct, maxPct)))
        .curve(d3.curveMonotoneX)

      chart.append('path')
        .datum(lineData)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('d', lineFn)

      if (dates.length <= 40) {
        chart.selectAll(null)
          .data(lineData)
          .join('circle')
          .attr('cx', d => xScale(d.date) ?? 0)
          .attr('cy', d => yScale(Math.min(d.pct, maxPct)))
          .attr('r', 3)
          .attr('fill', color)
          .attr('stroke', 'var(--background)')
          .attr('stroke-width', 1.5)
      }
    })

    // Hover overlay
    chart.append('rect')
      .attr('width', chartW)
      .attr('height', CHART_H)
      .style('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', (event: MouseEvent) => {
        const [mx] = d3.pointer(event)
        let nearestIdx = 0
        let minDist = Infinity
        dates.forEach((date, i) => {
          const dist = Math.abs((xScale(date) ?? 0) - mx)
          if (dist < minDist) { minDist = dist; nearestIdx = i }
        })
        const row = rows[nearestIdx]
        const rect = wrapRef.current!.getBoundingClientRect()
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          date: row.date,
          items: goals.map((g, gi) => ({
            name: g.name,
            pct: row.pcts[gi],
            color: COLORS[gi % COLORS.length],
          })),
        })
      })
      .on('mouseleave', () => setTooltip(null))
  }, [snapshots, goals, period])

  useEffect(() => {
    draw()
    const ro = new ResizeObserver(() => requestAnimationFrame(draw))
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [draw])

  const insufficient = snapshots.length < 2 || goals.length === 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle>날짜별 달성률</CardTitle>
        {/* Period toggle */}
        <div className="flex rounded-md border divide-x overflow-hidden text-xs">
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
      <CardContent>
        {insufficient ? (
          <InsufficientDataMessage count={snapshots.length} />
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
                  className="absolute z-10 pointer-events-none bg-card border border-border rounded-md px-3 py-2 shadow-lg text-sm space-y-1"
                  style={{ left: tooltip.x + 14, top: tooltip.y - 80 }}
                >
                  <p className="text-xs text-muted-foreground mb-1">{tooltip.date}</p>
                  {tooltip.items.map(item => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                      <span className="text-foreground">{item.name}</span>
                      <span
                        className="ml-auto font-mono font-semibold tabular-nums"
                        style={{ color: item.color }}
                      >
                        {Math.min(item.pct, 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
