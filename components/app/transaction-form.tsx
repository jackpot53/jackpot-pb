'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTransition, useState } from 'react'
import { Loader2, Save, X, ArrowLeftRight, CalendarDays, Hash, CircleDollarSign, BadgeDollarSign, Coins, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
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

type AssetType = 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'savings' | 'real_estate' | 'fund' | 'insurance' | 'precious_metal'
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
  formId?: string
  hideActions?: boolean
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
  formId,
  hideActions,
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
      <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-2">
        <FormField control={form.control} name="type" render={({ field }) => (
          <FormItem className="flex flex-row items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
            <FormLabel className="w-32 shrink-0 text-right text-muted-foreground pr-4 border-r border-black/40"><ArrowLeftRight className="inline mr-1.5 h-3.5 w-3.5 opacity-60" />거래 유형</FormLabel>
            <div className="flex-1">
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full border-0 bg-transparent shadow-none focus:ring-0 p-0 h-auto"><SelectValue>{field.value === 'buy' ? '매수' : '매도'}</SelectValue></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="buy">매수</SelectItem>
                  <SelectItem value="sell">매도</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </div>
          </FormItem>
        )} />

        <FormField control={form.control} name="transactionDate" render={({ field }) => (
          <FormItem className="flex flex-row items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
            <FormLabel className="w-32 shrink-0 text-right text-muted-foreground pr-4 border-r border-black/40"><CalendarDays className="inline mr-1.5 h-3.5 w-3.5 opacity-60" />날짜</FormLabel>
            <div className="flex-1">
              <FormControl><Input type="date" className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto" {...field} /></FormControl>
              <FormMessage />
            </div>
          </FormItem>
        )} />

        <FormField control={form.control} name="quantity" render={({ field }) => (
          <FormItem className="flex flex-row items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
            <FormLabel className="w-32 shrink-0 text-right text-muted-foreground pr-4 border-r border-black/40"><Hash className="inline mr-1.5 h-3.5 w-3.5 opacity-60" />수량</FormLabel>
            <div className="flex-1">
              <FormControl>
                <Input
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto"
                  {...field}
                  inputMode="decimal"
                  onBlur={() => { field.onBlur(); computeKrwPreview() }}
                />
              </FormControl>
              <FormMessage />
            </div>
          </FormItem>
        )} />

        <FormField control={form.control} name="pricePerUnit" render={({ field }) => (
          <FormItem className="flex flex-row items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
            <FormLabel className="w-32 shrink-0 text-right text-muted-foreground pr-4 border-r border-black/40"><CircleDollarSign className="inline mr-1.5 h-3.5 w-3.5 opacity-60" />단가 {isUSD ? '(USD)' : '(₩)'}</FormLabel>
            <div className="flex-1">
              <FormControl>
                <Input
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto"
                  {...field}
                  inputMode="decimal"
                  onBlur={() => { field.onBlur(); computeKrwPreview() }}
                />
              </FormControl>
              <FormMessage />
            </div>
          </FormItem>
        )} />

        {isUSD && (
          <FormField control={form.control} name="exchangeRate" render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
              <FormLabel className="w-32 shrink-0 text-right text-muted-foreground pr-4 border-r border-black/40"><BadgeDollarSign className="inline mr-1.5 h-3.5 w-3.5 opacity-60" />환율 (₩/$)</FormLabel>
              <div className="flex-1">
                <FormControl>
                  <Input
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto"
                    {...field}
                    inputMode="numeric"
                    placeholder="예: 1350"
                    onBlur={() => { field.onBlur(); computeKrwPreview() }}
                  />
                </FormControl>
                <FormMessage />
              </div>
            </FormItem>
          )} />
        )}

        {krwPreview && (
          <div className="text-sm text-muted-foreground font-mono pl-28">{krwPreview}</div>
        )}

        <FormField control={form.control} name="fee" render={({ field }) => (
          <FormItem className="flex flex-row items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
            <FormLabel className="w-32 shrink-0 text-right text-muted-foreground pr-4 border-r border-black/40"><Coins className="inline mr-1.5 h-3.5 w-3.5 opacity-60" />수수료 (₩)</FormLabel>
            <div className="flex-1">
              <FormControl><Input className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto" {...field} inputMode="numeric" /></FormControl>
              <FormMessage />
            </div>
          </FormItem>
        )} />

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem className="flex flex-row items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
            <FormLabel className="w-32 shrink-0 text-right text-muted-foreground pr-4 border-r border-black/40"><StickyNote className="inline mr-1.5 h-3.5 w-3.5 opacity-60" />메모</FormLabel>
            <div className="flex-1">
              <FormControl><Input className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto" {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </div>
          </FormItem>
        )} />

        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}

        {!hideActions && (
          <>
            <Separator className="bg-black/30" />
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending} className="rounded-xl px-5 text-muted-foreground hover:text-foreground">
                <X className="mr-1.5 h-4 w-4" />취소
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl px-6 font-medium shadow-sm">
                {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                {submitLabel}
              </Button>
            </div>
          </>
        )}
      </form>
    </Form>
  )
}
