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

export function PaperTradingChart({ dateRange }: { dateRange: DateRange }) {
  // Dummy data (TODO: DB에서 실제 데이터 조회)
  const chartData: ChartDataPoint[] = [
    { date: '2024-01-01', 'Balanced': 100000000, 'Growth': 100000000, 'Conservative': 100000000 },
    { date: '2024-02-01', 'Balanced': 105000000, 'Growth': 110000000, 'Conservative': 102000000 },
    { date: '2024-03-01', 'Balanced': 103000000, 'Growth': 108000000, 'Conservative': 103500000 },
    { date: '2024-04-01', 'Balanced': 108000000, 'Growth': 115000000, 'Conservative': 105000000 },
    { date: '2024-05-01', 'Balanced': 107000000, 'Growth': 112000000, 'Conservative': 104200000 },
  ]

  const colors = ['#6366f1', '#ec4899', '#f59e0b']
  const robots = ['Balanced', 'Growth', 'Conservative']

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-4">누적 수익 추이</h2>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="date"
            stroke="rgba(255,255,255,0.5)"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.5)"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `₩${(value / 1000000).toFixed(0)}M`}
          />
          <Tooltip
            formatter={(value) => `₩${(value as number).toLocaleString('ko-KR')}`}
            labelStyle={{ color: '#000' }}
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '16px' }} />
          {robots.map((robot, idx) => (
            <Line
              key={robot}
              type="monotone"
              dataKey={robot}
              stroke={colors[idx]}
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
