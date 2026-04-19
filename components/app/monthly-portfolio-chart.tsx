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
import type { MonthlyDataPoint } from '@/lib/snapshot/aggregation'
import { formatKrwCompact, formatMonthLabel } from '@/lib/snapshot/formatters'
import { formatKrw } from '@/lib/portfolio'
import { InsufficientDataMessage } from '@/components/app/annual-return-chart'

// ---- MonthlyTooltip (custom recharts tooltip) ----
function MonthlyTooltip({ active, payload }: TooltipContentProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload as MonthlyDataPoint
  // Format label 'YYYY-MM' as Korean: "2025년 4월"
  const [yyyy, mm] = point.label.split('-')
  const koreanLabel = `${yyyy}년 ${parseInt(mm, 10)}월`
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 shadow-sm text-sm">
      <p className="text-sm text-foreground">{koreanLabel}</p>
      <p className="text-sm font-semibold text-foreground">{formatKrw(point.totalValueKrw)}</p>
      {point.returnPct !== undefined && (
        <p
          className={`text-xs ${
            point.returnPct >= 0 ? 'text-emerald-600' : 'text-red-600'
          }`}
        >
          전월 대비 {point.returnPct >= 0 ? '+' : ''}{point.returnPct.toFixed(1)}%
        </p>
      )}
    </div>
  )
}

// ---- MonthlyPortfolioChart ----
export interface MonthlyPortfolioChartProps {
  data: MonthlyDataPoint[]
}

export function MonthlyPortfolioChart({ data }: MonthlyPortfolioChartProps) {
  return (
    <Card data-component="MonthlyPortfolioChart" className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle>월별 자산 총액</CardTitle>
        <CardDescription>최근 12개월 포트폴리오 총액 (KRW)</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length < 2 ? (
          <InsufficientDataMessage count={data.length} />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 16 }}>
              <defs>
                <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tickFormatter={(v) => formatMonthLabel(v)}
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              />
              <YAxis
                tickFormatter={(v) => formatKrwCompact(Number(v))}
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                domain={['auto', 'auto']}
                width={72}
              />
              <Tooltip content={(props) => <MonthlyTooltip {...(props as TooltipContentProps<number, string>)} />} />
              <Area
                type="monotone"
                dataKey="totalValueKrw"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#monthlyGradient)"
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
