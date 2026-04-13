'use client'
import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AssetTypeBadge } from '@/components/app/asset-type-badge'
import { StalePriceBadge } from '@/components/app/stale-price-badge'
import { formatKrw, formatReturn, formatQty, type AssetPerformance } from '@/lib/portfolio'
import { cn } from '@/lib/utils'

type SortKey = 'avgCostPerUnit' | 'currentPriceKrw' | 'currentValueKrw' | 'returnPct'
type SortDir = 'asc' | 'desc'

const SORT_LABELS: Record<SortKey, string> = {
  avgCostPerUnit: '평단가 순',
  currentPriceKrw: '현재가 순',
  currentValueKrw: '평가금액 순',
  returnPct: '수익률 순',
}

// Next.js App Router serializes Date to ISO string when passing Server → Client props.
// Accept both Date and string to handle both environments (runtime and SSR hydration).
type SerializedAssetPerformance = Omit<AssetPerformance, 'cachedAt'> & {
  cachedAt: Date | string | null
}

interface PerformanceTableProps {
  rows: SerializedAssetPerformance[]
}

export function PerformanceTable({ rows }: PerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('returnPct')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const multiplier = sortDir === 'desc' ? -1 : 1
    return (a[sortKey] - b[sortKey]) * multiplier
  })

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return null
    return sortDir === 'desc'
      ? <ChevronDown className="inline ml-1 h-3.5 w-3.5" />
      : <ChevronUp className="inline ml-1 h-3.5 w-3.5" />
  }

  function SortableHead({
    column,
    children,
    className,
  }: {
    column: SortKey
    children: React.ReactNode
    className?: string
  }) {
    return (
      <TableHead
        className={cn('cursor-pointer select-none hover:text-foreground', className)}
        onClick={() => handleSort(column)}
      >
        {children}
        <SortIcon column={column} />
      </TableHead>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 pt-12 pb-8 text-center">
        <p className="text-base font-semibold text-foreground">보유 종목이 없습니다</p>
        <p className="text-sm text-muted-foreground">
          자산 메뉴에서 종목을 추가하고 거래 내역을 입력하세요.
        </p>
        <Link href="/assets/new" className={buttonVariants({ variant: 'outline' })}>
          자산 추가
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Sort state label — right-aligned, 14px muted */}
      <div className="mb-2 flex justify-end">
        <span className="text-sm text-muted-foreground">{SORT_LABELS[sortKey]}</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>종목명</TableHead>
            <TableHead>유형</TableHead>
            <TableHead className="text-right">수량</TableHead>
            <SortableHead column="avgCostPerUnit" className="text-right">
              평단가(KRW)
            </SortableHead>
            <SortableHead column="currentPriceKrw" className="text-right">
              현재가
            </SortableHead>
            <SortableHead column="currentValueKrw" className="text-right">
              평가금액(KRW)
            </SortableHead>
            <SortableHead column="returnPct" className="text-right">
              수익률(%)
            </SortableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => {
            const isCrypto = row.assetType === 'crypto'
            const returnSign =
              row.returnPct > 0
                ? 'text-emerald-600'
                : row.returnPct < 0
                ? 'text-red-600'
                : 'text-muted-foreground'

            // Normalize cachedAt: Next.js serializes Date → ISO string across Server/Client boundary
            const cachedAtDate =
              row.cachedAt instanceof Date
                ? row.cachedAt
                : row.cachedAt
                ? new Date(row.cachedAt)
                : null

            return (
              <TableRow key={row.assetId} className="min-h-[44px]">
                {/* 종목명 */}
                <TableCell className="text-base font-normal">{row.name}</TableCell>

                {/* 유형 */}
                <TableCell>
                  <AssetTypeBadge assetType={row.assetType} />
                </TableCell>

                {/* 수량 — monospace */}
                <TableCell className="text-right font-mono text-sm">
                  {formatQty(row.totalQuantity, isCrypto)}
                </TableCell>

                {/* 평단가(KRW) */}
                <TableCell className="text-right text-sm">
                  {formatKrw(row.avgCostPerUnit)}
                </TableCell>

                {/* 현재가 — stale badge for LIVE stale; plain value for MANUAL */}
                <TableCell className="text-right text-sm">
                  <span>{formatKrw(row.currentPriceKrw)}</span>
                  {row.priceType === 'live' && row.isStale && cachedAtDate && (
                    <StalePriceBadge cachedAt={cachedAtDate} />
                  )}
                </TableCell>

                {/* 평가금액(KRW) — semibold */}
                <TableCell className="text-right text-base font-semibold">
                  {formatKrw(row.currentValueKrw)}
                </TableCell>

                {/* 수익률(%) — color coded */}
                <TableCell className={cn('text-right text-sm', returnSign)}>
                  {formatReturn(row.returnPct)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
