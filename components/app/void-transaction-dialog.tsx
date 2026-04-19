'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { voidTransaction } from '@/app/actions/transactions'

interface VoidTransactionDialogProps {
  transactionId: string
  assetId: string
}

export function VoidTransactionDialog({ transactionId, assetId }: VoidTransactionDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleVoid() {
    startTransition(async () => {
      await voidTransaction(transactionId, assetId)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog data-component="VoidTransactionDialog" open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="p-2" aria-label="거래 취소 처리" />
        }
      >
        <Ban className="h-4 w-4 text-destructive" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>거래 취소 처리</DialogTitle>
          <DialogDescription>
            이 거래를 취소 처리하면 평단가 계산에서 제외됩니다. 계속하시겠습니까?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            돌아가기
          </Button>
          <Button variant="destructive" onClick={handleVoid} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            취소 처리
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
