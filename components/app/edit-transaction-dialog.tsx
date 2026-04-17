'use client'
import { useState } from 'react'
import { Pencil, TrendingUp, TrendingDown, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AssetLogo } from '@/components/app/asset-logo'
import { Separator } from '@/components/ui/separator'
import { TransactionForm } from '@/components/app/transaction-form'
import { updateTransaction } from '@/app/actions/transactions'
import type { TransactionWithAsset } from '@/db/queries/transactions'

type AssetType = 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'savings' | 'real_estate' | 'fund' | 'insurance' | 'precious_metal' | 'cma'

function decodeQty(stored: number): string {
  const intPart = Math.floor(stored / 1e8)
  const fracPart = stored % 1e8
  if (fracPart === 0) return intPart.toString()
  return `${intPart}.${fracPart.toString().padStart(8, '0').replace(/0+$/, '')}`
}

function formatKrw(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value)
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
      <DialogContent className="max-w-lg" showCloseButton={false}>
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>거래 수정</DialogTitle>
          <div className="flex items-center gap-1">
            <Button type="submit" form="edit-tx-form" size="icon-sm" variant="outline" aria-label="저장">
              <Save className="h-4 w-4" />
            </Button>
            <DialogClose render={<Button variant="outline" size="icon-sm" aria-label="닫기" />}>
              <span className="text-base leading-none">×</span>
            </DialogClose>
          </div>
        </DialogHeader>

        <Separator className="bg-black/30" />

        {/* 자산 카드 헤더 */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border">
          <AssetLogo
            ticker={tx.ticker}
            name={tx.assetName}
            assetType={tx.assetType as AssetType}
            size={40}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm truncate">{tx.assetName}</span>
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                tx.type === 'buy' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'
              }`}>
                {tx.assetType === 'savings'
                  ? tx.type === 'buy'
                    ? <><TrendingUp className="h-3 w-3" />납입</>
                    : <><TrendingDown className="h-3 w-3" />해지출금</>
                  : tx.type === 'buy'
                    ? <><TrendingUp className="h-3 w-3" />매수</>
                    : <><TrendingDown className="h-3 w-3" />매도</>}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>{tx.transactionDate}</span>
              <span className="opacity-30">·</span>
              <span>수량 {decodeQty(tx.quantity)}</span>
              <span className="opacity-30">·</span>
              <span>단가 {formatKrw(tx.pricePerUnit)}</span>
            </div>
          </div>
        </div>

        <Separator className="bg-black/30" />

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
          formId="edit-tx-form"
          hideActions
        />
      </DialogContent>
    </Dialog>
  )
}
