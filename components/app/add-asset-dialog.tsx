'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
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
    <Dialog data-component="AddAssetDialog" open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button aria-label="자산 추가" />
        }
      >
        <PlusCircle className="h-4 w-4 mr-1.5" />자산 추가
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" showCloseButton={false}>
        <DialogHeader className="-mx-4 -mt-4 px-4 py-4 rounded-t-xl bg-foreground text-center border-b relative">
          <DialogTitle className="text-background">자산 추가</DialogTitle>
          <DialogClose render={<button className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 transition-colors text-background" />}>
            <X className="h-4 w-4" />
          </DialogClose>
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
