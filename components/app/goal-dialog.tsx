'use client'
import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Target, Banknote, CalendarDays, StickyNote, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
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

const goalFormSchema = z.object({
  name: z.string().min(1, '목표 이름을 입력하세요').max(255),
  targetAmountKrw: z
    .string()
    .min(1, '올바른 금액을 입력하세요 (1원 이상의 숫자)')
    .refine(
      (v) => {
        const n = Number(v.replace(/,/g, ''))
        return !isNaN(n) && Number.isInteger(n) && n >= 1
      },
      '올바른 금액을 입력하세요 (1원 이상의 숫자)'
    ),
  targetDate: z
    .string()
    .refine(
      (v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v),
      '올바른 날짜 형식으로 입력하세요'
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

const KRW_FMT = new Intl.NumberFormat('ko-KR')

function formatAmount(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '')
  if (!digits) return ''
  return KRW_FMT.format(Number(digits))
}

export function GoalDialog({ mode, goal, open, onOpenChange }: GoalDialogProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: { name: '', targetAmountKrw: '', targetDate: '', notes: '' },
  })

  useEffect(() => {
    if (mode === 'edit' && goal) {
      form.reset({
        name: goal.name,
        targetAmountKrw: KRW_FMT.format(goal.targetAmountKrw),
        targetDate: goal.targetDate ?? '',
        notes: goal.notes ?? '',
      })
    } else if (mode === 'create') {
      form.reset({ name: '', targetAmountKrw: '', targetDate: '', notes: '' })
    }
  }, [mode, goal, form])

  function handleSubmit(data: GoalFormValues) {
    startTransition(async () => {
      const payload = {
        name: data.name,
        targetAmountKrw: parseInt(data.targetAmountKrw.replace(/,/g, ''), 10),
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

  const isCreate = mode === 'create'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-md gap-0">

        {/* 그라디언트 헤더 */}
        <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-5 py-4 text-white overflow-hidden">
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/5 blur-2xl" />
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
          </div>
          <DialogHeader className="relative space-y-0">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/15 border border-white/20 shrink-0">
                {isCreate ? <Sparkles className="h-3.5 w-3.5" /> : <Target className="h-3.5 w-3.5" />}
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white leading-tight">
                  {isCreate ? '새 목표 추가' : '목표 수정'}
                </DialogTitle>
                <p className="text-blue-200/70 text-xs">
                  {isCreate ? '달성하고 싶은 자산 목표를 설정하세요' : '목표 정보를 수정합니다'}
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* 폼 */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="px-6 py-5 space-y-2">

              {/* 목표 이름 */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
                    <FormLabel className="w-28 shrink-0 text-right text-muted-foreground pr-4 border-r border-border">
                      <Target className="inline mr-1.5 h-3.5 w-3.5 opacity-60" />목표 이름
                    </FormLabel>
                    <div className="flex-1">
                      <FormControl>
                        <Input
                          className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto"
                          placeholder="예: 비상금 1억, 집 마련..."
                          autoFocus
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {/* 목표 금액 */}
              <FormField
                control={form.control}
                name="targetAmountKrw"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
                    <FormLabel className="w-28 shrink-0 text-right text-muted-foreground pr-4 border-r border-border">
                      <Banknote className="inline mr-1.5 h-3.5 w-3.5 opacity-60" />목표 금액
                    </FormLabel>
                    <div className="flex-1 flex items-center gap-1.5">
                      <span className="text-sm text-muted-foreground shrink-0">₩</span>
                      <FormControl>
                        <Input
                          className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto"
                          placeholder="100,000,000"
                          inputMode="numeric"
                          {...field}
                          onChange={(e) => field.onChange(formatAmount(e.target.value))}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 목표 날짜 */}
              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
                    <FormLabel className="w-28 shrink-0 text-right text-muted-foreground pr-4 border-r border-border">
                      <CalendarDays className="inline mr-1.5 h-3.5 w-3.5 opacity-60" />목표 날짜
                    </FormLabel>
                    <div className="flex-1">
                      <FormControl>
                        <Input
                          type="date"
                          className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {/* 메모 */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
                    <FormLabel className="w-28 shrink-0 text-right text-muted-foreground pr-4 border-r border-border">
                      <StickyNote className="inline mr-1.5 h-3.5 w-3.5 opacity-60" />메모
                    </FormLabel>
                    <div className="flex-1">
                      <FormControl>
                        <Input
                          className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto"
                          placeholder="다짐이나 메모 (선택)"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* 액션 버튼 */}
            <div className="flex items-center gap-2 px-6 py-4">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 rounded-xl text-muted-foreground hover:text-foreground"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                취소
              </Button>
              <Button
                type="submit"
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 font-medium shadow-sm"
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : isCreate ? (
                  <Sparkles className="mr-1.5 h-4 w-4" />
                ) : (
                  <Target className="mr-1.5 h-4 w-4" />
                )}
                {isCreate ? '목표 추가' : '변경 저장'}
              </Button>
            </div>
          </form>
        </Form>

      </DialogContent>
    </Dialog>
  )
}
