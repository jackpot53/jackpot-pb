import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Loader2, Target } from 'lucide-react'
import { getAuthUser } from '@/utils/supabase/server'
import { listGoals } from '@/db/queries/goals'
import { getAllSnapshots } from '@/db/queries/portfolio-snapshots'
import { GoalProgressChart } from '@/components/app/goal-progress-chart'
import { GoalAchievementChart } from '@/components/app/goal-achievement-chart'
import { GoalListClient } from '@/components/app/goal-list-client'
import { GoalCreateButton } from '@/components/app/goal-create-button'
import { formatKrwCompact } from '@/lib/snapshot/formatters'

async function GoalAchievementChartAsync({ userId }: { userId: string }) {
  const [goals, snapshots] = await Promise.all([listGoals(userId), getAllSnapshots(userId)])
  return <GoalAchievementChart goals={goals} snapshots={snapshots} />
}

async function GoalProgressChartAsync({ userId }: { userId: string }) {
  const [goals, snapshots] = await Promise.all([listGoals(userId), getAllSnapshots(userId)])
  const currentValueKrw = snapshots[snapshots.length - 1]?.totalValueKrw ?? 0
  return <GoalProgressChart goals={goals} currentValueKrw={currentValueKrw} />
}

export default async function GoalsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const goals = await listGoals(user.id)
  const totalTarget = goals.reduce((s, g) => s + g.targetAmountKrw, 0)
  const nearestDeadline = [...goals]
    .filter(g => g.targetDate)
    .sort((a, b) => (a.targetDate ?? '').localeCompare(b.targetDate ?? ''))[0]?.targetDate ?? null

  const chartFallback = (
    <div className="flex items-center justify-center h-48 rounded-lg border bg-card">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="relative space-y-6">
      {/* 히어로 배너 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-8 text-white shadow-xl">
        {/* 배경 장식 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-48 rounded-full bg-violet-900/40 blur-3xl" />
          <div className="absolute top-6 right-20 w-28 h-28 rounded-full border border-white/10" />
          <div className="absolute top-12 right-28 w-14 h-14 rounded-full border border-white/10" />
          <div className="absolute top-16 right-24 w-6 h-6 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full border border-white/10" />
          <div className="absolute bottom-6 left-6 w-3 h-3 rounded-full bg-blue-300/30" />
          <div className="absolute bottom-10 left-14 w-2 h-2 rounded-full bg-violet-300/30" />
          {/* 도트 패턴 */}
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />
          {/* 대각선 */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 36px)',
            }}
          />
        </div>

        <div className="relative flex items-start justify-between gap-6">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-blue-200 text-xs font-semibold tracking-widest uppercase">
              <Target className="h-3.5 w-3.5" />
              재정 목표
            </div>
            <h1 className="text-3xl font-bold tracking-tight leading-tight">
              나의 목표
            </h1>
            <p className="text-blue-100/70 text-sm leading-relaxed">
              꿈꾸는 자산에 한 걸음씩 —&nbsp;
              <span className="text-blue-100/90 font-medium">오늘의 결심이 내일의 자유가 됩니다</span>
            </p>

            {goals.length > 0 ? (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
                <div>
                  <div className="text-2xl font-bold tabular-nums">{goals.length}개</div>
                  <div className="text-xs text-blue-200 mt-0.5">진행 중인 목표</div>
                </div>
                <div className="w-px h-10 bg-white/15 hidden sm:block" />
                <div>
                  <div className="text-2xl font-bold tabular-nums">{formatKrwCompact(totalTarget)}</div>
                  <div className="text-xs text-blue-200 mt-0.5">총 목표 금액</div>
                </div>
                {nearestDeadline && (
                  <>
                    <div className="w-px h-10 bg-white/15 hidden sm:block" />
                    <div>
                      <div className="text-base font-semibold tabular-nums">{nearestDeadline}</div>
                      <div className="text-xs text-blue-200 mt-0.5">가장 가까운 마감</div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-blue-200/60 text-sm pt-1">
                + 버튼으로 첫 목표를 만들어 시작해보세요
              </p>
            )}
          </div>

          <div className="shrink-0 pt-1">
            <GoalCreateButton />
          </div>
        </div>
      </div>

      {/* 상단: 나의 목표 + 진행 현황 나란히 */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        <div className="flex-1 min-w-0 flex flex-col">
          <GoalListClient goals={goals} />
        </div>
        <div className="hidden lg:block w-px bg-border" />
        <div className="flex-1 min-w-0 flex flex-col">
          <Suspense fallback={chartFallback}>
            <GoalProgressChartAsync userId={user.id} />
          </Suspense>
        </div>
      </div>

      {/* 하단: 날짜별 달성률 (접기/펼치기) */}
      <Suspense fallback={chartFallback}>
        <GoalAchievementChartAsync userId={user.id} />
      </Suspense>
    </div>
  )
}
