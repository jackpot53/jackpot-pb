'use client'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTransition, useState } from 'react'
import { Plus, Trash2, Loader2, PenLine } from 'lucide-react'
import { createUpdate } from '@/app/actions/updates'

const schema = z.object({
  version: z.string().min(1, '버전을 입력하세요').max(20),
  title: z.string().min(1, '제목을 입력하세요').max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식으로 입력하세요'),
  category: z.enum(['신기능', '개선', '버그수정', '보안']),
  items: z.array(z.object({ value: z.string().min(1, '항목을 입력하세요') })).min(1),
})

type FormValues = z.infer<typeof schema>

const CATEGORIES = ['신기능', '개선', '버그수정', '보안'] as const
const CATEGORY_STYLES: Record<string, string> = {
  '신기능': 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300',
  '개선': 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
  '버그수정': 'border-amber-500/50 bg-amber-500/10 text-amber-300',
  '보안': 'border-rose-500/50 bg-rose-500/10 text-rose-300',
}

export function UpdateCreateForm() {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      version: '',
      title: '',
      date: new Date().toISOString().slice(0, 10),
      category: '신기능',
      items: [{ value: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })

  function onSubmit(values: FormValues) {
    setServerError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await createUpdate({
        ...values,
        items: values.items.map(i => i.value),
      })
      if (result?.error) {
        setServerError(result.error)
      } else {
        setSuccess(true)
        form.reset({
          version: '',
          title: '',
          date: new Date().toISOString().slice(0, 10),
          category: '신기능',
          items: [{ value: '' }],
        })
      }
    })
  }

  return (
    <div className="rounded-xl border border-indigo-500/30 bg-card overflow-hidden">
      <div className="h-1 bg-indigo-500" />
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <PenLine className="h-4 w-4 text-indigo-400" />
          새 업데이트 작성
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* 버전 + 날짜 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">버전</label>
              <input
                {...form.register('version')}
                placeholder="v1.3.1"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-muted-foreground/50"
              />
              {form.formState.errors.version && (
                <p className="text-xs text-red-400">{form.formState.errors.version.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">날짜</label>
              <input
                type="date"
                {...form.register('date')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {form.formState.errors.date && (
                <p className="text-xs text-red-400">{form.formState.errors.date.message}</p>
              )}
            </div>
          </div>

          {/* 카테고리 */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">카테고리</label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => form.setValue('category', cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    form.watch('category') === cat
                      ? CATEGORY_STYLES[cat]
                      : 'border-border text-muted-foreground hover:border-indigo-500/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 제목 */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">제목</label>
            <input
              {...form.register('title')}
              placeholder="업데이트 제목"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-muted-foreground/50"
            />
            {form.formState.errors.title && (
              <p className="text-xs text-red-400">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* 항목 목록 */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">변경 항목</label>
            {fields.map((field, idx) => (
              <div key={field.id} className="flex gap-2 items-center">
                <span className="text-muted-foreground/50 text-sm">•</span>
                <input
                  {...form.register(`items.${idx}.value`)}
                  placeholder={`항목 ${idx + 1}`}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-muted-foreground/50"
                />
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="text-muted-foreground/50 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => append({ value: '' })}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />항목 추가
            </button>
          </div>

          {serverError && <p className="text-xs text-red-400">{serverError}</p>}
          {success && <p className="text-xs text-emerald-400">업데이트가 게시되었습니다.</p>}

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            게시하기
          </button>
        </form>
      </div>
    </div>
  )
}
