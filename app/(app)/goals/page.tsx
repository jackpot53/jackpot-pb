import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { listGoals } from '@/db/queries/goals'
import { getAllSnapshots } from '@/db/queries/portfolio-snapshots'
import { GoalProgressChart } from '@/components/app/goal-progress-chart'
import { GoalAchievementChart } from '@/components/app/goal-achievement-chart'
import { GoalListClient } from '@/components/app/goal-list-client'

async function GoalCharts({ userId }: { userId: string }) {
  const [goals, snapshots] = await Promise.all([listGoals(userId), getAllSnapshots(userId)])
  const currentValueKrw = snapshots[snapshots.length - 1]?.totalValueKrw ?? 0
  return (
    <>
      <GoalProgressChart goals={goals} currentValueKrw={currentValueKrw} />
      <GoalAchievementChart goals={goals} snapshots={snapshots} />
    </>
  )
}

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const goals = await listGoals(user.id)

  return (
    <div className="space-y-6">
      <GoalListClient goals={goals} />

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-48 rounded-lg border bg-card">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <GoalCharts userId={user.id} />
      </Suspense>
    </div>
  )
}
