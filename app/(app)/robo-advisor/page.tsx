import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { getUniverseWithSignals, getBacktestStatsMap } from '@/db/queries/robo-advisor'
import { RoboAdvisorPageClient } from '@/components/app/robo-advisor-page-client'
import { RoboAdvisorHero } from '@/components/app/robo-advisor-hero'
import { Skeleton } from '@/components/ui/skeleton'

export default async function RoboAdvisorPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      {/* 히어로 배너 */}
      <RoboAdvisorHero />

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {Array.from({ length: 60 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px] rounded-lg" />
              ))}
            </div>
          </div>
        }
      >
        <RoboAdvisorContent />
      </Suspense>
    </div>
  )
}

async function RoboAdvisorContent() {
  const [universe, statsMap] = await Promise.all([
    getUniverseWithSignals(),
    getBacktestStatsMap(),
  ])
  return <RoboAdvisorPageClient universe={universe} statsMap={statsMap} />
}
