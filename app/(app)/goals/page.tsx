import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { listGoals } from '@/db/queries/goals'
import { getAllSnapshots } from '@/db/queries/portfolio-snapshots'
import { GoalProgressChart } from '@/components/app/goal-progress-chart'
import { GoalListClient } from '@/components/app/goal-list-client'

async function GoalChart() {
  const [goals, snapshots] = await Promise.all([listGoals(), getAllSnapshots()])
  return <GoalProgressChart snapshots={snapshots} goals={goals} />
}

export default async function GoalsPage() {
  const goals = await listGoals()

  return (
    <div className="space-y-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-48 rounded-lg border bg-card">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <GoalChart />
      </Suspense>

      <GoalListClient goals={goals} />
    </div>
  )
}
