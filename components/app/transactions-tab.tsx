'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TransactionForm } from '@/components/app/transaction-form'
import { VoidTransactionDialog } from '@/components/app/void-transaction-dialog'
import { createTransaction, updateTransaction } from '@/app/actions/transactions'
import type { Transaction } from '@/db/queries/transactions'
import type { Asset } from '@/db/queries/assets'

interface TransactionsTabProps {
  asset: Asset
  transactions: Transaction[]
}

function formatKrw(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value)
}

function decodeQuantity(stored: number): string {
  // Use integer arithmetic to avoid float rounding for large quantities (relevant for crypto)
  const intPart = Math.floor(stored / 1e8)
  const fracPart = stored % 1e8
  if (fracPart === 0) return intPart.toString()
  return `${intPart}.${fracPart.toString().padStart(8, '0').replace(/0+$/, '')}`
}

export function TransactionsTab({ asset, transactions }: TransactionsTabProps) {
  const router = useRouter()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="space-y-4 pt-4">
      <div className="flex justify-end">
        <Button onClick={() => { setShowAddForm(true); setEditingId(null) }} disabled={showAddForm}>
          + 거래 추가
        </Button>
      </div>

      {showAddForm && (
        <div className="border rounded-md p-4 bg-card">
          <h3 className="text-sm font-semibold mb-4">새 거래 추가</h3>
          <TransactionForm
            assetId={asset.id}
            assetType={asset.assetType}
            currency={asset.currency}
            onSubmit={async (data) => {
              const result = await createTransaction(asset.id, data)
              if (!result?.error) setShowAddForm(false)
              return result
            }}
            submitLabel="거래 저장"
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {transactions.length === 0 && !showAddForm ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-sm font-semibold text-foreground">거래 내역이 없습니다</p>
          <p className="text-sm text-muted-foreground">이 자산의 첫 번째 거래를 기록해보세요.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>수량</TableHead>
              <TableHead>단가 (₩)</TableHead>
              <TableHead>수수료 (₩)</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              tx.id === editingId ? (
                <TableRow key={tx.id}>
                  <TableCell colSpan={6}>
                    <TransactionForm
                      assetId={asset.id}
                      assetType={asset.assetType}
                      currency={asset.currency}
                      defaultValues={{
                        type: tx.type,
                        transactionDate: tx.transactionDate,
                        quantity: decodeQuantity(tx.quantity),
                        pricePerUnit: tx.pricePerUnit.toString(),
                        fee: tx.fee.toString(),
                        notes: tx.notes,
                      }}
                      onSubmit={async (data) => {
                        const result = await updateTransaction(tx.id, asset.id, data)
                        if (!result?.error) {
                          setEditingId(null)
                          router.refresh()
                        }
                        return result
                      }}
                      submitLabel="수정"
                      onCancel={() => setEditingId(null)}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow
                  key={tx.id}
                  className={tx.isVoided ? 'opacity-50' : undefined}
                >
                  <TableCell className={tx.isVoided ? 'line-through text-sm' : 'text-sm'}>
                    {tx.transactionDate}
                  </TableCell>
                  <TableCell className={tx.isVoided ? 'line-through text-sm' : 'text-sm'}>
                    {tx.type === 'buy' ? '매수' : '매도'}
                  </TableCell>
                  <TableCell className={tx.isVoided ? 'line-through text-sm' : 'text-sm'}>
                    {decodeQuantity(tx.quantity)}
                  </TableCell>
                  <TableCell className={tx.isVoided ? 'line-through text-sm' : 'text-sm'}>
                    {formatKrw(tx.pricePerUnit)}
                  </TableCell>
                  <TableCell className={tx.isVoided ? 'line-through text-sm' : 'text-sm'}>
                    {formatKrw(tx.fee)}
                  </TableCell>
                  <TableCell>
                    {!tx.isVoided && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2"
                          aria-label="거래 수정"
                          onClick={() => { setEditingId(tx.id); setShowAddForm(false) }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <VoidTransactionDialog transactionId={tx.id} assetId={asset.id} />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
