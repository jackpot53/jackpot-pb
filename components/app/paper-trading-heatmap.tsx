'use client'

import { Card } from '@/components/ui/card'

interface DateRange {
  startDate: string
  endDate: string
}

interface HeatmapData {
  month: string
  [year: number]: number
}

export function PaperTradingHeatmap({ dateRange }: { dateRange: DateRange }) {
  // Dummy data (TODO: DB에서 실제 월별 데이터 조회)
  const heatmapData: HeatmapData[] = [
    { month: 'Jan', 2023: 2.5, 2024: -1.2 },
    { month: 'Feb', 2023: 1.8, 2024: 2.1 },
    { month: 'Mar', 2023: 3.2, 2024: 1.5 },
    { month: 'Apr', 2023: -0.8, 2024: 2.8 },
    { month: 'May', 2023: 2.1, 2024: -0.5 },
    { month: 'Jun', 2023: 1.5, 2024: 1.2 },
    { month: 'Jul', 2023: 2.8, 2024: 2.3 },
    { month: 'Aug', 2023: -1.2, 2024: 1.8 },
    { month: 'Sep', 2023: 2.2, 2024: 2.5 },
    { month: 'Oct', 2023: 3.1, 2024: -0.3 },
    { month: 'Nov', 2023: 1.9, 2024: 2.1 },
    { month: 'Dec', 2023: 2.6, 2024: 1.5 },
  ]

  const years = [2023, 2024]

  const getHeatmapColor = (value: number): string => {
    if (value >= 3) return 'bg-green-900 text-green-100'
    if (value >= 2) return 'bg-green-700 text-green-100'
    if (value >= 1) return 'bg-green-500 text-white'
    if (value >= 0) return 'bg-green-300 text-green-900'
    if (value >= -1) return 'bg-red-300 text-red-900'
    if (value >= -2) return 'bg-red-500 text-white'
    return 'bg-red-700 text-red-100'
  }

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-6">월별 수익률 히트맵</h2>
      <div className="space-y-6">
        {years.map((year) => (
          <div key={year}>
            <h3 className="text-sm font-medium text-white/70 mb-2">{year}년</h3>
            <div className="grid grid-cols-6 gap-2">
              {heatmapData.map((row) => {
                const value = row[year]
                return (
                  <div
                    key={`${row.month}-${year}`}
                    className={`p-2 rounded text-center cursor-pointer hover:opacity-80 transition ${getHeatmapColor(value)}`}
                    title={`${row.month} ${year}: ${value >= 0 ? '+' : ''}${value.toFixed(1)}%`}
                  >
                    <div className="text-xs font-medium">{row.month}</div>
                    <div className="text-sm font-bold">{value >= 0 ? '+' : ''}{value.toFixed(1)}%</div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 범례 */}
      <div className="mt-6 pt-4 border-t border-white/[0.08]">
        <div className="text-xs font-medium text-white/60 mb-3">범례</div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-700 rounded" />
            <span className="text-xs text-white/60">-2% 이하</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-500 rounded" />
            <span className="text-xs text-white/60">-1~-2%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-300 rounded" />
            <span className="text-xs text-white/60">-1~0%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-300 rounded" />
            <span className="text-xs text-white/60">0~1%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded" />
            <span className="text-xs text-white/60">1~2%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-700 rounded" />
            <span className="text-xs text-white/60">2~3%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-900 rounded" />
            <span className="text-xs text-white/60">3% 이상</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
