import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function GoalsLoading() {
  return (
    <div className="space-y-6">
      {/* Hero 배너 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-8 shadow-xl">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16 bg-white/25" />
          <Skeleton className="h-8 w-32 bg-white/30" />
          <Skeleton className="h-3 w-44 bg-white/18" />
        </div>
      </div>

      {/* 미니 통계 카드 3개 */}
      <div className="grid grid-cols-3 gap-4 md:grid-cols-1">
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

      {/* 목표 항목 3개 */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 py-4">
              <Skeleton className="h-9 w-9 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <Skeleton className="h-1.5 rounded-full" style={{ width: `${[65, 30, 80][i]}%` }} />
                </div>
              </div>
              <Skeleton className="h-3.5 w-14 flex-shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
