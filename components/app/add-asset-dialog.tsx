'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AssetForm } from '@/components/app/asset-form'
import { createAsset } from '@/app/actions/assets'

export function AddAssetDialog() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button aria-label="자산 추가" />
        }
      >
        <PlusCircle className="h-4 w-4 mr-1.5" />자산 추가
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>자산 추가</DialogTitle>
        </DialogHeader>
        <AssetForm
          onSubmit={async (data) => {
            const result = await createAsset(data)
            if (!result?.error) {
              setOpen(false)
              router.refresh()
            }
            return result
          }}
          onCancel={() => setOpen(false)}
          submitLabel="자산 저장"
          showInitialTransaction
        />
      </DialogContent>
    </Dialog>
  )
}
