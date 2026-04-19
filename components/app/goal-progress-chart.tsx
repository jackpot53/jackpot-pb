import { TrendingUp } from 'lucide-react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { GoalProgressD3 } from '@/components/app/goal-progress-d3'
import { SnapshotButton } from '@/components/app/snapshot-button'
import type { GoalRow } from '@/db/queries/goals'

interface GoalProgressChartProps {
  goals: GoalRow[]
  currentValueKrw: number
}

export function GoalProgressChart({ goals, currentValueKrw }: GoalProgressChartProps) {
  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />목표 진행 현황
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">현재 자산이 각 목표에 얼마나 근접했는지 보여줍니다</p>
        </div>
        <SnapshotButton />
      </CardHeader>
      <Separator />
      <CardContent className="flex-1 flex items-center justify-center">
        <GoalProgressD3 goals={goals} currentValueKrw={currentValueKrw} />
      </CardContent>
    </Card>
  )
}
