'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { PlusCircle, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, ArrowRightLeft } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { TransactionForm } from '@/components/app/transaction-form'
import { createTransaction } from '@/app/actions/transactions'
import { DeleteTransactionDialog } from '@/components/app/delete-transaction-dialog'
import { EditTransactionDialog } from '@/components/app/edit-transaction-dialog'
import type { TransactionWithAsset } from '@/db/queries/transactions'

type AssetType = 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'savings' | 'real_estate' | 'fund'
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

export function TransactionsPageClient({ transactions, assetOptions }: Props) {
  const [assetFilter, setAssetFilter] = useState<string>('전체')
  const [typeFilter, setTypeFilter] = useState<string>('전체')
  const [showVoided, setShowVoided] = useState(false)

  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState<string>('')

  const selectedAsset = assetOptions.find((a) => a.id === selectedAssetId) ?? null

  function openDialog() {
    setSelectedAssetId(assetOptions[0]?.id ?? '')
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setSelectedAssetId('')
  }

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
      {/* Filters + add button */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground shrink-0">자산</Label>
          <Select value={assetFilter} onValueChange={setAssetFilter}>
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
          <Select value={typeFilter} onValueChange={setTypeFilter}>
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

        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else openDialog() }}>
          <DialogTrigger
            render={
              <Button className="ml-auto" disabled={assetOptions.length === 0}>
                <PlusCircle className="h-4 w-4 mr-1.5" />거래 추가
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>새 거래 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground shrink-0">자산 선택</Label>
                <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue>{selectedAsset ? selectedAsset.name : '자산을 선택하세요'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {assetOptions.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedAsset && (
                <>
                  <Separator />
                  <TransactionForm
                    assetId={selectedAsset.id}
                    assetType={selectedAsset.assetType}
                    currency={selectedAsset.currency}
                    onSubmit={async (data) => {
                      const result = await createTransaction(selectedAsset.id, data)
                      if (!result?.error) closeDialog()
                      return result
                    }}
                    submitLabel="거래 저장"
                    onCancel={closeDialog}
                  />
                </>
              )}
              {!selectedAsset && (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={closeDialog}>취소</Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-sm font-semibold text-foreground">거래 내역이 없습니다</p>
          <p className="text-sm text-muted-foreground">
            위의 버튼으로 거래를 추가해보세요.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">날짜</TableHead>
              <TableHead className="whitespace-nowrap">자산</TableHead>
              <TableHead className="whitespace-nowrap text-center">유형</TableHead>
              <TableHead className="whitespace-nowrap text-right">수량</TableHead>
              <TableHead className="whitespace-nowrap text-right">단가 (₩)</TableHead>
              <TableHead className="whitespace-nowrap text-right">수수료 (₩)</TableHead>
              <TableHead className="whitespace-nowrap">메모</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((tx, i) => (
              <TableRow key={tx.id} className={[i % 2 === 0 ? 'bg-muted/10' : undefined, tx.isVoided ? 'opacity-50' : undefined].filter(Boolean).join(' ') || undefined}>
                <TableCell className={`text-sm${tx.isVoided ? ' line-through' : ''}`}>
                  {tx.transactionDate}
                </TableCell>
                <TableCell className="text-sm">
                  <Link
                    href={`/assets/${tx.assetId}`}
                    className="hover:underline text-gray-900"
                  >
                    {tx.assetName}
                  </Link>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`inline-flex items-center gap-1 text-sm font-medium${tx.isVoided ? ' line-through opacity-50' : ''} ${tx.type === 'buy' ? 'text-blue-600' : 'text-red-500'}`}>
                    {tx.type === 'buy'
                      ? <><TrendingUp className="h-3.5 w-3.5" />매수</>
                      : <><TrendingDown className="h-3.5 w-3.5" />매도</>}
                  </span>
                </TableCell>
                <TableCell className={`text-sm text-right font-mono${tx.isVoided ? ' line-through' : ''}`}>
                  {decodeQuantity(tx.quantity)}
                </TableCell>
                <TableCell className={`text-sm text-right${tx.isVoided ? ' line-through' : ''}`}>
                  {formatKrw(tx.pricePerUnit)}
                </TableCell>
                <TableCell className={`text-sm text-right${tx.isVoided ? ' line-through' : ''}`}>
                  {formatKrw(tx.fee)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                  {tx.notes ?? '—'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <EditTransactionDialog tx={tx} />
                    <DeleteTransactionDialog
                      transactionId={tx.id}
                      assetId={tx.assetId}
                      label={`${tx.transactionDate} ${tx.assetName} ${tx.type === 'buy' ? '매수' : '매도'}`}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
