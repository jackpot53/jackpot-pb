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

const TRADEABLE_TYPES = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund']

const assetSchema = z.object({
  name: z.string().min(1, '종목명을 입력해주세요.').max(255),
  assetType: z.enum(['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'savings', 'real_estate']),
  priceType: z.enum(['live', 'manual']),
  currency: z.enum(['KRW', 'USD']),
  ticker: z.string().max(20).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  initialQuantity: z.string().optional().nullable(),
  initialPricePerUnit: z.string().optional().nullable(),
  initialTransactionDate: z.string().optional().nullable(),
  initialExchangeRate: z.string().optional().nullable(),
})

const TICKER_HINTS: Record<string, { placeholder: string; hint: string }> = {
  stock_kr: {
    placeholder: '예: 005930.KS',
    hint: 'KOSPI는 {종목코드}.KS, KOSDAQ는 {종목코드}.KQ\n예) 삼성전자 005930.KS · 카카오 035720.KQ',
  },
  etf_kr: {
    placeholder: '예: 069500.KS',
    hint: 'KOSPI 상장 ETF는 {종목코드}.KS\n예) KODEX 200 069500.KS · TIGER 미국S&P500 360750.KS',
  },
  stock_us: {
    placeholder: '예: AAPL',
    hint: '미국 주식은 NYSE/NASDAQ 티커 그대로 입력\n예) AAPL · MSFT · TSLA · NVDA',
  },
  etf_us: {
    placeholder: '예: VOO',
    hint: '미국 ETF는 NYSE Arca 티커 그대로 입력\n예) VOO · QQQ · SPY · SCHD',
  },
  crypto: {
    placeholder: '예: BINANCE:BTCUSDT',
    hint: 'Finnhub 형식: {거래소}:{심볼}\n예) BINANCE:BTCUSDT · BINANCE:ETHUSDT',
  },
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  stock_kr: '주식 (국내)',
  stock_us: '주식 (미국)',
  etf_kr: 'ETF (국내)',
  etf_us: 'ETF (미국)',
  crypto: '코인',
  fund: '펀드',
  savings: '예적금',
  real_estate: '부동산',
}

interface AssetFormProps {
  defaultValues?: Partial<AssetFormValues>
  onSubmit: (data: AssetFormValues) => Promise<{ error: string } | void>
  submitLabel: string
  showInitialTransaction?: boolean
  transactionSectionLabel?: string
}

export function AssetForm({ defaultValues, onSubmit, submitLabel, showInitialTransaction, transactionSectionLabel }: AssetFormProps) {
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
      initialQuantity: null,
      initialPricePerUnit: null,
      initialTransactionDate: new Date().toISOString().split('T')[0],
      initialExchangeRate: null,
      ...defaultValues,
    },
    mode: 'onBlur',
  })

  const priceType = form.watch('priceType')
  const assetType = form.watch('assetType')
  const currency = form.watch('currency')
  const isTradeable = TRADEABLE_TYPES.includes(assetType)
  const isUSD = currency === 'USD'

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
              <Select onValueChange={field.onChange} value={field.value}>
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
              <Select onValueChange={field.onChange} value={field.value}>
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
              <Select onValueChange={field.onChange} value={field.value}>
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
            render={({ field }) => {
              const hint = TICKER_HINTS[assetType]
              return (
                <FormItem>
                  <FormLabel>티커</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder={hint?.placeholder ?? '예: AAPL'}
                    />
                  </FormControl>
                  {hint && (
                    <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                      {hint.hint}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )
            }}
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

        {showInitialTransaction && isTradeable && (
          <>
            <div className="border-t pt-4 space-y-1">
              <p className="text-sm font-medium">{transactionSectionLabel ?? '초기 매수 내역 (선택)'}</p>
              <p className="text-xs text-muted-foreground">입력하면 거래 내역에 자동 등록됩니다.</p>
            </div>

            <FormField
              control={form.control}
              name="initialQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>수량</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} inputMode="decimal" placeholder={assetType === 'crypto' ? '예: 0.5' : '예: 10'} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initialPricePerUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>매수 단가 {isUSD ? '(USD)' : '(₩)'}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} inputMode="decimal" placeholder="예: 75000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isUSD && (
              <FormField
                control={form.control}
                name="initialExchangeRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>환율 (₩/＄)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} inputMode="numeric" placeholder="예: 1350" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="initialTransactionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>매수일</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

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
