import { Suspense } from 'react'
import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { refreshAllPricesInternal } from '@/app/actions/prices'
import { loadPerformances } from '@/lib/server/load-performances'
import { TodayReport } from '@/components/app/today-report'
import { TodayHero } from '@/components/app/today-hero'
import { MarketFlowSection } from '@/components/app/market-flow-section'
import { fetchMarketNewsForTypes } from '@/lib/market-news/fetch'
import { getMarketFlow } from '@/lib/market-flow'
import type { AssetPerformance } from '@/lib/portfolio/portfolio'

export default async function TodayInsightPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  after(() => { void refreshAllPricesInternal().catch(() => {}) })

  const [{ performances }, marketFlow] = await Promise.all([
    loadPerformances(user.id),
    getMarketFlow(),
  ])

  const now = new Date()
  const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const dayStr = now.toLocaleDateString('ko-KR', { weekday: 'short' })

  return (
    <div className="space-y-6">
      <TodayHero dateStr={dateStr} dayStr={dayStr} />

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
