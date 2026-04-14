import { loadPerformances } from '@/lib/server/load-performances'
import { Card, CardContent } from '@/components/ui/card'
import { PerformanceFilterClient } from '@/components/app/performance-filter-client'

export default async function PerformancePage() {
  // Get cached prices — do NOT call refreshAllPrices() on this page
  // Dashboard is the canonical price refresh trigger (see RESEARCH.md open question resolution)
  const { performances } = await loadPerformances()

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">성과 비교</h1>
      <Card>
        <CardContent className="pt-6">
          <PerformanceFilterClient rows={performances} />
        </CardContent>
      </Card>
    </div>
  )
}
