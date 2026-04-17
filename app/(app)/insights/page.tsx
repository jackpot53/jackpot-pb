import { Suspense } from 'react'
import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { refreshAllPricesInternal } from '@/app/actions/prices'
import { loadPerformances } from '@/lib/server/load-performances'
import { fetchMarketNewsForTypes } from '@/lib/market-news/fetch'
import { getMarketFlow } from '@/lib/market-flow'
import { InsightsHero } from '@/components/app/insights-hero'
import { TodayReport } from '@/components/app/today-report'
import { MarketFlowSection } from '@/components/app/market-flow-section'
import type { AssetPerformance } from '@/lib/portfolio/portfolio'

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

      <Suspense fallback={<TodayReport performances={performances} />}>
        <TodayReportWithNews performances={performances} />
      </Suspense>

      <MarketFlowSection data={marketFlow} />
    </div>
  )
}

async function TodayReportWithNews({ performances }: { performances: AssetPerformance[] }) {
  const assetTypes = [...new Set(performances.map((a) => a.assetType))]
  const news = await fetchMarketNewsForTypes(assetTypes)
  return <TodayReport performances={performances} news={news} />
}
