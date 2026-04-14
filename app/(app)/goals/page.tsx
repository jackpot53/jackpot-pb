import { listGoals } from '@/db/queries/goals'
import { getAllSnapshots } from '@/db/queries/portfolio-snapshots'
import { GoalProgressChart } from '@/components/app/goal-progress-chart'
import { GoalListClient } from '@/components/app/goal-list-client'

export default async function GoalsPage() {
  const [goals, snapshots] = await Promise.all([
    listGoals(),
    getAllSnapshots(),
  ])

  return (
    <div className="space-y-6">
      {/* PRIMARY VISUAL ANCHOR: chart appears first (D-05, D-08) */}
      <GoalProgressChart snapshots={snapshots} goals={goals} />

      {/* Goal list with CRUD actions */}
      <GoalListClient goals={goals} />
    </div>
  )
}
