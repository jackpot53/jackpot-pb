'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts'
import type { AssetHistoryPoint } from '@/lib/asset-history-types'
import { formatKrw } from '@/lib/portfolio'

interface AssetLineChartProps {
  data: AssetHistoryPoint[]
  kind: 'line-nav' | 'line-projected'
  positive?: boolean
}

function fmtDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${Number(m)}/${Number(d)}`
}

function fmtYear(dateStr: string): string {
  const [y, m] = dateStr.split('-')
  return `${y}.${Number(m)}`
}

// 라벨 간격: 포인트 수에 따라 자동 조정
function tickInterval(len: number): number {
  if (len <= 12) return 1
  if (len <= 24) return 2
  if (len <= 48) return 4
  return Math.ceil(len / 12)
}

export function AssetLineChart({ data, kind, positive = true }: AssetLineChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        데이터 수집 중
      </div>
    )
  }

  const color = positive ? '#ef4444' : '#3b82f6'
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayIdx = data.findIndex(d => d.date >= todayStr)

  const interval = tickInterval(data.length)
  const isProjected = kind === 'line-projected'

  // projected 구간은 투명도로 구분 — Recharts는 단일 Line에 점선 구간을 지원하므로
  // solid/projected 두 개 Line으로 분리
  const solidData = data.map(d => ({ ...d, solidValue: d.projected ? null : d.value, projectedValue: d.projected ? d.value : null }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={solidData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="date"
          tickFormatter={isProjected ? fmtYear : fmtDate}
          interval={interval}
          tick={{ fontSize: 10, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={v => formatKrw(v).replace('₩', '')}
          tick={{ fontSize: 10, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip
          formatter={(v) => [formatKrw(Number(v)), kind === 'line-nav' ? 'NAV' : '평가금']}
          labelFormatter={(label) => String(label)}
          contentStyle={{ fontSize: 11, background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6 }}
          itemStyle={{ color }}
          labelStyle={{ color: '#9ca3af' }}
        />
        {/* 오늘 기준선 (예적금 only) */}
        {isProjected && todayIdx >= 0 && (
          <ReferenceLine
            x={data[todayIdx].date}
            stroke="#6b7280"
            strokeDasharray="3 3"
            label={{ value: '오늘', position: 'top', fontSize: 9, fill: '#9ca3af' }}
          />
        )}
        {/* 실선 구간 */}
        <Line
          type="monotone"
          dataKey="solidValue"
          stroke={color}
          strokeWidth={2}
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
        />
        {/* 점선 구간 (projected) */}
        {isProjected && (
          <Line
            type="monotone"
            dataKey="projectedValue"
            stroke={color}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            connectNulls={false}
            opacity={0.6}
            isAnimationActive={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
