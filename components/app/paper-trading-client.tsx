// components/app/paper-trading-client.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PaperTradingChart } from '@/components/app/paper-trading-chart'
import { PaperTradingMetrics } from '@/components/app/paper-trading-metrics'
import { PaperTradingTable } from '@/components/app/paper-trading-table'
import { PaperTradingHeatmap } from '@/components/app/paper-trading-heatmap'
import { Calendar } from 'lucide-react'

type PeriodType = '1y' | '3y' | '5y' | 'all' | 'custom'

interface DateRange {
  startDate: string
  endDate: string
}

const PERIOD_OPTIONS = [
  { label: '1년', value: '1y' },
  { label: '3년', value: '3y' },
  { label: '5년', value: '5y' },
  { label: '전체', value: 'all' },
]

const INITIAL_CAPITAL = 100_000_000
const EARLIEST_YEAR = 2000

const formatDateToISO = (date: Date): string => {
  return date.toLocaleDateString('en-CA')
}

export function PaperTradingClient() {
  const [period, setPeriod] = useState<PeriodType>('1y')
  const [customRange, setCustomRange] = useState<DateRange | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)

  const getDateRange = (): DateRange => {
    if (period === 'custom' && customRange) {
      return customRange
    }

    const endDate = new Date()
    const startDate = new Date()

    switch (period) {
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      case '3y':
        startDate.setFullYear(endDate.getFullYear() - 3)
        break
      case '5y':
        startDate.setFullYear(endDate.getFullYear() - 5)
        break
      case 'all':
        startDate.setFullYear(EARLIEST_YEAR)
        break
    }

    return {
      startDate: formatDateToISO(startDate),
      endDate: formatDateToISO(endDate),
    }
  }

  const dateRange = getDateRange()
  const isValidDateRange = !customRange || new Date(customRange.startDate) <= new Date(customRange.endDate)

  return (
    <div className="space-y-6">
      {/* 제어판 */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              onClick={() => setPeriod(opt.value as PeriodType)}
              variant={period === opt.value ? 'default' : 'outline'}
              size="sm"
            >
              {opt.label}
            </Button>
          ))}
          <Button
            onClick={() => setShowDatePicker(!showDatePicker)}
            variant={period === 'custom' ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
          >
            <Calendar size={14} />
            날짜 선택
          </Button>
        </div>

        {showDatePicker && (
          <div className="flex gap-2 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/60">시작일</label>
              <input
                type="date"
                value={customRange?.startDate ?? dateRange.startDate}
                onChange={(e) =>
                  setCustomRange((prev) => ({
                    startDate: e.target.value,
                    endDate: prev?.endDate ?? dateRange.endDate,
                  }))
                }
                className="px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded text-sm text-white"
              />
            </div>
            <span className="text-white/50">~</span>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/60">종료일</label>
              <input
                type="date"
                value={customRange?.endDate ?? dateRange.endDate}
                onChange={(e) =>
                  setCustomRange((prev) => ({
                    startDate: prev?.startDate ?? dateRange.startDate,
                    endDate: e.target.value,
                  }))
                }
                className="px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded text-sm text-white"
              />
            </div>
            <Button
              onClick={() => {
                setPeriod('custom')
                setShowDatePicker(false)
              }}
              size="sm"
              disabled={!isValidDateRange}
            >
              적용
            </Button>
          </div>
        )}

        <div className="text-sm text-white/60">
          초기자금: ₩{INITIAL_CAPITAL.toLocaleString('ko-KR')} | 기간: {dateRange.startDate} ~ {dateRange.endDate}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <PaperTradingChart dateRange={dateRange} />
      <PaperTradingMetrics dateRange={dateRange} />
      <PaperTradingTable dateRange={dateRange} />
      <PaperTradingHeatmap dateRange={dateRange} />
    </div>
  )
}
