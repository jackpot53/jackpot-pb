import { Suspense } from 'react'
import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { refreshAllPricesInternal } from '@/app/actions/prices'
import { loadPerformances } from '@/lib/server/load-performances'
import { getMarketFlow } from '@/lib/market-flow'
import { InsightsHero } from '@/components/app/insights-hero'
import { TodayReport } from '@/components/app/today-report'
import { MarketFlowSection } from '@/components/app/market-flow-section'

export default async function InsightsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  after(() => { void refreshAllPricesInternal().catch(() => {}) })

  const now = new Date()
  const yearStr = now.toLocaleDateString('ko-KR', { year: 'numeric' })

  const [{ performances }, marketFlow] = await Promise.all([
    loadPerformances(user.id),
    getMarketFlow(),
  ])

  return (
    <div className="space-y-6">
      <InsightsHero yearStr={yearStr} />

      <TodayReport performances={performances} />

      <MarketFlowSection data={marketFlow} />
    </div>
  )
}

