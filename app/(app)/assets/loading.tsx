import { Skeleton } from '@/components/ui/skeleton'

function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

function TodayReportSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <Skeleton className="h-3.5 w-24" />
      <div className="flex gap-4">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  )
}

function AssetSectionSkeleton() {
  return (
    <div className="space-y-2">
      {/* CollapsibleChart 헤더 */}
      <div className="rounded-xl border border-border bg-card px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      {/* 자산 카드 2개 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-sm border border-gray-200 bg-white flex overflow-hidden">
            <div className="w-1.5 shrink-0 bg-muted" />
            <div className="flex flex-col flex-1 gap-2 px-4 py-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-5 w-12 ml-auto rounded-none" />
              </div>
              <div className="flex items-center gap-2 pt-1.5 border-t border-black/[0.05]">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex items-center gap-2 pt-1.5 border-t border-black/[0.05]">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AssetsLoading() {
  return (
    <div className="space-y-6">
      <SummaryCardsSkeleton />
      <TodayReportSkeleton />
      {/* 필터 셀렉트 */}
      <div className="flex gap-2 justify-center">
        <Skeleton className="h-8 w-36 rounded-md" />
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>
      {/* 자산 섹션 3개 */}
      {Array.from({ length: 3 }).map((_, i) => (
        <AssetSectionSkeleton key={i} />
      ))}
    </div>
  )
}
