'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AssetForm } from '@/components/app/asset-form'
import { updateAsset } from '@/app/actions/assets'
import type { AssetPerformance } from '@/lib/portfolio'

interface EditAssetDialogProps {
  asset: AssetPerformance
}

export function EditAssetDialog({ asset }: EditAssetDialogProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const defaultValues = {
    name: asset.name,
    assetType: asset.assetType,
    priceType: asset.priceType,
    currency: asset.currency,
    accountType: asset.accountType,
    ticker: asset.ticker,
    notes: asset.notes,
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="p-2" aria-label="자산 수정" />
        }
      >
        <Pencil className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{asset.name} 수정</DialogTitle>
        </DialogHeader>
        <AssetForm
          defaultValues={defaultValues}
          onSubmit={async (data) => {
            const result = await updateAsset(asset.assetId, data)
            if (!result?.error) {
              setOpen(false)
              router.refresh()
            }
            return result
          }}
          submitLabel="수정 저장"
        />
      </DialogContent>
    </Dialog>
  )
}
