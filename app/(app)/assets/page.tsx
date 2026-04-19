import { Suspense } from 'react'
import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { Wallet, PlusCircle } from 'lucide-react'
import { getAuthUser } from '@/utils/supabase/server'
import { refreshAllPricesInternal } from '@/app/actions/prices'
import { loadPerformances } from '@/lib/server/load-performances'
import { getAllSnapshotsWithBreakdowns } from '@/db/queries/portfolio-snapshots'
import { toMonthlyData, toAnnualData, toDailyData, snapshotsForType } from '@/lib/snapshot/aggregation'
import { AssetsPageClient } from '@/components/app/assets-page-client'
import Link from 'next/link'
import { timed } from '@/lib/perf'

export default async function AssetsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
            <Wallet className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">내 포트폴리오</h1>
            <p className="text-xs text-muted-foreground mt-0.5">보유 자산을 등록하고 실시간 수익률을 추적합니다</p>
          </div>
        </div>
        <Link
          href="/assets/new"
          className="group flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors shrink-0"
        >
          <PlusCircle className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
          자산 추가
        </Link>
      </div>

      <Suspense fallback={
        <div className="h-96 rounded-2xl bg-muted/40 animate-pulse" />
      }>
        <AssetsContent userId={user.id} />
      </Suspense>
    </div>
  )
}

async function AssetsContent({ userId }: { userId: string }) {
  const pageStart = performance.now()
  // Fire-and-forget: refresh prices in the background after response is sent
  after(() => { void refreshAllPricesInternal().catch(() => {}) })

  const [{ performances }, snapshots] = await timed('AssetsPage data', () => Promise.all([
    loadPerformances(userId),
    getAllSnapshotsWithBreakdowns(userId),
  ]))
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[perf] AssetsPage total                     ${(performance.now() - pageStart).toFixed(0).padStart(5)}ms`)
  }

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

  return (
    <AssetsPageClient
      performances={performances}
      sparklines={{}}
      monthlyData={monthlyData}
      annualData={annualData}
      monthlyByType={monthlyByType}
      annualByType={annualByType}
      dailyByType={dailyByType}
    />
  )
}
