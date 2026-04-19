import { Suspense } from 'react'
import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { refreshAllPricesInternal } from '@/app/actions/prices'
import { loadPerformances } from '@/lib/server/load-performances'
import { getAllSnapshotsWithBreakdowns } from '@/db/queries/portfolio-snapshots'
import { toMonthlyData, toAnnualData, toDailyData, snapshotsForType } from '@/lib/snapshot/aggregation'
import { AssetsPageClient } from '@/components/app/assets-page-client'
import { SummaryCards } from '@/components/app/summary-cards'
import { timed, perfMark, perfLog } from '@/lib/perf'
import { AssetsHero } from '@/components/app/assets-hero'

export default async function AssetsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <AssetsHero />

      <Suspense fallback={
        <div className="h-96 rounded-2xl bg-muted/40 animate-pulse" />
      }>
        <AssetsContent userId={user.id} />
      </Suspense>
    </div>
  )
}

async function AssetsContent({ userId }: { userId: string }) {
  const pageStart = perfMark()
  // Fire-and-forget: refresh prices in the background after response is sent
  after(() => { void refreshAllPricesInternal().catch(() => {}) })

  const [{ performances }, snapshots] = await timed('AssetsPage data', () => Promise.all([
    loadPerformances(userId),
    getAllSnapshotsWithBreakdowns(userId),
  ]))
  perfLog('AssetsPage total', pageStart)

  const monthlyData = toMonthlyData(snapshots)
  const annualData = toAnnualData(snapshots)

  const assetTypes = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'savings', 'real_estate', 'insurance', 'precious_metal'] as const
  const monthlyByType: Record<string, ReturnType<typeof toMonthlyData>> = {}
  const annualByType: Record<string, ReturnType<typeof toAnnualData>> = {}
  const dailyByType: Record<string, ReturnType<typeof toDailyData>> = {}
  for (const type of assetTypes) {
    const typeSnaps = snapshotsForType(snapshots, type)
    monthlyByType[type] = toMonthlyData(typeSnaps)
    annualByType[type] = toAnnualData(typeSnaps)
    dailyByType[type] = toDailyData(typeSnaps)
  }

  const grouped = performances.reduce<Record<string, typeof performances>>((acc, a) => {
    if (!acc[a.assetType]) acc[a.assetType] = []
    acc[a.assetType].push(a)
    return acc
  }, {})

  return (
    <>
      <SummaryCards grouped={grouped} performances={performances} showTypeStrip={false} />
      <AssetsPageClient
        performances={performances}
        sparklines={{}}
        monthlyData={monthlyData}
        annualData={annualData}
        monthlyByType={monthlyByType}
        annualByType={annualByType}
        dailyByType={dailyByType}
      />
    </>
  )
}
