'use client'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown, Layers, LayoutGrid, TrendingUp, BarChart2, Bitcoin, Building2, PiggyBank, BookOpen } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { EditAssetDialog } from '@/components/app/edit-asset-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { AssetTypeBadge } from '@/components/app/asset-type-badge'
import { cn } from '@/lib/utils'
import { StalePriceBadge } from '@/components/app/stale-price-badge'
import { formatKrw, formatReturn, formatQty } from '@/lib/portfolio'
import type { AssetPerformance } from '@/lib/portfolio'

const ASSET_TYPE_ORDER = [
  'stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'savings', 'real_estate',
] as const

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  isa: 'ISA',
  irp: 'IRP',
  pension: '연금저축',
  dc: 'DC',
  brokerage: '위탁',
  spot: '현물',
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  stock_kr: '주식 (국내)',
  stock_us: '주식 (미국)',
  etf_kr: 'ETF (국내)',
  etf_us: 'ETF (미국)',
  crypto: '코인',
  fund: '펀드',
  savings: '예적금',
  real_estate: '부동산',
}

const ASSET_TYPE_ICONS: Record<string, React.ElementType> = {
  stock_kr: TrendingUp,
  stock_us: TrendingUp,
  etf_kr: BarChart2,
  etf_us: BarChart2,
  crypto: Bitcoin,
  fund: BookOpen,
  savings: PiggyBank,
  real_estate: Building2,
}

type SortKey = 'name' | 'totalQuantity' | 'avgCostPerUnit' | 'currentPriceKrw' | 'totalCostKrw' | 'currentValueKrw' | 'profit'
type SortDir = 'asc' | 'desc'

function sortAssets(assets: AssetPerformance[], key: SortKey, dir: SortDir) {
  return [...assets].sort((a, b) => {
    let av: number | string
    let bv: number | string
    if (key === 'name') {
      av = a.name
      bv = b.name
    } else if (key === 'profit') {
      av = a.currentValueKrw - a.totalCostKrw
      bv = b.currentValueKrw - b.totalCostKrw
    } else {
      av = a[key]
      bv = b[key]
    }
    if (av < bv) return dir === 'asc' ? -1 : 1
    if (av > bv) return dir === 'asc' ? 1 : -1
    return 0
  })
}

function SortableHead({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className,
  align = 'right',
}: {
  label: string
  sortKey: SortKey
  current: SortKey | null
  dir: SortDir
  onSort: (key: SortKey) => void
  className?: string
  align?: 'left' | 'center' | 'right'
}) {
  const isActive = current === sortKey
  const justify = align === 'center' ? 'justify-center' : align === 'left' ? 'justify-start' : 'justify-end'
  return (
    <TableHead
      className={cn('cursor-pointer select-none whitespace-nowrap', className)}
      onClick={() => onSort(sortKey)}
    >
      <span className={cn('inline-flex items-center gap-1 w-full', justify)}>
        {label}
        {isActive ? (
          dir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
        ) : (
          <ArrowUpDown size={13} className="text-muted-foreground/40" />
        )}
      </span>
    </TableHead>
  )
}

function AssetRow({ asset }: { asset: AssetPerformance }) {
  const hasHolding = asset.totalQuantity > 0
  const isCrypto = asset.assetType === 'crypto'
  const hasValue = asset.currentValueKrw > 0
  const hasCost = asset.totalCostKrw > 0

  const currentPriceCell =
    asset.priceType === 'live' && asset.ticker ? (
      <span className="flex items-center justify-end gap-1">
        {asset.currentPriceKrw > 0 ? formatKrw(asset.currentPriceKrw) : '—'}
        {asset.isStale && asset.currentPriceKrw > 0 && asset.cachedAt && <StalePriceBadge cachedAt={asset.cachedAt} />}
      </span>
    ) : asset.assetType === 'fund' && asset.currentPriceKrw > 0 ? (
      formatKrw(asset.currentPriceKrw)
    ) : '—'

  return (
    <TableRow>
      <TableCell className="text-center px-1">
        <Link href={`/assets/${asset.assetId}`} className="hover:underline font-medium">
          {asset.name}
        </Link>
      </TableCell>
      <TableCell className="text-center">
        {asset.accountType ? (
          <span className="text-xs border rounded-full px-2 py-0.5 text-muted-foreground">
            {ACCOUNT_TYPE_LABELS[asset.accountType]}
          </span>
        ) : '—'}
      </TableCell>
      <TableCell className="text-sm text-right font-mono">
        {hasHolding ? formatQty(asset.totalQuantity, isCrypto) : '—'}
      </TableCell>
      <TableCell className="text-sm text-right">
        {asset.avgCostPerUnit > 0 ? formatKrw(asset.avgCostPerUnit) : '—'}
      </TableCell>
      <TableCell className="text-sm text-right">{currentPriceCell}</TableCell>
      <TableCell className="text-sm text-right">
        {hasCost ? formatKrw(asset.totalCostKrw) : '—'}
      </TableCell>
      <TableCell className="text-sm text-right">
        {hasValue ? formatKrw(asset.currentValueKrw) : '—'}
      </TableCell>
      <TableCell className="text-right">
        {hasValue && hasCost ? (
          <span className={`text-lg font-semibold ${asset.returnPct >= 0 ? 'text-red-500' : 'text-blue-600'}`}>
            {formatKrw(asset.currentValueKrw - asset.totalCostKrw)}
            <span className="text-base font-medium ml-1 opacity-80">{formatReturn(asset.returnPct)}</span>
          </span>
        ) : '—'}
      </TableCell>
      <TableCell className="text-center">
        <EditAssetDialog asset={asset} />
      </TableCell>
    </TableRow>
  )
}

