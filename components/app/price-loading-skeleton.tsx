import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function StatCardSkeleton() {
  return (
    <Card className="border-l-4 border-l-slate-300 dark:border-l-slate-600">
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-1 h-4 w-20" />
      </CardContent>
    </Card>
  )
}

export function PieChartSkeleton() {
  return <Skeleton className="h-[300px] w-full rounded-xl" />
}

export function BreakdownSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-5 w-full" />
      ))}
    </div>
  )
}
