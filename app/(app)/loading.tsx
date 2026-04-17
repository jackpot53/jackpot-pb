import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Hero 배너 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-700 via-indigo-700 to-violet-800 p-6 sm:p-8 shadow-xl">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 bg-white/25" />
          <Skeleton className="h-8 w-40 bg-white/30" />
          <Skeleton className="h-3 w-56 bg-white/18" />
        </div>
      </div>

      {/* 통계 카드 4개 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-20" />
            </CardHeader>
            <CardContent className="space-y-1">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 파이차트 + 자산 목록 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <Skeleton className="h-36 w-36 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-2.5 w-2.5 rounded-full flex-shrink-0" />
                  <Skeleton className="h-3 flex-1" style={{ width: `${[100, 70, 85, 60][i]}%` }} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-border/50">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
                <Skeleton className="h-3.5 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