type MergedAsset = AssetPerformance & { mergedCount: number }

function mergeAssets(assets: AssetPerformance[]): MergedAsset[] {
  const map = new Map<string, MergedAsset>()
  for (const a of assets) {
    const key = a.ticker ?? a.name
    const existing = map.get(key)
    if (!existing) {
      map.set(key, { ...a, mergedCount: 1 })
    } else {
      const totalCostKrw = existing.totalCostKrw + a.totalCostKrw
      const totalQuantity = existing.totalQuantity + a.totalQuantity
      const currentValueKrw = existing.currentValueKrw + a.currentValueKrw
      const returnPct = totalCostKrw > 0 ? ((currentValueKrw - totalCostKrw) / totalCostKrw) * 100 : 0
      map.set(key, {
        ...existing,
        totalQuantity,
        totalCostKrw,
        currentValueKrw,
        returnPct,
        isStale: existing.isStale || a.isStale,
        missingValuation: existing.missingValuation || a.missingValuation,
        mergedCount: existing.mergedCount + 1,
      })
    }
  }
  return Array.from(map.values())
}

function MergedAssetRow({ asset }: { asset: MergedAsset }) {
  const hasHolding = asset.totalQuantity > 0
  const isCrypto = asset.assetType === 'crypto'
  const hasValue = asset.currentValueKrw > 0
  const hasCost = asset.totalCostKrw > 0

  const currentPriceCell =
    asset.priceType === 'live' && asset.ticker ? (
      <span className="flex items-center justify-end gap-1">
        {asset.currentPriceKrw > 0 ? formatKrw(asset.currentPriceKrw) : '—'}
        {asset.isStale && asset.currentPriceKrw > 0 && asset.cachedAt && <StalePriceBadge cachedAt={asset.cachedAt} />}
      </span>
    ) : asset.assetType === 'fund' && asset.currentPriceKrw > 0 ? (
      formatKrw(asset.currentPriceKrw)
    ) : '—'

  return (
    <TableRow>
      <TableCell className="text-center px-1">
        <span className="font-medium">{asset.name}</span>
        {asset.mergedCount > 1 && (
          <span className="ml-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {asset.mergedCount}계좌
          </span>
        )}
      </TableCell>
      <TableCell className="text-center">
        {asset.accountType ? (
          <span className="text-xs border rounded-full px-2 py-0.5 text-muted-foreground">
            {ACCOUNT_TYPE_LABELS[asset.accountType]}
          </span>
        ) : '—'}
      </TableCell>
      <TableCell className="text-sm text-right font-mono">
        {hasHolding ? formatQty(asset.totalQuantity, isCrypto) : '—'}
      </TableCell>
      <TableCell className="text-sm text-right">
        {asset.avgCostPerUnit > 0 ? formatKrw(asset.avgCostPerUnit) : '—'}
      </TableCell>
      <TableCell className="text-sm text-right">{currentPriceCell}</TableCell>
      <TableCell className="text-sm text-right">
        {hasCost ? formatKrw(asset.totalCostKrw) : '—'}
      </TableCell>
      <TableCell className="text-sm text-right">
        {hasValue ? formatKrw(asset.currentValueKrw) : '—'}
      </TableCell>
      <TableCell className="text-right">
        {hasValue && hasCost ? (
          <span className={`text-lg font-semibold ${asset.returnPct >= 0 ? 'text-red-500' : 'text-blue-600'}`}>
            {formatKrw(asset.currentValueKrw - asset.totalCostKrw)}
            <span className="text-base font-medium ml-1 opacity-80">{formatReturn(asset.returnPct)}</span>
          </span>
        ) : '—'}
      </TableCell>
      <TableCell className="text-center w-20">
        {asset.mergedCount === 1 && <EditAssetDialog asset={asset} />}
      </TableCell>
    </TableRow>
  )
}

