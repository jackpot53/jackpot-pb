import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/utils/supabase/server'
import { listGoals } from '@/db/queries/goals'
import { getAllSnapshots } from '@/db/queries/portfolio-snapshots'
import { Target } from 'lucide-react'
import { GoalProgressChart } from '@/components/app/goal-progress-chart'
import { GoalAchievementChart } from '@/components/app/goal-achievement-chart'
import { GoalListClient } from '@/components/app/goal-list-client'
import { GoalCreateButton } from '@/components/app/goal-create-button'

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const goals = await listGoals(user.id)

  const chartFallback = (
    <div className="flex items-center justify-center h-48 rounded-lg border bg-card">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="relative space-y-6">
      {/* 배경 장식 */}
      <div aria-hidden className="pointer-events-none select-none fixed inset-0 overflow-hidden -z-10">
        {/* 베이스 그라데이션 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#dbeafe55_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_#d1fae555_0%,_transparent_50%),radial-gradient(ellipse_at_center,_#fef3c755_0%,_transparent_70%)]" />
        {/* 대형 글로우 오브 */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-400/10 blur-[100px]" />
        <div className="absolute top-1/2 -right-40 w-[450px] h-[450px] rounded-full bg-emerald-400/10 blur-[100px]" />
        <div className="absolute -bottom-20 left-1/4 w-[400px] h-[400px] rounded-full bg-amber-400/10 blur-[80px]" />
        {/* 도트 그리드 패턴 */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #64748b 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* 대각 라인 장식 */}
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.025]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #3b82f6 0px, #3b82f6 1px, transparent 1px, transparent 40px)',
          }}
        />
        {/* 코너 장식 원 */}
        <div className="absolute top-16 right-16 w-3 h-3 rounded-full bg-blue-400/40 ring-4 ring-blue-400/10" />
        <div className="absolute top-32 right-32 w-2 h-2 rounded-full bg-emerald-400/40" />
        <div className="absolute bottom-24 left-16 w-3 h-3 rounded-full bg-amber-400/40 ring-4 ring-amber-400/10" />
        <div className="absolute bottom-40 left-36 w-2 h-2 rounded-full bg-blue-400/30" />
      </div>
      {/* 헤더 섹션 */}
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Target className="h-5 w-5" />목표
        </h1>
        <GoalCreateButton />
      </div>
      <Separator className="bg-foreground" />

      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        {/* 좌측: 나의 목표 리스트 + 진행 현황 */}
        <div className="flex-1 rounded-xl border bg-card p-6 space-y-6 min-w-0">
          <GoalListClient goals={goals} />
          <Suspense fallback={chartFallback}>
            <GoalProgressChartAsync userId={user.id} />
          </Suspense>
        </div>

        {/* 구분선 */}
        <div className="hidden lg:block w-px bg-border" />

        {/* 우측: 날짜별 달성률 */}
        <div className="flex-1 min-w-0">
          <Suspense fallback={chartFallback}>
            <GoalAchievementChartAsync userId={user.id} />
          </Suspense>
        </div>
      </div>

      {/* 브랜드 로고 */}
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="relative">
          {/* 배경 글로우 */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-100 via-emerald-50 to-amber-100 blur-xl opacity-60 scale-110" />
          <Image
            src="/logo.jpg"
            alt="77잭팟 로고"
            width={420}
            height={210}
            className="relative rounded-3xl shadow-lg hover:scale-105 transition-transform duration-300"
          />
        </div>
        <p className="text-xs text-muted-foreground tracking-widest uppercase">
          77 Jackpot Assets Management
        </p>
      </div>
    </div>
  )
}
