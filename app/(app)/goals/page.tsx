import { listGoals } from '@/db/queries/goals'
import { GoalListClient } from '@/components/app/goal-list-client'

export default async function GoalsPage() {
  const goals = await listGoals()

  return (
    <div className="space-y-6">
      <GoalListClient goals={goals} />
    </div>
  )
}