function AssetTable({ assets, title }: { assets: AssetPerformance[]; title?: React.ReactNode }) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [merged, setMerged] = useState(true)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const hasDuplicates = new Set(assets.map((a) => a.ticker ?? a.name)).size < assets.length

  const displayAssets = merged ? mergeAssets(assets) : assets
  const sorted = sortKey ? sortAssets(displayAssets as AssetPerformance[], sortKey, sortDir) : displayAssets

  const totalCost = assets.reduce((s, a) => s + a.totalCostKrw, 0)
  // 평가손익은 평가금액이 있는 자산만 기준 (평가 불가 자산 비용 제외)
  const valuedAssets = assets.filter((a) => a.currentValueKrw > 0)
  const totalValue = valuedAssets.reduce((s, a) => s + a.currentValueKrw, 0)
  const valuedCost = valuedAssets.reduce((s, a) => s + a.totalCostKrw, 0)
  const totalProfit = totalValue - valuedCost
  const totalReturnPct = valuedCost > 0 ? (totalProfit / valuedCost) * 100 : null
  const hasAnyValue = totalValue > 0

  const mergeBtn = hasDuplicates ? (
    <button
      onClick={() => setMerged((v) => !v)}
      className={cn(
        buttonVariants({ variant: 'default', size: 'sm' }),
        !merged && 'opacity-50'
      )}
    >
      <Layers className="h-3.5 w-3.5" />
      종목 합산
    </button>
  ) : null

  const summaryBar = (
    <div className="flex items-center gap-4 px-1">
      <div className="flex items-baseline gap-1">
        <span className="text-xs text-muted-foreground whitespace-nowrap">투자</span>
        <span className="text-sm font-semibold">{totalCost > 0 ? formatKrw(totalCost) : '—'}</span>
      </div>
      <div className="h-4 w-px bg-border shrink-0" />
      <div className="flex items-baseline gap-1">
        <span className="text-xs text-muted-foreground whitespace-nowrap">평가</span>
        <span className="text-sm font-semibold">{hasAnyValue ? formatKrw(totalValue) : '—'}</span>
      </div>
      <div className="h-4 w-px bg-border shrink-0" />
      <div className="flex items-baseline gap-1">
        <span className="text-xs text-muted-foreground whitespace-nowrap">손익</span>
        {hasAnyValue && totalCost > 0 ? (
          <span className={`text-sm font-semibold ${totalProfit >= 0 ? 'text-red-500' : 'text-blue-600'}`}>
            {totalProfit >= 0 ? '+' : ''}{formatKrw(totalProfit)}
            {totalReturnPct !== null && (
              <span className="text-xs ml-1 font-medium opacity-80">{formatReturn(totalReturnPct)}</span>
            )}
          </span>
        ) : <span className="text-sm text-muted-foreground">—</span>}
      </div>
    </div>
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          {title && <div className="flex items-center gap-2">{title}</div>}
          {summaryBar}
        </div>
        {mergeBtn}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label="종목명" sortKey="name" current={sortKey} dir={sortDir} onSort={handleSort} className="text-center px-1 w-28" align="center" />
            <TableHead className="text-center w-20">계좌유형</TableHead>
            <SortableHead label="보유수량" sortKey="totalQuantity" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
            <SortableHead label="매수단가" sortKey="avgCostPerUnit" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
            <SortableHead label="현재가" sortKey="currentPriceKrw" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
            <SortableHead label="투자금액" sortKey="totalCostKrw" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
            <SortableHead label="평가금액" sortKey="currentValueKrw" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
            <SortableHead label="평가손익" sortKey="profit" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((asset) =>
            merged
              ? <MergedAssetRow key={(asset as MergedAsset).ticker ?? asset.name} asset={asset as MergedAsset} />
              : <AssetRow key={asset.assetId} asset={asset as AssetPerformance} />
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function SummaryCards({ grouped, performances }: { grouped: Record<string, AssetPerformance[]>; performances: AssetPerformance[] }) {
  const types = Object.keys(grouped)

  // Sum ALL assets for cost regardless of whether current value exists
  const grandTotalCost = performances.reduce((s, a) => s + Number(a.totalCostKrw), 0)
  // Only sum assets that actually have a current value (price loaded or manual valuation entered)
  const valuedAssets = performances.filter((a) => a.currentValueKrw > 0)
  const grandTotalValue = valuedAssets.reduce((s, a) => s + Number(a.currentValueKrw), 0)
  const valuedCost = valuedAssets.reduce((s, a) => s + Number(a.totalCostKrw), 0)
  const grandProfit = grandTotalValue - valuedCost
  const grandReturnPct = valuedCost > 0 ? (grandProfit / valuedCost) * 100 : null
  const grandHasValue = grandTotalValue > 0

  return (
    <div className="flex flex-wrap justify-center gap-4">
      {/* 전체 합계 카드 */}
      <div className="rounded-2xl bg-white shadow-lg px-6 py-4 min-w-36 flex flex-col gap-1 text-gray-900">
        <span className="text-xs text-gray-500 font-medium">전체 투자</span>
        <span className="text-xl font-bold">{grandTotalCost > 0 ? formatKrw(grandTotalCost) : '—'}</span>
        {grandHasValue ? (
          <span className={`text-sm font-semibold ${grandProfit >= 0 ? 'text-red-500' : 'text-blue-600'}`}>
            {grandProfit >= 0 ? '+' : ''}{formatKrw(grandProfit)}
            {grandReturnPct !== null && (
              <span className="text-xs ml-1 opacity-80">{formatReturn(grandReturnPct)}</span>
            )}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </div>

      {types.map((type) => {
        const assets = grouped[type]
        const totalCost = assets.reduce((s, a) => s + a.totalCostKrw, 0)
        const valuedInType = assets.filter((a) => a.currentValueKrw > 0)
        const totalValue = valuedInType.reduce((s, a) => s + a.currentValueKrw, 0)
        const valuedCostInType = valuedInType.reduce((s, a) => s + a.totalCostKrw, 0)
        const profit = totalValue - valuedCostInType
        const returnPct = valuedCostInType > 0 ? (profit / valuedCostInType) * 100 : null
        const hasValue = totalValue > 0
        const profitColor = profit >= 0 ? 'text-red-500' : 'text-blue-600'

        return (
          <div key={type} className="rounded-2xl bg-white shadow-lg px-6 py-4 min-w-36 flex flex-col gap-1 text-gray-900">
            <div className="flex items-center gap-1.5">
              <AssetTypeBadge assetType={type as AssetPerformance['assetType']} />
              <span className="text-xs text-gray-500">{assets.length}종목</span>
            </div>
            <span className="text-xl font-bold">{totalCost > 0 ? formatKrw(totalCost) : '—'}</span>
            {hasValue && valuedCostInType > 0 ? (
              <span className={`text-sm font-semibold ${profitColor}`}>
                {profit >= 0 ? '+' : ''}{formatKrw(profit)}
                {returnPct !== null && (
                  <span className="text-xs ml-1 opacity-80">{formatReturn(returnPct)}</span>
                )}
              </span>
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface AssetsPageClientProps {
  performances: AssetPerformance[]
}

export function AssetsPageClient({ performances }: AssetsPageClientProps) {
  const grouped = ASSET_TYPE_ORDER.reduce<Record<string, AssetPerformance[]>>((acc, type) => {
    const items = performances.filter((a) => a.assetType === type)
    if (items.length > 0) acc[type] = items
    return acc
  }, {})

  const types = Object.keys(grouped)
  const defaultTab = types[0] ?? 'all'

  if (performances.length === 0) {
    return (
      <div className="text-center py-16 space-y-2">
        <p className="text-sm font-semibold text-foreground">등록된 자산이 없습니다</p>
        <p className="text-sm text-muted-foreground">첫 번째 자산을 추가하여 포트폴리오를 시작해보세요.</p>
      </div>
    )
  }

  const showAll = types.length > 1

  return (
    <div className="space-y-6">
    <SummaryCards grouped={grouped} performances={performances} />
    <Separator />
    <Tabs defaultValue={showAll ? 'all' : defaultTab}>
      <TabsList className="w-full">
        {showAll && (
          <TabsTrigger value="all" className="flex-1">
            <LayoutGrid className="h-3.5 w-3.5" />
            전체
          </TabsTrigger>
        )}
        {types.map((type) => {
          const Icon = ASSET_TYPE_ICONS[type]
          return (
            <TabsTrigger key={type} value={type} className="flex-1">
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {ASSET_TYPE_LABELS[type]}
              <span className="ml-1 text-xs opacity-60">({grouped[type].length})</span>
            </TabsTrigger>
          )
        })}
      </TabsList>

      {showAll && (
        <TabsContent value="all" className="mt-4">
          <div className="space-y-0">
            {types.map((type, i) => (
              <div key={type}>
                {i > 0 && <Separator className="my-6" />}
                <AssetTable
                  assets={grouped[type]}
                  title={<>
                    <AssetTypeBadge assetType={type as AssetPerformance['assetType']} />
                    <span className="text-sm text-muted-foreground">{ASSET_TYPE_LABELS[type]}</span>
                  </>}
                />
              </div>
            ))}
          </div>
        </TabsContent>
      )}

      {types.map((type) => (
        <TabsContent key={type} value={type} className="mt-4">
          <AssetTable assets={grouped[type]} />
        </TabsContent>
      ))}
    </Tabs>
    </div>
  )
}
