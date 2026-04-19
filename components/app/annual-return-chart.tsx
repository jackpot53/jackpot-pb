'use client'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import type { AnnualDataPoint } from '@/lib/snapshot/aggregation'
import { formatKrw } from '@/lib/portfolio'

// ---- InsufficientDataMessage (shared sub-component) ----
// Variant A: count === 0 → "데이터를 수집하고 있습니다"
// Variant B: count === 1 → "데이터가 충분하지 않습니다"
interface InsufficientDataMessageProps {
  count: number
}

export function InsufficientDataMessage({ count }: InsufficientDataMessageProps) {
  if (count === 0) {
    return (
      <div data-component="InsufficientDataMessage" className="flex flex-col items-center justify-center h-[320px] gap-3">
        <p className="text-base font-semibold text-foreground">데이터를 수집하고 있습니다</p>
        <p className="text-sm text-muted-foreground">
          첫 번째 스냅숏이 오늘 자정(KST)에 기록됩니다.
        </p>
      </div>
    )
  }
  // count === 1
  return (
    <div data-component="InsufficientDataMessage" className="flex flex-col items-center justify-center h-[320px] gap-3">
      <p className="text-base font-semibold text-foreground">데이터가 충분하지 않습니다</p>
      <p className="text-sm text-muted-foreground">
        차트를 표시하려면 최소 2일의 데이터가 필요합니다.
      </p>
    </div>
  )
}

// ---- AnnualTooltip (custom recharts tooltip) ----
function AnnualTooltip({ active, payload }: TooltipContentProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload as AnnualDataPoint
  const isPositive = point.returnPct >= 0
  const sign = isPositive ? '+' : ''
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 shadow-sm text-sm">
      <p className="text-sm text-foreground">{point.year}년</p>
      <p className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
        {sign}{point.returnPct.toFixed(1)}%
      </p>
      <p className="text-xs text-muted-foreground">자산 총액 {formatKrw(point.totalValueKrw)}</p>
    </div>
  )
}

// ---- AnnualReturnChart ----
export interface AnnualReturnChartProps {
  data: AnnualDataPoint[]
}

export function AnnualReturnChart({ data }: AnnualReturnChartProps) {
  return (
    <Card data-component="AnnualReturnChart" className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle>연간 수익률</CardTitle>
        <CardDescription>연도별 전체 자산 수익률 (%)</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length < 2 ? (
          <InsufficientDataMessage count={data.length} />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 16 }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="year"
                tickFormatter={(v) => String(v)}
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              />
              <YAxis
                tickFormatter={(v) => `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(1)}%`}
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                domain={['auto', 'auto']}
              />
              <Tooltip content={(props) => <AnnualTooltip {...(props as TooltipContentProps<number, string>)} />} />
              <Area
                type="monotone"
                dataKey="returnPct"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#areaGradient)"
                dot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
