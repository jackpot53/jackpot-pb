'use client'
import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TransactionForm } from '@/components/app/transaction-form'
import { updateTransaction } from '@/app/actions/transactions'
import type { TransactionWithAsset } from '@/db/queries/transactions'

type AssetType = 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'savings' | 'real_estate'

function decodeQty(stored: number): string {
  const intPart = Math.floor(stored / 1e8)
  const fracPart = stored % 1e8
  if (fracPart === 0) return intPart.toString()
  return `${intPart}.${fracPart.toString().padStart(8, '0').replace(/0+$/, '')}`
}

export function EditTransactionDialog({ tx }: { tx: TransactionWithAsset }) {
  const [open, setOpen] = useState(false)

  const isUSD = tx.currency === 'USD'
  const exchangeRate = tx.exchangeRateAtTime ? tx.exchangeRateAtTime / 10000 : null

  const pricePerUnit = isUSD && exchangeRate
    ? String(Math.round((tx.pricePerUnit / exchangeRate) * 100) / 100)
    : String(tx.pricePerUnit)

  const defaultValues = {
    type: tx.type as 'buy' | 'sell',
    transactionDate: tx.transactionDate,
    quantity: decodeQty(tx.quantity),
    pricePerUnit,
    fee: String(tx.fee),
    exchangeRate: exchangeRate ? String(exchangeRate) : '',
    notes: tx.notes ?? null,
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="p-2" aria-label="거래 수정" />
        }
      >
        <Pencil className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>거래 수정 — {tx.assetName}</DialogTitle>
        </DialogHeader>
        <TransactionForm
          assetId={tx.assetId}
          assetType={tx.assetType as AssetType}
          currency={tx.currency as 'KRW' | 'USD'}
          defaultValues={defaultValues}
          onSubmit={async (data) => {
            const result = await updateTransaction(tx.id, tx.assetId, data)
            if (!result?.error) setOpen(false)
            return result
          }}
          submitLabel="수정 저장"
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
