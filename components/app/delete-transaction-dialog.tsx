'use client'
import { useState, useTransition } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
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
import { deleteTransaction } from '@/app/actions/transactions'

export function DeleteTransactionDialog({
  transactionId,
  assetId,
  label,
  onDeleted,
}: {
  transactionId: string
  assetId: string
  label: string
  onDeleted?: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteTransaction(transactionId, assetId)
      setOpen(false)
      onDeleted?.(transactionId)
    })
  }

  return (
    <Dialog data-component="DeleteTransactionDialog" open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="p-2" aria-label="거래 삭제" />
        }
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>거래 삭제</DialogTitle>
          <DialogDescription>
            {label} 거래를 영구 삭제합니다. 삭제하면 보유수량과 투자금액이 재계산됩니다. 계속하시겠습니까?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row justify-end">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            취소
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
