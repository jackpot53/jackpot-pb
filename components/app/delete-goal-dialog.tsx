'use client'
import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { deleteGoal } from '@/app/actions/goals'

interface DeleteGoalDialogProps {
  goalId: string
  goalName: string
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function DeleteGoalDialog({
  goalId,
  goalName,
  open,
  onOpenChange,
}: DeleteGoalDialogProps) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteGoal(goalId)
      if (result && 'error' in result) {
        toast('목표를 삭제하지 못했습니다. 다시 시도하세요.', {
          style: { background: 'var(--destructive)' },
        })
      } else {
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>목표 삭제</DialogTitle>
          <DialogDescription>
            &ldquo;{goalName}&rdquo; 이 목표를 삭제하면 되돌릴 수 없습니다. 삭제하시겠습니까?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            취소
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            목표 삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
