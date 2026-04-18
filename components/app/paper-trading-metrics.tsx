// components/app/paper-trading-metrics.tsx
'use client'

import { Card } from '@/components/ui/card'

interface DateRange {
  startDate: string
  endDate: string
}

interface Metrics {
  robot: string
  totalReturn: number
  sharpeRatio: number
  mdd: number
}

const ROBOT_NAMES = ['Balanced', 'Growth', 'Conservative'] as const

export function PaperTradingMetrics({ dateRange }: { dateRange: DateRange }) {
  // Dummy data (TODO: DB에서 실제 메트릭 계산 및 조회)
  const metricsData: Metrics[] = [
    { robot: 'Balanced', totalReturn: 12.5, sharpeRatio: 1.2, mdd: -8.3 },
    { robot: 'Growth', totalReturn: 18.2, sharpeRatio: 1.0, mdd: -15.6 },
    { robot: 'Conservative', totalReturn: 6.8, sharpeRatio: 1.8, mdd: -3.2 },
  ]

  const avgMetrics = {
    totalReturn: metricsData.reduce((sum, m) => sum + m.totalReturn, 0) / metricsData.length,
    sharpeRatio: metricsData.reduce((sum, m) => sum + m.sharpeRatio, 0) / metricsData.length,
    mdd: metricsData.reduce((sum, m) => sum + m.mdd, 0) / metricsData.length,
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="p-4">
        <h3 className="text-sm font-medium text-white/60 mb-2">평균 수익률</h3>
        <p className="text-3xl font-bold">
          <span className={avgMetrics.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}>
            {avgMetrics.totalReturn >= 0 ? '+' : ''}{avgMetrics.totalReturn.toFixed(2)}%
          </span>
        </p>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-medium text-white/60 mb-2">평균 샤프 비율</h3>
        <p className="text-3xl font-bold text-blue-400">{avgMetrics.sharpeRatio.toFixed(2)}</p>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-medium text-white/60 mb-2">평균 MDD</h3>
        <p className="text-3xl font-bold text-red-400">{avgMetrics.mdd.toFixed(2)}%</p>
      </Card>
    </div>
  )
}
