import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { GoalProgressD3 } from '@/components/app/goal-progress-d3'
import { SnapshotButton } from '@/components/app/snapshot-button'
import type { GoalRow } from '@/db/queries/goals'

interface GoalProgressChartProps {
  goals: GoalRow[]
  currentValueKrw: number
}

export function GoalProgressChart({ goals, currentValueKrw }: GoalProgressChartProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle>목표 진행 현황</CardTitle>
        <SnapshotButton />
      </CardHeader>
      <CardContent>
        <GoalProgressD3 goals={goals} currentValueKrw={currentValueKrw} />
      </CardContent>
    </Card>
  )
}
