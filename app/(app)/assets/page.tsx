import { redirect } from 'next/navigation'
import { Wallet } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { refreshAllPrices } from '@/app/actions/prices'
import { loadPerformances } from '@/lib/server/load-performances'
import { fetchSparklinesForTickers } from '@/lib/price/sparkline'
import { getAllSnapshotsWithBreakdowns } from '@/db/queries/portfolio-snapshots'
import { toMonthlyData, toAnnualData, snapshotsForType } from '@/lib/snapshot/aggregation'
import { Separator } from '@/components/ui/separator'
import { AssetsPageClient } from '@/components/app/assets-page-client'
import { AddAssetDialog } from '@/components/app/add-asset-dialog'

export default async function AssetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await refreshAllPrices()
  const [{ performances }, snapshots] = await Promise.all([
    loadPerformances(user.id),
    getAllSnapshotsWithBreakdowns(user.id),
  ])

  const liveTickers = [
    ...new Set(
      performances
        .filter((p) => p.priceType === 'live' && p.ticker)
        .map((p) => p.ticker!)
    ),
  ]
  const sparklines = await fetchSparklinesForTickers(liveTickers)
  const sparklinesObj = Object.fromEntries(sparklines)

  const monthlyData = toMonthlyData(snapshots)
  const annualData = toAnnualData(snapshots)

  const assetTypes = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'savings', 'real_estate'] as const
  const monthlyByType: Record<string, ReturnType<typeof toMonthlyData>> = {}
  const annualByType: Record<string, ReturnType<typeof toAnnualData>> = {}
  for (const type of assetTypes) {
    const typeSnaps = snapshotsForType(snapshots, type)
    monthlyByType[type] = toMonthlyData(typeSnaps)
    annualByType[type] = toAnnualData(typeSnaps)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Wallet className="h-5 w-5" />
          내 자산
        </h1>
        <AddAssetDialog />
      </div>
      <Separator className="bg-foreground" />
      <AssetsPageClient
        performances={performances}
        sparklines={sparklinesObj}
        monthlyData={monthlyData}
        annualData={annualData}
        monthlyByType={monthlyByType}
        annualByType={annualByType}
      />
    </div>
  )
}
