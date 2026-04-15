'use client'
import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

export interface CandlestickPoint {
  date: string
  label?: string
  open: number
  high: number
  low: number
  close: number
  returnPct?: number  // 누적 수익률 %
  delta?: number      // close − open (전기 대비 변화)
}

interface CandlestickChartProps {
  data: CandlestickPoint[]
  formatPrice?: (v: number) => string
}

function defaultFormatPrice(v: number): string {
  const abs = Math.abs(v)
  const sign = v >= 0 ? '+' : '−'
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)}억`
  if (abs >= 10_000) return `${sign}${(abs / 10_000).toFixed(0)}만`
  return (v >= 0 ? '+' : '') + v.toLocaleString()
}

function axisFormatPrice(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? '−' : ''
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)}억`
  if (abs >= 10_000) return `${sign}${(abs / 10_000).toFixed(0)}만`
  return v.toLocaleString()
}

interface TooltipState {
  x: number
  y: number
  point: CandlestickPoint
}

export function CandlestickChart({ data, formatPrice = defaultFormatPrice }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [dims, setDims] = useState({ width: 0, height: 0 })
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      if (entry) {
        setDims({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        })
      }
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!svgRef.current || dims.width === 0 || dims.height === 0 || data.length === 0) return

    const { width, height } = dims
    const margin = { top: 10, right: 8, bottom: 24, left: 60 }
    const W = width - margin.left - margin.right
    const H = height - margin.top - margin.bottom

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const xScale = d3.scaleBand<number>()
      .domain(d3.range(data.length))
      .range([0, W])
      .padding(0.2)

    const rawMin = d3.min(data, d => d.low) ?? 0
    const rawMax = d3.max(data, d => d.high) ?? 1
    const yPad = (rawMax - rawMin) * 0.05 || Math.abs(rawMin) * 0.02 || 1
    // Always include 0 in the domain (수익/손실 기준선)
    const yMin = Math.min(rawMin - yPad, 0)
    const yMax = Math.max(rawMax + yPad, 0)

    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([H, 0])
      .nice()

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Grid lines
    const ticks = yScale.ticks(4)
    g.append('g')
      .selectAll('line.grid')
      .data(ticks)
      .join('line')
      .attr('class', 'grid')
      .attr('x1', 0).attr('x2', W)
      .attr('y1', d => yScale(d)).attr('y2', d => yScale(d))
      .attr('stroke', '#f0f0f0')
      .attr('stroke-dasharray', '3 3')

    // 0 기준선 (수익/손실 구분)
    if (yMin < 0 && yMax > 0) {
      g.append('line')
        .attr('x1', 0).attr('x2', W)
        .attr('y1', yScale(0)).attr('y2', yScale(0))
        .attr('stroke', '#d1d5db')
        .attr('stroke-width', 1)
    }

    // Y axis
    g.append('g')
      .call(
        d3.axisLeft(yScale)
          .tickValues(ticks)
          .tickFormat(v => axisFormatPrice(v as number))
      )
      .call(sel => sel.select('.domain').remove())
      .call(sel => sel.selectAll('.tick line').remove())
      .call(sel => sel.selectAll('text').attr('fill', '#9ca3af').attr('font-size', '10'))

    // X axis
    const every = Math.max(1, Math.ceil(data.length / 6))
    const xTickIndices = d3.range(0, data.length, every)
    const lastIdx = data.length - 1
    if (!xTickIndices.includes(lastIdx)) xTickIndices.push(lastIdx)

    g.append('g')
      .attr('transform', `translate(0,${H})`)
      .call(
        d3.axisBottom(xScale)
          .tickValues(xTickIndices)
          .tickFormat(i => {
            const d = data[i as number]
            if (!d) return ''
            return d.label ?? d.date.slice(5).replace('-', '/')
          })
      )
      .call(sel => sel.select('.domain').remove())
      .call(sel => sel.selectAll('.tick line').remove())
      .call(sel => sel.selectAll('text').attr('fill', '#9ca3af').attr('font-size', '10'))

    // Candles
    const bw = xScale.bandwidth()

    data.forEach((d, i) => {
      const cx = xScale(i)! + bw / 2
      const isUp = d.close >= d.open
      const color = isUp ? '#ef4444' : '#3b82f6'
      const bodyTop = yScale(Math.max(d.open, d.close))
      const bodyH = Math.max(1, Math.abs(yScale(d.open) - yScale(d.close)))

      // Wick
      g.append('line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', yScale(d.high)).attr('y2', yScale(d.low))
        .attr('stroke', color)
        .attr('stroke-width', 1)

      // Body
      g.append('rect')
        .attr('x', xScale(i)!)
        .attr('y', bodyTop)
        .attr('width', bw)
        .attr('height', bodyH)
        .attr('fill', color)
        .attr('rx', 0.5)
    })

    // Hover overlay
    const overlay = g.append('rect')
      .attr('width', W)
      .attr('height', H)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')

    overlay.on('mousemove', (event: MouseEvent) => {
      const [mx] = d3.pointer(event)
      const step = W / data.length
      const idx = Math.min(data.length - 1, Math.max(0, Math.floor(mx / step)))
      const d = data[idx]
      if (!d) return
      const svgEl = svgRef.current
      if (!svgEl) return
      const rect = svgEl.getBoundingClientRect()
      setTooltip({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        point: d,
      })
    })

    overlay.on('mouseleave', () => setTooltip(null))
  }, [data, dims])

  if (data.length === 0) return null

  const isTooltipUp = tooltip ? tooltip.point.close >= tooltip.point.open : true

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg ref={svgRef} />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-gray-100 bg-white px-3 py-2 shadow text-xs min-w-[120px]"
          style={{
            left: tooltip.x + 12,
            top: Math.max(0, tooltip.y - 80),
          }}
        >
          <p className="text-gray-400 mb-1.5 font-medium">{tooltip.point.label ?? tooltip.point.date}</p>
          <div className={`font-semibold ${isTooltipUp ? 'text-red-500' : 'text-blue-500'}`}>
            <div className="text-sm">{formatPrice(tooltip.point.close)}</div>
          </div>
          {tooltip.point.returnPct !== undefined && (
            <div className={`mt-0.5 ${isTooltipUp ? 'text-red-400' : 'text-blue-400'}`}>
              누적 {tooltip.point.returnPct >= 0 ? '+' : ''}{tooltip.point.returnPct.toFixed(2)}%
            </div>
          )}
          {tooltip.point.delta !== undefined && (
            <div className="text-gray-400 mt-0.5">
              전기 대비 {formatPrice(tooltip.point.delta)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
