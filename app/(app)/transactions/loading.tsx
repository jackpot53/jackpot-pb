import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export default function TransactionsLoading() {
  return (
    <div className="space-y-4">
      {/* Hero 배너 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-teal-600 via-cyan-600 to-sky-700 p-6 sm:p-8 shadow-xl">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 bg-white/25" />
          <Skeleton className="h-8 w-36 bg-white/30" />
          <Skeleton className="h-3 w-48 bg-white/18" />
        </div>
      </div>

      {/* 필터 칩 */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded-full" style={{ width: `${[72, 60, 80][i]}px` }} />
        ))}
      </div>

      {/* 거래 행 */}
      <Card>
        <CardContent className="divide-y divide-border/50 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-18" />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2.5 w-12" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
