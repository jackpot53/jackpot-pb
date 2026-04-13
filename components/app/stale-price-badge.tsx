'use client'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface StalePriceBadgeProps {
  cachedAt: Date
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const rtf = new Intl.RelativeTimeFormat('ko-KR', { numeric: 'auto' })
  if (diffHours >= 1) {
    return rtf.format(-diffHours, 'hour')
  }
  return rtf.format(-Math.max(1, diffMinutes), 'minute')
}

function formatAbsoluteTime(date: Date): string {
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function StalePriceBadge({ cachedAt }: StalePriceBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className="cursor-default"
          aria-label="오래된 가격 정보"
        >
          <Badge
            variant="outline"
            className="ml-2 bg-amber-50 border-amber-200 text-amber-600 text-xs cursor-default"
          >
            오래된 가격 · {formatRelativeTime(cachedAt)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>마지막 업데이트: {formatAbsoluteTime(cachedAt)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
