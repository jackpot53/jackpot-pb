'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'

interface DateRange {
  startDate: string
  endDate: string
}

interface ChartDataPoint {
  date: string
  [key: string]: string | number
}

const ROBOT_NAMES = ['Balanced', 'Growth', 'Conservative'] as const
const ROBOT_COLORS = {
  'Balanced': '#6366f1',
  'Growth': '#ec4899',
  'Conservative': '#f59e0b',
} as const
const CHART_HEIGHT = 320
const CHART_MARGIN = { top: 5, right: 30, left: 0, bottom: 5 }

export function PaperTradingChart({ dateRange }: { dateRange: DateRange }) {
  // Dummy data (TODO: DB에서 실제 데이터 조회 및 dateRange로 필터링)
  const chartData: ChartDataPoint[] = [
    { date: '2024-01-01', 'Balanced': 100000000, 'Growth': 100000000, 'Conservative': 100000000 },
    { date: '2024-02-01', 'Balanced': 105000000, 'Growth': 110000000, 'Conservative': 102000000 },
    { date: '2024-03-01', 'Balanced': 103000000, 'Growth': 108000000, 'Conservative': 103500000 },
    { date: '2024-04-01', 'Balanced': 108000000, 'Growth': 115000000, 'Conservative': 105000000 },
    { date: '2024-05-01', 'Balanced': 107000000, 'Growth': 112000000, 'Conservative': 104200000 },
  ]

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-4">누적 수익 추이</h2>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <LineChart
          data={chartData}
          margin={CHART_MARGIN}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            stroke="var(--muted-foreground)"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `₩${(value / 1000000).toFixed(0)}M`}
          />
          <Tooltip
            formatter={(value) => `₩${(value as number).toLocaleString('ko-KR')}`}
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '4px',
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '1rem' }} />
          {ROBOT_NAMES.map((robot) => (
            <Line
              key={robot}
              type="monotone"
              dataKey={robot}
              stroke={ROBOT_COLORS[robot]}
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
