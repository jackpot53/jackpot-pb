'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AssetFormValues } from '@/app/actions/assets'

const assetSchema = z.object({
  name: z.string().min(1, '종목명을 입력해주세요.').max(255),
  assetType: z.enum(['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'savings', 'real_estate']),
  priceType: z.enum(['live', 'manual']),
  currency: z.enum(['KRW', 'USD']),
  ticker: z.string().max(20).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

const ASSET_TYPE_LABELS: Record<string, string> = {
  stock_kr: '주식 (국내)',
  stock_us: '주식 (미국)',
  etf_kr: 'ETF (국내)',
  etf_us: 'ETF (미국)',
  crypto: '코인',
  savings: '예적금',
  real_estate: '부동산',
}

interface AssetFormProps {
  defaultValues?: Partial<AssetFormValues>
  onSubmit: (data: AssetFormValues) => Promise<{ error: string } | void>
  submitLabel: string
}

export function AssetForm({ defaultValues, onSubmit, submitLabel }: AssetFormProps) {
  const [isPending, startTransition] = useTransition()
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: '',
      assetType: 'stock_kr',
      priceType: 'live',
      currency: 'KRW',
      ticker: null,
      notes: null,
      ...defaultValues,
    },
    mode: 'onBlur',
  })

  const priceType = form.watch('priceType')

  function handleSubmit(data: AssetFormValues) {
    startTransition(async () => {
      const result = await onSubmit(data)
      if (result?.error) {
        form.setError('root', { message: result.error })
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 max-w-md">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>종목명</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="assetType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>자산 유형</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(ASSET_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>통화</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="KRW">KRW (원)</SelectItem>
                  <SelectItem value="USD">USD (달러)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>시세 유형</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="live">실시간 (Live)</SelectItem>
                  <SelectItem value="manual">수동 (Manual)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {priceType === 'live' && (
          <FormField
            control={form.control}
            name="ticker"
            render={({ field }) => (
              <FormItem>
                <FormLabel>티커</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="예: AAPL, 005930" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>메모 (선택)</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
            disabled={isPending}
          >
            취소
          </Button>
        </div>
      </form>
    </Form>
  )
}
