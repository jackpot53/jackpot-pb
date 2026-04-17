import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function AssetsLoading() {
  return (
    <div className="space-y-6">
      {/* Hero 배너 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-8 shadow-xl">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 bg-white/25" />
          <Skeleton className="h-8 w-36 bg-white/30" />
          <Skeleton className="h-3 w-52 bg-white/18" />
        </div>
      </div>

      {/* 미니 통계 카드 3개 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 자산 테이블 */}
      <Card>
        <CardContent className="divide-y divide-border/50 pt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="h-5 w-12 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-18" />
              </div>
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
