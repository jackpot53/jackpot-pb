import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { refreshAllPrices } from '@/app/actions/prices'
import { loadPerformances } from '@/lib/server/load-performances'
import { AssetTypeBadge } from '@/components/app/asset-type-badge'
import { StalePriceBadge } from '@/components/app/stale-price-badge'
import { buttonVariants } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { DeleteAssetDialog } from '@/components/app/delete-asset-dialog'
import { formatKrw, formatReturn, formatQty } from '@/lib/portfolio'
import type { AssetPerformance } from '@/lib/portfolio'

const ASSET_TYPE_ORDER = [
  'stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'savings', 'real_estate',
] as const

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

function AssetRow({ asset }: { asset: AssetPerformance }) {
  const hasHolding = asset.totalQuantity > 0
  const isCrypto = asset.assetType === 'crypto'
  const hasValue = asset.currentValueKrw > 0
  const hasCost = asset.totalCostKrw > 0

  return (
    <TableRow>
      <TableCell>
        <Link href={`/assets/${asset.assetId}`} className="hover:underline font-medium">
          {asset.name}
        </Link>
      </TableCell>
      <TableCell className="text-sm text-right font-mono">
        {hasHolding ? formatQty(asset.totalQuantity, isCrypto) : '—'}
      </TableCell>
      <TableCell className="text-sm text-right">
        {hasHolding && asset.avgCostPerUnit > 0 ? formatKrw(asset.avgCostPerUnit) : '—'}
      </TableCell>
      <TableCell className="text-sm text-right">
        {hasCost ? formatKrw(asset.totalCostKrw) : '—'}
      </TableCell>
      <TableCell className="text-sm text-right">
        {asset.priceType === 'live' && asset.ticker ? (
          <span className="flex items-center justify-end gap-1">
            {asset.currentPriceKrw > 0 ? formatKrw(asset.currentPriceKrw) : '—'}
            {asset.isStale && asset.currentPriceKrw > 0 && <StalePriceBadge />}
          </span>
        ) : asset.assetType === 'fund' && asset.currentValueKrw > 0 ? (
          formatKrw(asset.currentValueKrw)
        ) : '—'}
      </TableCell>
      <TableCell className="text-sm text-right">
        {hasValue ? formatKrw(asset.currentValueKrw) : '—'}
      </TableCell>
      <TableCell className="text-sm text-right">
        {hasValue && hasCost ? (
          <span className={asset.returnPct >= 0 ? 'text-red-500' : 'text-blue-600'}>
            {formatKrw(asset.currentValueKrw - asset.totalCostKrw)}
            <span className="text-xs ml-1">{formatReturn(asset.returnPct)}</span>
          </span>
        ) : '—'}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Link
            href={`/assets/${asset.assetId}/edit`}
            aria-label="자산 수정"
            className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'p-2' })}
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <DeleteAssetDialog assetId={asset.assetId} assetName={asset.name} />
        </div>
      </TableCell>
    </TableRow>
  )
}

function AssetGroup({ type, assets }: { type: string; assets: AssetPerformance[] }) {
  const totalCost = assets.reduce((s, a) => s + a.totalCostKrw, 0)
  const totalValue = assets.reduce((s, a) => s + a.currentValueKrw, 0)
  const totalProfit = totalValue - totalCost
  const totalReturnPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : null
  const hasAnyValue = totalValue > 0

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-1">
        <AssetTypeBadge assetType={type as AssetPerformance['assetType']} />
        <span className="text-sm text-muted-foreground">{ASSET_TYPE_LABELS[type]}</span>
        <span className="text-xs text-muted-foreground">({assets.length})</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>종목명</TableHead>
            <TableHead className="text-right">보유수량</TableHead>
            <TableHead className="text-right">평균단가</TableHead>
            <TableHead className="text-right">투자금액</TableHead>
            <TableHead className="text-right">현재가</TableHead>
            <TableHead className="text-right">평가금액</TableHead>
            <TableHead className="text-right">평가손익</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => (
            <AssetRow key={asset.assetId} asset={asset} />
          ))}
          {/* 소계 행 */}
          <TableRow className="border-t-2 bg-muted/30 font-medium">
            <TableCell className="text-sm">소계</TableCell>
            <TableCell />
            <TableCell />
            <TableCell className="text-sm text-right">
              {totalCost > 0 ? formatKrw(totalCost) : '—'}
            </TableCell>
            <TableCell />
            <TableCell className="text-sm text-right">
              {hasAnyValue ? formatKrw(totalValue) : '—'}
            </TableCell>
            <TableCell className="text-sm text-right">
              {hasAnyValue && totalCost > 0 ? (
                <span className={`font-semibold ${totalProfit >= 0 ? 'text-red-500' : 'text-blue-600'}`}>
                  {formatKrw(totalProfit)}
                  {totalReturnPct !== null && (
                    <span className="text-xs ml-1 font-normal">{formatReturn(totalReturnPct)}</span>
                  )}
                </span>
              ) : '—'}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}

export default async function AssetsPage() {
  await refreshAllPrices()
  const { performances } = await loadPerformances()

  const grouped = ASSET_TYPE_ORDER.reduce<Record<string, AssetPerformance[]>>((acc, type) => {
    const items = performances.filter((a) => a.assetType === type)
    if (items.length > 0) acc[type] = items
    return acc
  }, {})

  const hasAny = performances.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">내 자산</h1>
        <Link href="/assets/new" className={buttonVariants()}>
          자산 추가
        </Link>
      </div>

      {!hasAny ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-sm font-semibold text-foreground">등록된 자산이 없습니다</p>
          <p className="text-sm text-muted-foreground">첫 번째 자산을 추가하여 포트폴리오를 시작해보세요.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([type, assets]) => (
            <AssetGroup key={type} type={type} assets={assets} />
          ))}
        </div>
      )}
    </div>
  )
}
