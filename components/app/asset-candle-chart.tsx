'use client'
import { useEffect, useRef, useState } from 'react'
import { scaleBand, scaleLinear } from 'd3-scale'
import { select, pointer } from 'd3-selection'
import { axisBottom, axisLeft } from 'd3-axis'
import { min, max, range as d3range } from 'd3-array'
import type { OhlcPoint } from '@/lib/price/sparkline'

type Period = '일봉' | '주봉' | '월봉'

const PERIODS: Period[] = ['일봉', '주봉', '월봉']
const PERIOD_PARAMS: Record<Period, { interval: string; range: string }> = {
  '일봉': { interval: '1d', range: '1mo' },
  '주봉': { interval: '1wk', range: '6mo' },
  '월봉': { interval: '1mo', range: '2y' },
}

interface TooltipState {
  x: number
  y: number
  point: OhlcPoint
  isUp: boolean
}

interface AssetCandleChartProps {
  ticker: string
  initialData: OhlcPoint[]
}

function fmtAxisPrice(v: number): string {
  if (v >= 100_000) return `${(v / 10_000).toFixed(0)}만`
  if (v >= 10_000) return `${(v / 10_000).toFixed(1)}만`
  if (v >= 1_000) return v.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
  if (v >= 100) return v.toFixed(1)
  return v.toFixed(2)
}

function fmtTooltipPrice(v: number): string {
  if (v >= 1_000) return v.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
  return v.toFixed(2)
}

function fmtXLabel(date: string | undefined, idx: number, total: number, period: Period): string {
  if (!date) {
    // date가 없으면 오늘 기준으로 역산
    const daysAgo = total - 1 - idx
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
  const parts = date.split('-')
  if (!parts[1] || !parts[2]) return ''
  if (period === '월봉') return `${parts[0]}/${parts[1]}`
  return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`
}

export function AssetCandleChart({ ticker, initialData }: AssetCandleChartProps) {
  const [period, setPeriod] = useState<Period>('일봉')
  const [data, setData] = useState<OhlcPoint[]>(initialData)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [dims, setDims] = useState({ width: 0, height: 0 })
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      if (entry) setDims({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (period === '일봉') {
      setData(initialData)
      return
    }
    const { interval, range } = PERIOD_PARAMS[period]
    setLoading(true)
    fetch(`/api/sparklines?tickers=${encodeURIComponent(ticker)}&interval=${interval}&range=${range}`)
      .then(r => r.json())
      .then((res: Record<string, OhlcPoint[]>) => {
        const d = res[ticker]
        if (d && d.length >= 2) setData(d)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period, ticker, initialData])

  useEffect(() => {
    if (!svgRef.current || dims.width === 0 || dims.height === 0 || data.length === 0) return

    const { width, height } = dims
    const margin = { top: 8, right: 12, bottom: 28, left: 58 }
    const W = width - margin.left - margin.right
    const H = height - margin.top - margin.bottom

    const svg = select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const xScale = scaleBand<number>()
      .domain(d3range(data.length))
      .range([0, W])
      .padding(0.2)

    const rawMin = min(data, d => d.low) ?? 0
    const rawMax = max(data, d => d.high) ?? 1
    const yPad = (rawMax - rawMin) * 0.06 || rawMin * 0.01 || 1

    const yScale = scaleLinear()
      .domain([rawMin - yPad, rawMax + yPad])
      .range([H, 0])
      .nice()

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Grid lines
    const ticks = yScale.ticks(4)
    g.append('g')
      .selectAll('line.grid')
      .data(ticks)
      .join('line')
      .attr('x1', 0).attr('x2', W)
      .attr('y1', d => yScale(d)).attr('y2', d => yScale(d))
      .attr('stroke', '#f0f0f0')
      .attr('stroke-dasharray', '3 3')

    // Y axis
    g.append('g')
      .call(
        axisLeft(yScale)
          .tickValues(ticks)
          .tickFormat(v => fmtAxisPrice(v as number))
      )
      .call(sel => sel.select('.domain').remove())
      .call(sel => sel.selectAll('.tick line').remove())
      .call(sel => sel.selectAll('text').attr('fill', '#9ca3af').attr('font-size', '10'))

    // X axis
    const every = Math.max(1, Math.ceil(data.length / 6))
    const xTickIndices = d3range(0, data.length, every)
    if (!xTickIndices.includes(data.length - 1)) xTickIndices.push(data.length - 1)

    g.append('g')
      .attr('transform', `translate(0,${H})`)
      .call(
        axisBottom(xScale)
          .tickValues(xTickIndices)
          .tickFormat(i => fmtXLabel(data[+i]?.date, +i, data.length, period))
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

      g.append('line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', yScale(d.high)).attr('y2', yScale(d.low))
        .attr('stroke', color).attr('stroke-width', 1)

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
      .attr('width', W).attr('height', H)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')

    overlay.on('mousemove', (event: MouseEvent) => {
      const [mx] = pointer(event)
      const idx = Math.min(data.length - 1, Math.max(0, Math.floor(mx / (W / data.length))))
      const d = data[idx]
      if (!d) return
      const rect = svgRef.current!.getBoundingClientRect()
      setTooltip({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        point: d,
        isUp: d.close >= d.open,
      })
    })
    overlay.on('mouseleave', () => setTooltip(null))
  }, [data, dims, period])

  if (data.length === 0) return null

  const changePct = tooltip
    ? ((tooltip.point.close - tooltip.point.open) / tooltip.point.open * 100)
    : null

  return (
    <div className="flex flex-col h-full">
      {/* Period toggle */}
      <div className="flex items-center gap-1 px-2 pt-2 pb-1">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-2.5 py-0.5 text-xs rounded-md font-medium transition-colors ${
              period === p
                ? 'bg-muted text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {p}
          </button>
        ))}
        {loading && (
          <span className="text-xs text-muted-foreground ml-1">…</span>
        )}
      </div>

      {/* Chart area */}
      <div ref={containerRef} className="relative flex-1 min-h-0">
        <svg ref={svgRef} style={{ display: 'block', overflow: 'visible' }} />
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-md text-xs min-w-[140px]"
            style={{
              left: tooltip.x > dims.width * 0.6 ? tooltip.x - 158 : tooltip.x + 12,
              top: Math.max(4, tooltip.y - 80),
            }}
          >
            <p className="text-gray-400 mb-1.5 font-medium">{tooltip.point.date}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 tabular-nums">
              <span className="text-gray-400">시가</span>
              <span className="font-medium text-gray-600">{fmtTooltipPrice(tooltip.point.open)}</span>
              <span className="text-gray-400">고가</span>
              <span className={`font-medium ${tooltip.isUp ? 'text-red-500' : 'text-blue-500'}`}>{fmtTooltipPrice(tooltip.point.high)}</span>
              <span className="text-gray-400">저가</span>
              <span className={`font-medium ${tooltip.isUp ? 'text-red-500' : 'text-blue-500'}`}>{fmtTooltipPrice(tooltip.point.low)}</span>
              <span className="text-gray-400">종가</span>
              <span className={`font-medium ${tooltip.isUp ? 'text-red-500' : 'text-blue-500'}`}>{fmtTooltipPrice(tooltip.point.close)}</span>
            </div>
            {changePct !== null && (
              <div className={`mt-1.5 font-semibold text-sm ${tooltip.isUp ? 'text-red-500' : 'text-blue-500'}`}>
                {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
