import { Suspense } from 'react'
import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { refreshAllPricesInternal } from '@/app/actions/prices'
import { loadPerformances } from '@/lib/server/load-performances'
import { TodayReport } from '@/components/app/today-report'
import { TodayHero } from '@/components/app/today-hero'
import { SummaryCards } from '@/components/app/summary-cards'
import { TodayAssetPnl } from '@/components/app/today-asset-pnl'
import { Skeleton } from '@/components/ui/skeleton'

export default async function TodayInsightPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const now = new Date()
  const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const dayStr = now.toLocaleDateString('ko-KR', { weekday: 'short' })

  return (
    <div className="space-y-6">
      <TodayHero dateStr={dateStr} dayStr={dayStr} />

      <Suspense fallback={<TodayContentSkeleton />}>
        <TodayContent userId={user.id} />
      </Suspense>
    </div>
  )
}

async function TodayContent({ userId }: { userId: string }) {
  after(() => { void refreshAllPricesInternal().catch(() => {}) })

  const { performances } = await loadPerformances(userId)

  const grouped = performances.reduce<Record<string, typeof performances>>((acc, a) => {
    if (!acc[a.assetType]) acc[a.assetType] = []
    acc[a.assetType].push(a)
    return acc
  }, {})

  return (
    <>
      <SummaryCards grouped={grouped} performances={performances} />
      <TodayReport performances={performances} />
      <TodayAssetPnl performances={performances} />
    </>
  )
}

function TodayContentSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </>
  )
}
