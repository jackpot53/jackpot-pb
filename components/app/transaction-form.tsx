'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTransition, useState } from 'react'
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
import type { TransactionFormValues, TransactionActionError } from '@/app/actions/transactions'

type AssetType = 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'savings' | 'real_estate'
type Currency = 'KRW' | 'USD'

const STOCK_ETF_TYPES: AssetType[] = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us']

function buildSchema(assetType: AssetType) {
  return z.object({
    type: z.enum(['buy', 'sell']),
    transactionDate: z.string().min(1, '날짜를 입력해주세요.'),
    quantity: z.string()
      .min(1, '수량을 입력해주세요.')
      .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, '유효한 수량을 입력해주세요.')
      .refine((v) => {
        if (STOCK_ETF_TYPES.includes(assetType)) {
          return Number.isInteger(parseFloat(v))
        }
        if (assetType === 'crypto') {
          const parts = v.split('.')
          return !parts[1] || parts[1].length <= 8
        }
        return true
      }, assetType === 'crypto'
          ? '소수점 8자리까지 입력 가능합니다.'
          : '주식/ETF 수량은 정수여야 합니다.'
      ),
    pricePerUnit: z.string().min(1, '단가를 입력해주세요.').refine(
      (v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, '유효한 단가를 입력해주세요.'
    ),
    fee: z.string().optional().default('0'),
    exchangeRate: z.string().optional(),
    notes: z.string().max(1000).optional().nullable(),
  })
}

interface TransactionFormProps {
  assetId: string
  assetType: AssetType
  currency: Currency
  defaultValues?: Partial<TransactionFormValues>
  onSubmit: (data: TransactionFormValues) => Promise<TransactionActionError | void>
  submitLabel: string
  onCancel: () => void
}

function formatKrw(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value))
}

export function TransactionForm({
  assetType,
  currency,
  defaultValues,
  onSubmit,
  submitLabel,
  onCancel,
}: TransactionFormProps) {
  const [isPending, startTransition] = useTransition()
  const [krwPreview, setKrwPreview] = useState<string | null>(null)
  const isUSD = currency === 'USD'

  const schema = buildSchema(assetType)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      type: 'buy',
      transactionDate: new Date().toISOString().split('T')[0],
      quantity: '',
      pricePerUnit: '',
      fee: '0',
      exchangeRate: '',
      notes: null,
      ...defaultValues,
    },
    mode: 'onBlur',
  })

  function computeKrwPreview() {
    const qty = parseFloat(form.getValues('quantity') || '0')
    const price = parseFloat(form.getValues('pricePerUnit') || '0')
    const rate = parseFloat(form.getValues('exchangeRate') || '1')
    if (isUSD && qty > 0 && price > 0 && rate > 0) {
      setKrwPreview(`≈ ₩${formatKrw(qty * price * rate)}`)
    } else if (!isUSD && qty > 0 && price > 0) {
      setKrwPreview(`≈ ₩${formatKrw(qty * price)}`)
    } else {
      setKrwPreview(null)
    }
  }

  function handleSubmit(data: TransactionFormValues) {
    startTransition(async () => {
      const result = await onSubmit(data)
      if (result?.error) {
        form.setError('root', { message: result.error })
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="type" render={({ field }) => (
          <FormItem>
            <FormLabel>거래 유형</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="buy">매수</SelectItem>
                <SelectItem value="sell">매도</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="transactionDate" render={({ field }) => (
          <FormItem>
            <FormLabel>날짜</FormLabel>
            <FormControl><Input type="date" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="quantity" render={({ field }) => (
          <FormItem>
            <FormLabel>수량</FormLabel>
            <FormControl>
              <Input
                {...field}
                inputMode="decimal"
                onBlur={() => { field.onBlur(); computeKrwPreview() }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="pricePerUnit" render={({ field }) => (
          <FormItem>
            <FormLabel>단가 {isUSD ? '(USD)' : '(₩)'}</FormLabel>
            <FormControl>
              <Input
                {...field}
                inputMode="decimal"
                onBlur={() => { field.onBlur(); computeKrwPreview() }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {isUSD && (
          <FormField control={form.control} name="exchangeRate" render={({ field }) => (
            <FormItem>
              <FormLabel>거래 시 환율 (₩/＄)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  inputMode="numeric"
                  placeholder="예: 1350"
                  onBlur={() => { field.onBlur(); computeKrwPreview() }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}

        {krwPreview && (
          <div className="text-sm text-muted-foreground font-mono">{krwPreview}</div>
        )}

        <FormField control={form.control} name="fee" render={({ field }) => (
          <FormItem>
            <FormLabel>수수료 (₩)</FormLabel>
            <FormControl><Input {...field} inputMode="numeric" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>메모 (선택)</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            취소
          </Button>
        </div>
      </form>
    </Form>
  )
}
