import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { formatKrw } from '@/lib/portfolio'
import { cn } from '@/lib/utils'

interface Goal {
  id: string
  name: string
  targetAmountKrw: number
}

interface DashboardGoalsSectionProps {
  goals: Goal[]
  totalValueKrw: number
}

export function DashboardGoalsSection({ goals, totalValueKrw }: DashboardGoalsSectionProps) {
  // D-04: hide section entirely when no goals exist
  if (goals.length === 0) return null

  return (
    <section data-component="DashboardGoalsSection" className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">목표</h2>
      <Card className="shadow-sm">
        <CardContent className="pt-4 pb-2">
          {goals.map((goal) => {
            // Achievement % formula (D-03): computed at read time
            // Guard against division by zero when targetAmountKrw is 0 (e.g. direct DB insert)
            const achievementPct =
              goal.targetAmountKrw > 0
                ? Math.round((totalValueKrw / goal.targetAmountKrw) * 100)
                : 0
            const isOverachieved = achievementPct >= 100
            return (
              <div
                key={goal.id}
                className="flex items-center gap-4 py-3 border-b last:border-0"
              >
                <span className="flex-1 text-base">{goal.name}</span>
                <span className="text-sm text-muted-foreground">
                  {formatKrw(goal.targetAmountKrw)}
                </span>
                <span
                  className={cn(
                    'text-sm font-semibold',
                    isOverachieved ? 'text-emerald-600' : ''
                  )}
                >
                  {isOverachieved
                    ? `${achievementPct}% 달성 (목표 초과)`
                    : `${achievementPct}% 달성`}
                </span>
                {/* Progress bar capped at 100 for width; achievement label shows actual % */}
                <Progress value={Math.min(achievementPct, 100)} className="w-24 h-2" />
              </div>
            )
          })}
        </CardContent>
      </Card>
    </section>
  )
}
