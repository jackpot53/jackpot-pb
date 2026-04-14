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
import { PlusCircle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { TransactionForm } from '@/components/app/transaction-form'
import { createTransaction } from '@/app/actions/transactions'
import { DeleteTransactionDialog } from '@/components/app/delete-transaction-dialog'
import { EditTransactionDialog } from '@/components/app/edit-transaction-dialog'
import type { TransactionWithAsset } from '@/db/queries/transactions'

type AssetType = 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'savings' | 'real_estate'
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
  if (fracPart === 0) return intPart.toString()
  return `${intPart}.${fracPart.toString().padStart(8, '0').replace(/0+$/, '')}`
}

export function TransactionsPageClient({ transactions, assetOptions }: Props) {
  const [assetFilter, setAssetFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showVoided, setShowVoided] = useState(false)

  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState<string>('')

  const selectedAsset = assetOptions.find((a) => a.id === selectedAssetId) ?? null

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (!showVoided && tx.isVoided) return false
      if (assetFilter !== 'all' && tx.assetId !== assetFilter) return false
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false
      return true
    })
  }, [transactions, assetFilter, typeFilter, showVoided])

  function openAddForm() {
    setShowAddForm(true)
    setSelectedAssetId(assetOptions[0]?.id ?? '')
  }

  function closeAddForm() {
    setShowAddForm(false)
    setSelectedAssetId('')
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      {showAddForm && (
        <div className="border rounded-md p-4 bg-card space-y-4">
          <h2 className="text-sm font-semibold">새 거래 추가</h2>

          <div className="flex items-center gap-3 max-w-xs">
            <Label className="text-sm text-muted-foreground shrink-0">자산 선택</Label>
            <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="자산을 선택하세요" />
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
                  if (!result?.error) closeAddForm()
                  return result
                }}
                submitLabel="거래 저장"
                onCancel={closeAddForm}
              />
            </>
          )}

          {!selectedAsset && (
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={closeAddForm}>취소</Button>
            </div>
          )}
        </div>
      )}

      {/* Filters + add button */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground shrink-0">자산</Label>
          <Select value={assetFilter} onValueChange={setAssetFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
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
              <SelectItem value="all">전체</SelectItem>
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

        <Button
          className="ml-auto"
          onClick={openAddForm}
          disabled={assetOptions.length === 0}
        >
          <PlusCircle className="h-4 w-4 mr-1.5" />거래 추가
        </Button>
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
              <TableHead>날짜</TableHead>
              <TableHead>자산</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>수량</TableHead>
              <TableHead>단가 (₩)</TableHead>
              <TableHead>수수료 (₩)</TableHead>
              <TableHead>메모</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((tx) => (
              <TableRow key={tx.id} className={tx.isVoided ? 'opacity-50' : undefined}>
                <TableCell className={`text-sm${tx.isVoided ? ' line-through' : ''}`}>
                  {tx.transactionDate}
                </TableCell>
                <TableCell className="text-sm">
                  <Link
                    href={`/assets/${tx.assetId}`}
                    className="hover:underline text-foreground"
                  >
                    {tx.assetName}
                  </Link>
                </TableCell>
                <TableCell className={`text-sm${tx.isVoided ? ' line-through' : ''}`}>
                  <span className={tx.type === 'buy' ? 'text-blue-600' : 'text-red-500'}>
                    {tx.type === 'buy' ? '매수' : '매도'}
                  </span>
                </TableCell>
                <TableCell className={`text-sm font-mono${tx.isVoided ? ' line-through' : ''}`}>
                  {decodeQuantity(tx.quantity)}
                </TableCell>
                <TableCell className={`text-sm${tx.isVoided ? ' line-through' : ''}`}>
                  {formatKrw(tx.pricePerUnit)}
                </TableCell>
                <TableCell className={`text-sm${tx.isVoided ? ' line-through' : ''}`}>
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

      <p className="text-xs text-muted-foreground text-right">
        {filtered.length}건
      </p>
    </div>
  )
}
