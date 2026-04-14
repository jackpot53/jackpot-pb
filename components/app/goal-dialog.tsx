'use client'
import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { createGoal, updateGoal } from '@/app/actions/goals'
import type { GoalRow } from '@/db/queries/goals'

// Client-side input schema (mirrors server schema; do NOT import from server file)
// All fields are strings in the form; numeric conversion happens at submit time
const goalFormSchema = z.object({
  name: z.string().min(1, '목표 이름을 입력하세요').max(255),
  targetAmountKrw: z
    .string()
    .min(1, '올바른 금액을 입력하세요 (1원 이상의 숫자)')
    .refine(
      (v) => {
        const n = Number(v)
        return !isNaN(n) && Number.isInteger(n) && n >= 1
      },
      '올바른 금액을 입력하세요 (1원 이상의 숫자)'
    ),
  targetDate: z
    .string()
    .refine(
      (v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v),
      '올바른 날짜 형식으로 입력하세요 (YYYY-MM-DD)'
    )
    .optional(),
  notes: z.string().max(1000).optional(),
})

type GoalFormValues = z.infer<typeof goalFormSchema>

interface GoalDialogProps {
  mode: 'create' | 'edit'
  goal?: GoalRow
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function GoalDialog({ mode, goal, open, onOpenChange }: GoalDialogProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: '',
      targetAmountKrw: '',
      targetDate: '',
      notes: '',
    },
  })

  // Reset form when switching to edit mode or goal changes
  useEffect(() => {
    if (mode === 'edit' && goal) {
      form.reset({
        name: goal.name,
        targetAmountKrw: String(goal.targetAmountKrw),
        targetDate: goal.targetDate ?? '',
        notes: goal.notes ?? '',
      })
    } else if (mode === 'create') {
      form.reset({
        name: '',
        targetAmountKrw: '',
        targetDate: '',
        notes: '',
      })
    }
  }, [mode, goal, form])

  function handleSubmit(data: GoalFormValues) {
    startTransition(async () => {
      // Normalize string fields to proper types for server action
      const payload = {
        name: data.name,
        targetAmountKrw: parseInt(data.targetAmountKrw, 10),
        targetDate: data.targetDate === '' ? null : (data.targetDate ?? null),
        notes: data.notes === '' ? null : (data.notes ?? null),
      }

      const result =
        mode === 'edit' && goal
          ? await updateGoal(goal.id, payload)
          : await createGoal(payload)

      if (result && 'error' in result) {
        toast.error('목표를 저장하지 못했습니다. 다시 시도하세요.')
      } else {
        onOpenChange(false)
        router.refresh()
      }
    })
  }

  const title = mode === 'create' ? '새 목표 추가' : '목표 수정'
  const submitLabel = mode === 'create' ? '목표 추가' : '변경 저장'
  const cancelLabel = mode === 'create' ? '입력 취소' : '수정 취소'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>목표 이름</FormLabel>
                  <FormControl>
                    <Input placeholder="목표 이름을 입력하세요" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetAmountKrw"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>목표 금액 (KRW)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="목표 금액"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>목표 날짜 (선택)</FormLabel>
                  <FormControl>
                    <Input placeholder="YYYY-MM-DD" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>메모 (선택)</FormLabel>
                  <FormControl>
                    <Input placeholder="메모" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {cancelLabel}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
