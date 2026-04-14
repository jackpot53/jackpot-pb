'use client'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { formatKrw } from '@/lib/portfolio'
import type { SnapshotRow } from '@/db/queries/portfolio-snapshots'
import type { GoalRow } from '@/db/queries/goals'

interface GoalProgressChartProps {
  snapshots: SnapshotRow[]
  goals: GoalRow[]
}

// Custom tooltip: shows date and portfolio KRW value
function ProgressTooltip({ active, payload }: TooltipContentProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload as { snapshotDate: string; totalValueKrw: number }
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 shadow-sm text-sm">
      <p className="text-sm text-foreground">{point.snapshotDate}</p>
      <p className="text-sm font-semibold text-foreground">{formatKrw(point.totalValueKrw)}</p>
    </div>
  )
}

export function GoalProgressChart({ snapshots, goals }: GoalProgressChartProps) {
  if (snapshots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>목표 진행 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[320px]">
            <p className="text-sm text-muted-foreground">
              아직 데이터가 없습니다. 크론 잡이 내일 첫 스냅숏을 기록합니다.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }
  const chartData = snapshots.map(s => ({
    snapshotDate: s.snapshotDate,   // string — do NOT convert to Date
    totalValueKrw: s.totalValueKrw,
  }))
  return (
    <Card>
      <CardHeader>
        <CardTitle>목표 진행 현황</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 16 }}>
            <defs>
              <linearGradient id="goalAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="snapshotDate" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
            <YAxis tickFormatter={(v) => formatKrw(Number(v))} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} domain={["auto", "auto"]} width={90} />
            <Tooltip content={(props) => <ProgressTooltip {...(props as TooltipContentProps<number, string>)} />} />
            <Area type="monotone" dataKey="totalValueKrw" stroke="#3B82F6" strokeWidth={2} fill="url(#goalAreaGradient)" dot={false} activeDot={{ r: 5 }} />
            {/* Horizontal ReferenceLine per goal (D-05) */}
            {goals.map((goal) => (
              <ReferenceLine
                key={`h-${goal.id}`}
                y={goal.targetAmountKrw}
                stroke="var(--primary)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              >
                <Label value={goal.name} position="insideTopRight" fontSize={11} fill="var(--muted-foreground)" />
              </ReferenceLine>
            ))}
            {/* Vertical ReferenceLine for goals with targetDate (D-06) */}
            {goals
              .filter((goal) => goal.targetDate !== null)
              .map((goal) => (
                <ReferenceLine
                  key={`v-${goal.id}`}
                  x={goal.targetDate!}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                />
              ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

