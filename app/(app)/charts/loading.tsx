import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function ChartsLoading() {
  return (
    <div className="space-y-6">
      {/* Hero 배너 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-700 via-indigo-700 to-violet-800 p-6 sm:p-8 shadow-xl">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 bg-white/25" />
          <Skeleton className="h-8 w-32 bg-white/30" />
          <Skeleton className="h-3 w-48 bg-white/18" />
        </div>
      </div>

      {/* 차트 카드 2×2 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-l-4 border-l-slate-300 dark:border-l-slate-600">
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-28 mt-1" />
              <Skeleton className="h-2.5 w-20 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[240px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
