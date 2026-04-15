'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { PlusCircle, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, ArrowRightLeft } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { DeleteTransactionDialog } from '@/components/app/delete-transaction-dialog'
import { EditTransactionDialog } from '@/components/app/edit-transaction-dialog'
import { AssetLogo } from '@/components/app/asset-logo'
import { SparklineChart } from '@/components/app/sparkline-chart'
import { cn } from '@/lib/utils'
import type { TransactionWithAsset } from '@/db/queries/transactions'

type AssetType = 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'savings' | 'real_estate' | 'fund' | 'insurance' | 'precious_metal'
type Currency = 'KRW' | 'USD'

interface AssetOption {
  id: string
  name: string
  assetType: AssetType
  currency: Currency
}

interface Props {
  transactions: TransactionWithAsset[]
  assetOptions: AssetOption[]
  sparklines: Record<string, number[]>
}

function formatKrw(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value)
}

function decodeQuantity(stored: number): string {
  const intPart = Math.floor(stored / 1e8)
  const fracPart = stored % 1e8
  const formattedInt = new Intl.NumberFormat('ko-KR').format(intPart)
  if (fracPart === 0) return formattedInt
  return `${formattedInt}.${fracPart.toString().padStart(8, '0').replace(/0+$/, '')}`
}

function TransactionCard({ tx, sparklineData }: { tx: TransactionWithAsset; sparklineData?: number[] }) {
  const total = Math.round((tx.quantity / 1e8) * tx.pricePerUnit)
  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-muted/30 transition-colors',
      tx.isVoided && 'opacity-50',
    )}>
      <AssetLogo ticker={tx.ticker} name={tx.assetName} assetType={tx.assetType as Parameters<typeof AssetLogo>[0]['assetType']} size={40} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/assets/${tx.assetId}`}
            className={cn('font-medium text-sm truncate hover:underline', tx.isVoided && 'line-through')}
          >
            {tx.assetName}
          </Link>
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
            tx.type === 'buy' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'
          }`}>
            {tx.type === 'buy'
              ? <><TrendingUp className="h-3 w-3" />매수</>
              : <><TrendingDown className="h-3 w-3" />매도</>}
          </span>
        </div>
        <div className={cn('flex items-center gap-2 text-xs text-muted-foreground mt-0.5', tx.isVoided && 'line-through')}>
          <span>{tx.transactionDate}</span>
          <span className="opacity-30">·</span>
          <span>수량 {decodeQuantity(tx.quantity)}</span>
          <span className="opacity-30">·</span>
          <span>단가 {formatKrw(tx.pricePerUnit)}</span>
          {tx.fee > 0 && (
            <><span className="opacity-30">·</span><span>수수료 {formatKrw(tx.fee)}</span></>
          )}
          {tx.notes && (
            <><span className="opacity-30">·</span><span className="truncate max-w-[160px]">{tx.notes}</span></>
          )}
        </div>
      </div>
      {sparklineData && (
        <div className="shrink-0 w-20 flex items-center justify-center">
          <SparklineChart data={sparklineData} width={80} height={36} />
        </div>
      )}
      <div className={cn('text-sm font-semibold tabular-nums shrink-0', tx.isVoided && 'line-through', tx.type === 'buy' ? 'text-red-500' : 'text-blue-600')}>
        {tx.type === 'sell' ? '+' : ''}{formatKrw(total)}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <EditTransactionDialog tx={tx} />
        <DeleteTransactionDialog
          transactionId={tx.id}
          assetId={tx.assetId}
          label={`${tx.transactionDate} ${tx.assetName} ${tx.type === 'buy' ? '매수' : '매도'}`}
        />
      </div>
    </div>
  )
}

export function TransactionsPageClient({ transactions, assetOptions, sparklines }: Props) {
  const [assetFilter, setAssetFilter] = useState<string>('전체')
  const [typeFilter, setTypeFilter] = useState<string>('전체')
  const [showVoided, setShowVoided] = useState(false)

  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const filtered = useMemo(() => {
    setPage(1)
    return transactions.filter((tx) => {
      if (!showVoided && tx.isVoided) return false
      if (assetFilter !== '전체' && tx.assetId !== assetFilter) return false
      if (typeFilter !== '전체' && tx.type !== typeFilter) return false
      return true
    })
  }, [transactions, assetFilter, typeFilter, showVoided])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <ArrowRightLeft className="h-5 w-5" />거래내역
        </h1>
        <span className="text-xs font-semibold bg-primary text-primary-foreground rounded-full px-2 py-0.5">
          {filtered.length}
        </span>
      </div>
      <Separator className="bg-foreground" />
      {/* Filters + add button */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground shrink-0">자산</Label>
          <Select value={assetFilter} onValueChange={(v) => setAssetFilter(v ?? '전체')}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전체">전체</SelectItem>
              {assetOptions.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground shrink-0">유형</Label>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? '전체')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전체">전체</SelectItem>
              <SelectItem value="buy">매수</SelectItem>
              <SelectItem value="sell">매도</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="show-voided"
            type="checkbox"
            checked={showVoided}
            onChange={(e) => setShowVoided(e.target.checked)}
            className="h-4 w-4 cursor-pointer"
          />
          <Label htmlFor="show-voided" className="text-sm text-muted-foreground cursor-pointer">
            취소된 거래 표시
          </Label>
        </div>

        <Link href="/assets/new" className="ml-auto">
          <Button>
            <PlusCircle className="h-4 w-4 mr-1.5" />거래 추가
          </Button>
        </Link>
      </div>

      {/* Card list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-sm font-semibold text-foreground">거래 내역이 없습니다</p>
          <p className="text-sm text-muted-foreground">
            위의 버튼으로 거래를 추가해보세요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {paginated.map((tx) => (
            <TransactionCard key={tx.id} tx={tx} sparklineData={tx.ticker ? sparklines[tx.ticker] : undefined} />
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPage(p)}
                className="w-8"
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
