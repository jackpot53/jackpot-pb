'use client'
import { useRef, useEffect, useCallback, useState } from 'react'
import { scaleLinear } from 'd3-scale'
import { select } from 'd3-selection'
import { easeCubicOut } from 'd3-ease'
import 'd3-transition'
import { Skeleton } from '@/components/ui/skeleton'
import type { GoalRow } from '@/db/queries/goals'
import { formatKrw } from '@/lib/portfolio'
import { formatKrwCompact } from '@/lib/snapshot/formatters'

interface GoalProgressD3Props {
  goals: GoalRow[]
  currentValueKrw: number
}

const ML = 128  // left margin: goal name labels
const MR = 88   // right margin: target amount labels
const MT = 26   // top margin: current value label
const MB = 8    // bottom margin
const ROW_H = 48
const BAR_H = 22

interface TooltipState {
  x: number
  y: number
  goal: GoalRow
}

export function GoalProgressD3({ goals, currentValueKrw }: GoalProgressD3Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const draw = useCallback(() => {
    if (!svgRef.current || !wrapRef.current) return
    const W = wrapRef.current.clientWidth
    if (W === 0) return

    const chartW = Math.max(W - ML - MR, 80)
    const H = goals.length * ROW_H + MT + MB

    const svg = select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', W).attr('height', H)

    if (goals.length === 0) return

    const maxTarget = Math.max(...goals.map(g => g.targetAmountKrw))
    const maxVal = Math.max(maxTarget, currentValueKrw) * 1.06

    const xScale = scaleLinear().domain([0, maxVal]).range([0, chartW])

    const chart = svg.append('g').attr('transform', `translate(${ML},${MT})`)

    goals.forEach((goal, i) => {
      const yCenter = i * ROW_H + ROW_H / 2
      const barY = yCenter - BAR_H / 2
      const clampedCurrent = Math.min(currentValueKrw, goal.targetAmountKrw)
      const rawPct = currentValueKrw > 0 ? (currentValueKrw / goal.targetAmountKrw) * 100 : 0
      const pct = Math.min(rawPct, 100)
      const achieved = currentValueKrw >= goal.targetAmountKrw
      const fillColor = achieved ? '#10B981' : '#3B82F6'
      const fillW = xScale(clampedCurrent)
      const trackW = xScale(goal.targetAmountKrw)

      // Goal name label (left margin)
      svg.append('text')
        .attr('x', ML - 10)
        .attr('y', MT + yCenter)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '13px')
        .style('fill', 'var(--foreground)')
        .text(goal.name.length > 9 ? goal.name.slice(0, 9) + '…' : goal.name)

      // Track background (0 → target)
      chart.append('rect')
        .attr('x', 0)
        .attr('y', barY)
        .attr('width', trackW)
        .attr('height', BAR_H)
        .attr('rx', 6)
        .style('fill', 'var(--muted)')
        .style('opacity', 0.4)

      // Progress fill (animated, 0 → current, capped at target)
      chart.append('rect')
        .attr('x', 0)
        .attr('y', barY)
        .attr('width', 0)
        .attr('height', BAR_H)
        .attr('rx', 6)
        .style('fill', fillColor)
        .style('opacity', 0.85)
        .transition()
        .duration(900)
        .ease(easeCubicOut)
        .attr('width', fillW)

      // Percentage label
      if (fillW > 44) {
        // Inside bar
        chart.append('text')
          .attr('x', fillW / 2)
          .attr('y', yCenter)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .style('font-size', '12px')
          .style('font-weight', '600')
          .style('fill', 'white')
          .style('pointer-events', 'none')
          .attr('opacity', 0)
          .text(`${pct.toFixed(1)}%`)
          .transition()
          .delay(600)
          .duration(300)
          .attr('opacity', 1)
      } else if (fillW > 0) {
        // Right of bar
        chart.append('text')
          .attr('x', fillW + 6)
          .attr('y', yCenter)
          .attr('dominant-baseline', 'middle')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', fillColor)
          .style('pointer-events', 'none')
          .attr('opacity', 0)
          .text(`${pct.toFixed(1)}%`)
          .transition()
          .delay(600)
          .duration(300)
          .attr('opacity', 1)
      }

      // Target amount label (right margin)
      chart.append('text')
        .attr('x', chartW + 8)
        .attr('y', yCenter)
        .attr('dominant-baseline', 'middle')
        .style('font-size', '11px')
        .style('fill', 'var(--muted-foreground)')
        .text(formatKrwCompact(goal.targetAmountKrw))

      // Invisible hover hit-area over the track
      chart.append('rect')
        .attr('x', 0)
        .attr('y', barY - 8)
        .attr('width', trackW)
        .attr('height', BAR_H + 16)
        .style('fill', 'transparent')
        .style('cursor', 'pointer')
        .on('mouseenter', (event: MouseEvent) => {
          const rect = wrapRef.current!.getBoundingClientRect()
          setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, goal })
        })
        .on('mousemove', (event: MouseEvent) => {
          const rect = wrapRef.current!.getBoundingClientRect()
          setTooltip(prev => prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : null)
        })
        .on('mouseleave', () => setTooltip(null))
    })

    // Current value vertical dashed line (amber)
    if (currentValueKrw > 0) {
      const cx = xScale(Math.min(currentValueKrw, maxVal))

      chart.append('line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', -MT + 4)
        .attr('y2', goals.length * ROW_H)
        .style('stroke', '#F59E0B')
        .style('stroke-width', '2')
        .style('stroke-dasharray', '5,3')

      // Label above line
      chart.append('text')
        .attr('x', cx)
        .attr('y', -MT + 0)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'auto')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', '#F59E0B')
        .text(`현재 ${formatKrwCompact(currentValueKrw)}`)
    }
  }, [goals, currentValueKrw])

  useEffect(() => {
    draw()
    const ro = new ResizeObserver(() => { requestAnimationFrame(draw) })
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [draw])

  if (goals.length === 0) {
    return (
      <div data-component="GoalProgressD3" className="w-full space-y-4 py-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 shrink-0 rounded" style={{ width: 80, opacity: 1 - i * 0.2 }} />
            <Skeleton className="h-[22px] flex-1 rounded-md" style={{ opacity: 1 - i * 0.25 }} />
            <Skeleton className="h-4 shrink-0 rounded" style={{ width: 56, opacity: 1 - i * 0.2 }} />
          </div>
        ))}
      </div>
    )
  }

  const svgH = goals.length * ROW_H + MT + MB

  return (
    <div data-component="GoalProgressD3" ref={wrapRef} className="relative w-full select-none">
      <svg ref={svgRef} height={svgH} style={{ display: 'block', overflow: 'visible' }} />
      {tooltip && (() => {
        const pct = Math.min(
          currentValueKrw > 0 ? (currentValueKrw / tooltip.goal.targetAmountKrw) * 100 : 0,
          100
        )
        const achieved = currentValueKrw >= tooltip.goal.targetAmountKrw
        return (
          <div
            className="absolute z-10 pointer-events-none bg-card border border-border rounded-md px-3 py-2 shadow-lg text-sm space-y-0.5"
            style={{ left: tooltip.x + 14, top: tooltip.y - 60 }}
          >
            <p className="font-semibold text-foreground">{tooltip.goal.name}</p>
            <p className="text-muted-foreground">현재: {formatKrw(currentValueKrw)}</p>
            <p className="text-muted-foreground">목표: {formatKrw(tooltip.goal.targetAmountKrw)}</p>
            <p className={achieved ? 'text-emerald-400' : 'text-blue-400'}>
              {pct.toFixed(1)}% 달성{achieved ? ' ✓' : ''}
            </p>
            {tooltip.goal.targetDate && (
              <p className="text-muted-foreground">기한: {tooltip.goal.targetDate}</p>
            )}
          </div>
        )
      })()}
    </div>
  )
}
