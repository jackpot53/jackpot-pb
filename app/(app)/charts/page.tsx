import { Suspense } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AnnualReturnChart } from '@/components/app/annual-return-chart'
import { MonthlyPortfolioChart } from '@/components/app/monthly-portfolio-chart'
import { getAllSnapshots } from '@/db/queries/portfolio-snapshots'
import { toAnnualData, toMonthlyData } from '@/lib/snapshot/aggregation'

// Skeleton shown while data is loading (Suspense fallback)
function ChartPageSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <Skeleton className="h-[400px] w-full" />
      </CardContent>
    </Card>
  )
}

// Inner async component (wrapped in Suspense)
async function ChartsPageContent() {
  let snapshots
  try {
    snapshots = await getAllSnapshots()
  } catch (error) {
    // Error state per UI-SPEC copywriting contract
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-[400px] gap-3 pt-6">
          <p className="text-base font-semibold text-foreground">
            차트 데이터를 불러오지 못했습니다
          </p>
          <p className="text-sm text-muted-foreground">
            잠시 후 페이지를 새로고침하세요.
          </p>
        </CardContent>
      </Card>
    )
  }

  const annualData = toAnnualData(snapshots)
  const monthlyData = toMonthlyData(snapshots)

  return (
    // Tabs: default to "annual" (연간), per D-08
    <Tabs defaultValue="annual" className="w-full">
      <TabsList>
        <TabsTrigger value="annual">연간</TabsTrigger>
        <TabsTrigger value="monthly">월간</TabsTrigger>
      </TabsList>
      <TabsContent value="annual">
        <AnnualReturnChart data={annualData} />
      </TabsContent>
      <TabsContent value="monthly">
        <MonthlyPortfolioChart data={monthlyData} />
      </TabsContent>
    </Tabs>
  )
}

// Page component — Server Component (no 'use client')
// Route: /charts — under app/(app)/ so protected by Supabase session middleware (D-09)
export default function ChartsPage() {
  return (
    <Suspense fallback={<ChartPageSkeleton />}>
      <ChartsPageContent />
    </Suspense>
  )
}
