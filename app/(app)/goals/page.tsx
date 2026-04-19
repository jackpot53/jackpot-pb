import { Suspense } from 'react'
import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { Target } from 'lucide-react'
import { getAuthUser } from '@/utils/supabase/server'
import { AnimatedLogo } from '@/components/app/animated-logo'
import { listGoals } from '@/db/queries/goals'
import { getAllSnapshots } from '@/db/queries/portfolio-snapshots'
import { GoalProgressChart } from '@/components/app/goal-progress-chart'
import { GoalAchievementChart } from '@/components/app/goal-achievement-chart'
import { GoalListClient } from '@/components/app/goal-list-client'
import { GoalCreateButton } from '@/components/app/goal-create-button'
import { formatKrwCompact } from '@/lib/snapshot/formatters'
import { loadPerformances } from '@/lib/server/load-performances'
import { computePortfolio } from '@/lib/portfolio'
import { refreshAllPricesInternal } from '@/app/actions/prices'
import { timed, perfMark, perfLog } from '@/lib/perf'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SummaryCards } from '@/components/app/summary-cards'

export default async function GoalsPage() {
  const pageStart = perfMark()
  const user = await getAuthUser()
  if (!user) redirect('/login')

  after(() => { void refreshAllPricesInternal().catch(() => {}) })

  return (
    <div className="relative space-y-6">
      {/* 히어로 배너 — 정적 콘텐츠, 즉시 스트리밍 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-4 sm:p-6 text-white shadow-xl min-h-[160px]">
        {/* 배경 장식 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <style>{`
            @keyframes goals-radar { 0%{opacity:.45;transform:scale(.7)} 100%{opacity:0;transform:scale(1.9)} }
            @keyframes goals-ring-pulse { 0%,100%{opacity:.15;transform:scale(1)} 50%{opacity:.4;transform:scale(1.06)} }
            @keyframes goals-dot-float { 0%,100%{transform:translateY(0);opacity:.35} 50%{transform:translateY(-9px);opacity:.75} }
            @keyframes goals-star { 0%,100%{opacity:0;transform:scale(.4) rotate(0deg)} 50%{opacity:.8;transform:scale(1) rotate(20deg)} }
          `}</style>
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-48 rounded-full bg-violet-900/40 blur-3xl" />
          {/* 레이더 타겟 링 */}
          <div className="absolute top-6 right-20 w-28 h-28 rounded-full border border-white/20" style={{ animation: 'goals-ring-pulse 3s ease-in-out infinite' }} />
          <div className="absolute top-12 right-28 w-14 h-14 rounded-full border border-white/25" style={{ animation: 'goals-ring-pulse 3s ease-in-out infinite', animationDelay: '1s' }} />
          <div className="absolute top-16 right-24 w-6 h-6 rounded-full bg-white/25" style={{ animation: 'goals-ring-pulse 2.5s ease-in-out infinite', animationDelay: '2s' }} />
          {/* 레이더 스윕 */}
          <div className="absolute top-6 right-20 w-28 h-28 rounded-full border border-blue-300/50" style={{ animation: 'goals-radar 2.8s ease-out infinite' }} />
          <div className="absolute top-6 right-20 w-28 h-28 rounded-full border border-indigo-200/35" style={{ animation: 'goals-radar 2.8s ease-out infinite', animationDelay: '1.4s' }} />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full border border-white/10" />
          {/* 떠오르는 반짝이 점들 */}
          <div className="absolute bottom-6 left-6 w-3 h-3 rounded-full bg-blue-300/60" style={{ animation: 'goals-dot-float 2.4s ease-in-out infinite' }} />
          <div className="absolute bottom-10 left-14 w-2 h-2 rounded-full bg-violet-300/60" style={{ animation: 'goals-dot-float 2.8s ease-in-out infinite', animationDelay: '0.8s' }} />
          <div className="absolute bottom-14 left-9 w-1.5 h-1.5 rounded-full bg-indigo-200/50" style={{ animation: 'goals-dot-float 3.2s ease-in-out infinite', animationDelay: '1.6s' }} />
          {/* 별 반짝임 */}
          <div className="absolute top-4 right-16 text-white/50 text-xs" style={{ animation: 'goals-star 2.5s ease-in-out infinite' }}>✦</div>
          <div className="absolute top-10 right-10 text-white/40 text-[10px]" style={{ animation: 'goals-star 3s ease-in-out infinite', animationDelay: '1.2s' }}>✦</div>
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
          {/* AnimatedLogo */}
          <style>{`
            @keyframes goals-logo-dream {
              0%,100% { transform: translateY(0) rotate(-4deg) scale(1); filter: drop-shadow(0 0 8px rgba(167,139,250,0.4)); }
              50% { transform: translateY(-14px) rotate(4deg) scale(1.07); filter: drop-shadow(0 0 18px rgba(167,139,250,0.7)); }
            }
          `}</style>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-75 hidden sm:block"
            style={{ animation: 'goals-logo-dream 4s ease-in-out infinite' }}>
            <AnimatedLogo size={108} />
          </div>
        </div>

        <div className="relative flex items-start justify-between gap-6">
          <div className="space-y-3 flex-1 min-w-0" style={{ fontFamily: "'Sunflower', sans-serif" }}>
            <div className="flex items-center gap-1.5 text-blue-200 text-xs font-semibold tracking-widest uppercase">
              <Target className="h-3.5 w-3.5" />
              재정 목표
            </div>
            <h1 className="text-3xl font-bold tracking-tight leading-tight" style={{ fontFamily: "'Sunflower', sans-serif" }}>
              나의 목표
            </h1>
            <p className="text-blue-100/70 text-sm leading-relaxed">
              꿈꾸는 자산에 한 걸음씩 —&nbsp;
              <span className="text-blue-100/90 font-medium">오늘의 결심이 내일의 자유가 됩니다</span>
            </p>
          </div>

          <div className="shrink-0 pt-1">
            <GoalCreateButton />
          </div>
        </div>
      </div>

      <Suspense fallback={<GoalsContentSkeleton />}>
        <GoalsContent userId={user.id} pageStart={pageStart} />
      </Suspense>
    </div>
  )
}

function GoalsContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 py-4">
                <Skeleton className="h-9 w-9 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <Skeleton className="h-1.5 rounded-full" style={{ width: `${[65, 30, 80][i]}%` }} />
                  </div>
                </div>
                <Skeleton className="h-3.5 w-14 flex-shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex-1">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  )
}

async function GoalsContent({ userId, pageStart }: { userId: string; pageStart: number }) {
  const [goals, snapshots, { performances, priceMap }] = await timed('GoalsPage data', () => Promise.all([
    listGoals(userId),
    getAllSnapshots(userId),
    loadPerformances(userId),
  ]))
  perfLog('GoalsPage total', pageStart)

  const fxCache = priceMap.get('USD_KRW')
  const fxRateInt: number | null = fxCache?.priceKrw ?? null
  const summary = computePortfolio(performances, fxRateInt ?? 0)
  const currentValueKrw = summary.totalValueKrw

  const totalTarget = goals.reduce((s, g) => s + g.targetAmountKrw, 0)
  const nearestDeadline = [...goals]
    .filter(g => g.targetDate)
    .sort((a, b) => (a.targetDate ?? '').localeCompare(b.targetDate ?? ''))[0]?.targetDate ?? null

  const grouped = performances.reduce<Record<string, typeof performances>>((acc, a) => {
    if (!acc[a.assetType]) acc[a.assetType] = []
    acc[a.assetType].push(a)
    return acc
  }, {})

  return (
    <>
      {/* 포트폴리오 스탯 */}
      <SummaryCards grouped={grouped} performances={performances} showTypeStrip={false} />

      {/* 상단: 나의 목표 + 진행 현황 나란히 */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        <div className="flex-1 min-w-0 flex flex-col">
          <GoalListClient goals={goals} />
        </div>
        <div className="hidden lg:block w-px bg-border" />
        <div className="flex-1 min-w-0 flex flex-col">
          <GoalProgressChart goals={goals} currentValueKrw={currentValueKrw} />
        </div>
      </div>
      <Separator className="bg-border" />

      {/* 하단: 날짜별 달성률 */}
      <GoalAchievementChart goals={goals} snapshots={snapshots} />
    </>
  )
}
