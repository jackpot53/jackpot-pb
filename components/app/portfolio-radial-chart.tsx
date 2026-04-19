'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts'
import { formatKrwShort } from '@/lib/format'

const ASSET_TYPE_LABELS: Record<string, string> = {
  stock_kr:      '주식 (국내)',
  stock_us:      '주식 (미국)',
  etf_kr:        'ETF (국내)',
  etf_us:        'ETF (미국)',
  crypto:        '코인',
  fund:          '펀드',
  savings:       '예적금',
  real_estate:   '부동산',
  insurance:     '보험',
  precious_metal:'금/은',
}

const ASSET_TYPE_COLORS: Record<string, string> = {
  stock_kr:      '#3b82f6',
  stock_us:      '#6366f1',
  etf_kr:        '#06b6d4',
  etf_us:        '#0ea5e9',
  crypto:        '#f97316',
  fund:          '#22c55e',
  savings:       '#14b8a6',
  real_estate:   '#f59e0b',
  insurance:     '#f43f5e',
  precious_metal:'#eab308',
}

export interface AllocationItem {
  type: string
  valueKrw: number
  pct: number
}

interface ActiveShapeProps {
  cx: number
  cy: number
  innerRadius: number
  outerRadius: number
  startAngle: number
  endAngle: number
  fill: string
  payload: { type: string; valueKrw: number; pct: number }
}

function renderActiveShape(props: ActiveShapeProps) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props
  const { type, valueKrw, pct } = payload

  return (
    <g>
      <text x={cx} y={cy - 14} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 13, fontWeight: 600, fill: '#111' }}>
        {ASSET_TYPE_LABELS[type] ?? type}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 18, fontWeight: 700, fill }}>
        {pct.toFixed(1)}%
      </text>
      <text x={cx} y={cy + 30} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 12, fill: '#6b7280' }}>
        {formatKrwShort(valueKrw)}
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 4} outerRadius={innerRadius - 2} startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  )
}

interface PortfolioRadialChartProps {
  allocations: AllocationItem[]
  totalValueKrw: number
}

export function PortfolioRadialChart({ allocations, totalValueKrw }: PortfolioRadialChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (allocations.length === 0) return null

  const chartData = allocations.map((a) => ({
    ...a,
    name: ASSET_TYPE_LABELS[a.type] ?? a.type,
    fill: ASSET_TYPE_COLORS[a.type] ?? '#94a3b8',
    value: a.pct,
  }))

  const showCenter = activeIndex === null

  return (
    <div data-component="PortfolioRadialChart" className="flex gap-10 items-center">
      {/* Donut chart */}
      <div className="relative w-[300px] h-[300px] shrink-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={90}
              outerRadius={130}
              dataKey="value"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {...({ activeIndex: activeIndex ?? undefined, activeShape: renderActiveShape } as any)}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              strokeWidth={2}
              stroke="white"
            >
              {chartData.map((entry, index) => (
                <Cell key={entry.type} fill={entry.fill} opacity={activeIndex === null || activeIndex === index ? 1 : 0.35} />
              ))}
            </Pie>
            <Tooltip
              content={() => null}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label when nothing is hovered */}
        {showCenter && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-muted-foreground">총 자산</span>
            <span className="text-xl font-bold tabular-nums mt-0.5">{formatKrwShort(totalValueKrw)}</span>
            <span className="text-xs text-muted-foreground mt-0.5">{allocations.length}개 자산군</span>
          </div>
        )}
      </div>

      {/* Detail table */}
      <div className="flex-1 space-y-3">
        {chartData.map((d, i) => (
          <div
            key={d.type}
            className="flex items-center gap-3 cursor-default"
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: d.fill }} />
            <span className="text-sm text-foreground flex-1 truncate">{d.name}</span>
            <span className="text-sm font-semibold tabular-nums text-foreground w-16 text-right">
              {formatKrwShort(d.valueKrw)}
            </span>
            <span className="text-xs font-medium tabular-nums w-10 text-right" style={{ color: d.fill }}>
              {d.pct.toFixed(1)}%
            </span>
            <div className="w-28 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
              <div className="h-full rounded-full transition-all" style={{ width: `${d.pct}%`, backgroundColor: d.fill }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
