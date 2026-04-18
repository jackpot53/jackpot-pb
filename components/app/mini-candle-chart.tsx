'use client'

import type { OhlcPoint } from '@/lib/price/sparkline'

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
  if (data.length < 2) return null

  const pad = 2
  const innerW = width - pad * 2
  const innerH = height - pad * 2

  const allLows = data.map(d => d.low)
  const allHighs = data.map(d => d.high)
  const minVal = Math.min(...allLows)
  const maxVal = Math.max(...allHighs)
  const range = maxVal - minVal || 1

  const toY = (v: number) => pad + innerH - ((v - minVal) / range) * innerH

  const slotW = innerW / data.length
  const bodyW = Math.max(1, slotW * 0.7)
  const gap = (slotW - bodyW) / 2

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      {data.map((d, i) => {
        const isUp = d.close >= d.open
        const color = isUp ? '#ef4444' : '#3b82f6'
        const cx = pad + i * slotW + slotW / 2
        const x = pad + i * slotW + gap

        const wickY1 = toY(d.high)
        const wickY2 = toY(d.low)

        const bodyY1 = toY(Math.max(d.open, d.close))
        const bodyY2 = toY(Math.min(d.open, d.close))
        const bodyH = Math.max(1, bodyY2 - bodyY1)

        return (
          <g key={i}>
            <line
              x1={cx} y1={wickY1}
              x2={cx} y2={wickY2}
              stroke={color}
              strokeWidth={1}
            />
            <rect
              x={x}
              y={bodyY1}
              width={bodyW}
              height={bodyH}
              fill={color}
            />
          </g>
        )
      })}
    </svg>
  )
}
