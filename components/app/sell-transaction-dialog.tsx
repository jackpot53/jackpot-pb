'use client'
import { useState } from 'react'
import { TrendingDown, CircleMinus, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { AssetLogo } from '@/components/app/asset-logo'
import { TransactionForm } from '@/components/app/transaction-form'
import { createTransaction } from '@/app/actions/transactions'
import type { AssetType, Currency } from '@/lib/types/asset'

interface AssetInfo {
  id: string
  name: string
  ticker: string | null
  assetType: AssetType
  currency: Currency
}

interface Props {
  asset: AssetInfo
}

export function SellTransactionDialog({ asset }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog data-component="SellTransactionDialog" open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="p-1 text-blue-500/70 hover:text-blue-500 hover:bg-blue-500/10"
            aria-label="매도"
          />
        }
      >
        <CircleMinus className="h-4 w-4" />
      </DialogTrigger>

      <DialogContent className="max-w-lg" showCloseButton={false}>
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-1.5">
            <TrendingDown className="h-4 w-4 text-blue-500" />
            매도 거래 추가
          </DialogTitle>
          <div className="flex items-center gap-1">
            <Button type="submit" form="sell-tx-form" size="icon-sm" variant="outline" aria-label="저장">
              <Save className="h-4 w-4" />
            </Button>
            <DialogClose render={<Button variant="outline" size="icon-sm" aria-label="닫기" />}>
              <span className="text-base leading-none">×</span>
            </DialogClose>
          </div>
        </DialogHeader>

        <Separator className="bg-black/30" />

        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border">
          <AssetLogo ticker={asset.ticker} name={asset.name} assetType={asset.assetType} size={36} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{asset.name}</p>
            {asset.ticker && (
              <p className="text-xs text-muted-foreground">{asset.ticker}</p>
            )}
          </div>
        </div>

        <Separator className="bg-black/30" />

        <TransactionForm
          assetId={asset.id}
          assetType={asset.assetType}
          currency={asset.currency}
          defaultValues={{ type: 'sell' }}
          onSubmit={async (data) => {
            const result = await createTransaction(asset.id, data)
            if (!result?.error) setOpen(false)
            return result
          }}
          submitLabel="매도 저장"
          onCancel={() => setOpen(false)}
          formId="sell-tx-form"
          hideActions
        />
      </DialogContent>
    </Dialog>
  )
}
