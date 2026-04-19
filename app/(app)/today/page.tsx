import { Suspense } from 'react'
import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { refreshAllPricesInternal } from '@/app/actions/prices'
import { loadPerformances } from '@/lib/server/load-performances'
import { TodayReport } from '@/components/app/today-report'
import { TodayHero } from '@/components/app/today-hero'
import { SummaryCards } from '@/components/app/assets-page-client'
import { TodayAssetPnl } from '@/components/app/today-asset-pnl'

export default async function TodayInsightPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  after(() => { void refreshAllPricesInternal().catch(() => {}) })

  const { performances } = await loadPerformances(user.id)

  const grouped = performances.reduce<Record<string, typeof performances>>((acc, a) => {
    if (!acc[a.assetType]) acc[a.assetType] = []
    acc[a.assetType].push(a)
    return acc
  }, {})

  const now = new Date()
  const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const dayStr = now.toLocaleDateString('ko-KR', { weekday: 'short' })

  return (
    <div className="space-y-6">
      <TodayHero dateStr={dateStr} dayStr={dayStr} />

      <SummaryCards grouped={grouped} performances={performances} />

      <TodayReport performances={performances} />

      <TodayAssetPnl performances={performances} />
    </div>
  )
}

