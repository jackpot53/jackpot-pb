import { Suspense } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AnnualReturnChart } from '@/components/app/annual-return-chart'
import { MonthlyPortfolioChart } from '@/components/app/monthly-portfolio-chart'
import { PortfolioCharts } from '@/components/app/portfolio-charts'
import { getAllSnapshots } from '@/db/queries/portfolio-snapshots'
import { toAnnualData, toMonthlyData } from '@/lib/snapshot/aggregation'
import { loadPerformances } from '@/lib/server/load-performances'
import { refreshAllPrices } from '@/app/actions/prices'

function ChartPageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  )
}

async function ChartsPageContent() {
  // Load current performances and snapshots in parallel
  const [{ performances }, snapshots] = await Promise.all([
    (async () => { await refreshAllPrices(); return loadPerformances() })(),
    getAllSnapshots().catch(() => []),
  ])

  const annualData = toAnnualData(snapshots)
  const monthlyData = toMonthlyData(snapshots)

  return (
    <Tabs defaultValue="current" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="current" className="flex-1">현황</TabsTrigger>
        <TabsTrigger value="annual" className="flex-1">연간</TabsTrigger>
        <TabsTrigger value="monthly" className="flex-1">월간</TabsTrigger>
      </TabsList>

      <TabsContent value="current" className="mt-6">
        <PortfolioCharts performances={performances} />
      </TabsContent>

      <TabsContent value="annual" className="mt-6">
        <AnnualReturnChart data={annualData} />
      </TabsContent>

      <TabsContent value="monthly" className="mt-6">
        <MonthlyPortfolioChart data={monthlyData} />
      </TabsContent>
    </Tabs>
  )
}

export default function ChartsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">차트</h1>
      <Suspense fallback={<ChartPageSkeleton />}>
        <ChartsPageContent />
      </Suspense>
    </div>
  )
}
