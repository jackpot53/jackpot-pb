'use client'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTransition, useState } from 'react'
import { Plus, Trash2, Loader2, Send } from 'lucide-react'
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
  '신기능': 'border-indigo-300 bg-indigo-50 text-indigo-700',
  '개선': 'border-emerald-300 bg-emerald-50 text-emerald-700',
  '버그수정': 'border-amber-300 bg-amber-50 text-amber-700',
  '보안': 'border-rose-300 bg-rose-50 text-rose-700',
}

export function UpdateCreateForm({ onSuccess }: { onSuccess?: () => void }) {
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
        onSuccess?.()
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
    <div data-component="UpdateCreateForm" className="rounded-xl border border-gray-200 bg-gray-50 p-5">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* 버전 + 날짜 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <input
                {...form.register('version')}
                placeholder="버전 (예: v1.3.1)"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 placeholder:text-gray-300"
              />
              {form.formState.errors.version && (
                <p className="text-xs text-red-500">{form.formState.errors.version.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <input
                type="date"
                {...form.register('date')}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
              />
              {form.formState.errors.date && (
                <p className="text-xs text-red-500">{form.formState.errors.date.message}</p>
              )}
            </div>
          </div>

          {/* 카테고리 */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => form.setValue('category', cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  form.watch('category') === cat
                    ? CATEGORY_STYLES[cat]
                    : 'border-gray-200 text-gray-500 hover:border-indigo-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 제목 */}
          <div className="space-y-1">
            <input
              {...form.register('title')}
              placeholder="업데이트 제목 (예: 자산 편집 UI 개선)"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 placeholder:text-gray-300"
            />
            {form.formState.errors.title && (
              <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* 항목 목록 */}
          <div className="space-y-2">
            {fields.map((field, idx) => (
              <div key={field.id} className="flex gap-2 items-center">
                <span className="text-gray-300 text-sm">•</span>
                <input
                  {...form.register(`items.${idx}.value`)}
                  placeholder={idx === 0 ? '변경된 내용을 간결하게 작성하세요' : `변경 항목 ${idx + 1}`}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 placeholder:text-gray-300"
                />
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => append({ value: '' })}
              className="flex items-center justify-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors w-full"
            >
              <Plus className="h-3.5 w-3.5" />항목 추가
            </button>
          </div>

          {serverError && <p className="text-xs text-red-500">{serverError}</p>}
          {success && <p className="text-xs text-emerald-600">업데이트가 게시되었습니다.</p>}

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            게시하기
          </button>
        </form>
    </div>
  )
}
