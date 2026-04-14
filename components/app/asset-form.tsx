'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTransition, useState, useRef, useEffect } from 'react'
import { flushSync } from 'react-dom'
import { Loader2, Save, ArrowLeft, Search } from 'lucide-react'
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

const TRADEABLE_TYPES = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'real_estate']
const SEARCHABLE_TYPES = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us']
const ACCOUNT_TYPE_TYPES = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'fund', 'real_estate']

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  isa: 'ISA',
  irp: 'IRP',
  pension: '연금저축',
  dc: 'DC',
  brokerage: '위탁',
  spot: '현물',
}

const ACCOUNT_TYPE_BY_ASSET: Record<string, string[]> = {
  real_estate: ['spot'],
  stock_kr: ['isa', 'irp', 'pension', 'dc', 'brokerage'],
  stock_us: ['isa', 'irp', 'pension', 'dc', 'brokerage'],
  etf_kr: ['isa', 'irp', 'pension', 'dc', 'brokerage'],
  etf_us: ['isa', 'irp', 'pension', 'dc', 'brokerage'],
  fund: ['isa', 'irp', 'pension', 'dc', 'brokerage'],
}

interface TickerSuggestion {
  name: string
  ticker: string
}

const assetSchema = z.object({
  name: z.string().min(1, '종목명을 입력해주세요.').max(255),
  assetType: z.enum(['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'savings', 'real_estate']),
  priceType: z.enum(['live', 'manual']),
  currency: z.enum(['KRW', 'USD']),
  accountType: z.enum(['isa', 'irp', 'pension', 'dc', 'brokerage', 'spot']).optional().nullable(),
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
    hint: '구글에서 종목명 검색 후 종목코드를 아래 포맷에 맞게 입력\nKOSPI는 {종목코드}.KS, KOSDAQ는 {종목코드}.KQ\n예) 삼성전자 005930.KS · 카카오 035720.KQ',
  },
  etf_kr: {
    placeholder: '예: 069500.KS',
    hint: '구글에서 ETF명 검색 후 종목코드를 아래 포맷에 맞게 입력\nKOSPI 상장 ETF는 {종목코드}.KS\n예) KODEX 200 069500.KS · TIGER 미국S&P500 360750.KS',
  },
  stock_us: {
    placeholder: '예: AAPL',
    hint: '구글에서 종목명 검색 후 NYSE/NASDAQ 티커를 그대로 입력\n예) AAPL · MSFT · TSLA · NVDA',
  },
  etf_us: {
    placeholder: '예: VOO',
    hint: '구글에서 ETF명 검색 후 NYSE Arca 티커를 그대로 입력\n예) VOO · QQQ · SPY · SCHD',
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
  onCancel?: () => void
  submitLabel: string
  showInitialTransaction?: boolean
  transactionSectionLabel?: string
}

export function AssetForm({ defaultValues, onSubmit, onCancel, submitLabel, showInitialTransaction, transactionSectionLabel }: AssetFormProps) {
  const [isPending, startTransition] = useTransition()
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: '',
      assetType: 'stock_kr',
      priceType: 'live',
      currency: 'KRW',
      accountType: null,
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
  const isSearchable = SEARCHABLE_TYPES.includes(assetType) && priceType === 'live'
  const isAccountTypeable = ACCOUNT_TYPE_TYPES.includes(assetType)
  const availableAccountTypes = ACCOUNT_TYPE_BY_ASSET[assetType] ?? Object.keys(ACCOUNT_TYPE_LABELS)

  useEffect(() => {
    if (assetType === 'real_estate') {
      form.setValue('accountType', 'spot')
    } else {
      const current = form.getValues('accountType')
      if (current === 'spot') form.setValue('accountType', null)
    }
  }, [assetType])

  function handleNameInput(value: string, fieldOnChange: (val: string) => void) {
    fieldOnChange(value)

    if (!isSearchable) return

    clearTimeout(searchTimeout.current)
    if (value.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsSearching(true)
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ticker-search?q=${encodeURIComponent(value)}&type=${assetType}`)
        const data = await res.json()
        const results: TickerSuggestion[] = data.results ?? []
        setSuggestions(results)
        setShowSuggestions(results.length > 0)
      } catch {
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        setIsSearching(false)
      }
    }, 400)
  }

  function selectSuggestion(suggestion: TickerSuggestion) {
    form.setValue('name', suggestion.name, { shouldValidate: true })
    form.setValue('ticker', suggestion.ticker, { shouldValidate: true })
    setSuggestions([])
    setShowSuggestions(false)
  }

  async function searchAndFillTicker() {
    const name = form.getValues('name')
    if (!name || !isSearchable) return

    flushSync(() => setIsSearching(true))
    clearTimeout(searchTimeout.current)
    try {
      const res = await fetch(`/api/ticker-search?q=${encodeURIComponent(name)}&type=${assetType}`)
      const data = await res.json()
      const results: TickerSuggestion[] = data.results ?? []
      if (results.length > 0) {
        selectSuggestion(results[0])
      }
    } catch {
      // silent
    } finally {
      setIsSearching(false)
    }
  }

  function handleSubmit(data: AssetFormValues) {
    startTransition(async () => {
      const result = await onSubmit(data)
      if (result?.error) {
        form.setError('root', { message: result.error })
      }
    })
  }

  const pillClass = (active: boolean) =>
    `px-3 py-1 rounded-full text-sm border transition-colors ${
      active
        ? 'bg-foreground text-background border-foreground'
        : 'bg-transparent text-foreground border-border hover:border-foreground/50'
    }`

  const lbl = 'w-20 shrink-0 pt-2 text-sm font-medium'
  const row = 'flex flex-row items-start gap-3'

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-3">

        {/* 종목명 */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className={row}>
              <FormLabel className={lbl}>종목명</FormLabel>
              <div className="flex-1">
                <div ref={containerRef} className="relative">
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        autoComplete="off"
                        onChange={(e) => handleNameInput(e.target.value, field.onChange)}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      />
                      {isSearchable && (
                        <button
                          type="button"
                          onClick={searchAndFillTicker}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-accent transition-colors"
                          tabIndex={-1}
                        >
                          <Search className={`h-4 w-4 text-foreground${isSearching ? ' animate-pulse' : ''}`} />
                        </button>
                      )}
                    </div>
                  </FormControl>
                  {showSuggestions && (
                    <ul className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-md overflow-hidden">
                      {suggestions.map((s) => (
                        <li key={s.ticker}>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between gap-2"
                            onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s) }}
                          >
                            <span className="truncate">{s.name}</span>
                            <span className="text-xs text-muted-foreground font-mono shrink-0">{s.ticker}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        {/* 종목코드 (conditional) */}
        {priceType === 'live' && (
          <FormField
            control={form.control}
            name="ticker"
            render={({ field }) => {
              const hint = TICKER_HINTS[assetType]
              return (
                <FormItem className={row}>
                  <FormLabel className={lbl}>종목코드</FormLabel>
                  <div className="flex-1">
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} placeholder={hint?.placeholder ?? '예: AAPL'} />
                    </FormControl>
                    {hint && (
                      <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed mt-1">
                        {hint.hint}
                      </p>
                    )}
                    <FormMessage />
                  </div>
                </FormItem>
              )
            }}
          />
        )}

        {/* 자산 유형 */}
        <FormField
          control={form.control}
          name="assetType"
          render={({ field }) => (
            <FormItem className={row}>
              <FormLabel className={lbl}>자산 유형</FormLabel>
              <div className="flex-1">
                <FormControl>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(ASSET_TYPE_LABELS).map(([val, label]) => (
                      <button key={val} type="button" onClick={() => field.onChange(val)} className={pillClass(field.value === val)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        {/* 계좌 유형 (conditional) */}
        {isAccountTypeable && (
          <FormField
            control={form.control}
            name="accountType"
            render={({ field }) => (
              <FormItem className={row}>
                <FormLabel className={lbl}>계좌 유형</FormLabel>
                <div className="flex-1">
                  <FormControl>
                    <div className="flex flex-wrap gap-1.5">
                      {availableAccountTypes.map((val) => (
                        <button key={val} type="button" onClick={() => field.onChange(field.value === val ? null : val)} className={pillClass(field.value === val)}>
                          {ACCOUNT_TYPE_LABELS[val]}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        )}

        {/* 통화 */}
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem className={row}>
              <FormLabel className={lbl}>통화</FormLabel>
              <div className="flex-1">
                <FormControl>
                  <div className="flex gap-1.5">
                    {([['KRW', '원화'], ['USD', '달러']] as const).map(([val, label]) => (
                      <button key={val} type="button" onClick={() => field.onChange(val)} className={pillClass(field.value === val)}>{label}</button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        {/* 시세 유형 */}
        <FormField
          control={form.control}
          name="priceType"
          render={({ field }) => (
            <FormItem className={row}>
              <FormLabel className={lbl}>시세 유형</FormLabel>
              <div className="flex-1">
                <FormControl>
                  <div className="flex gap-1.5">
                    {(['live', 'manual'] as const).map((val) => (
                      <button key={val} type="button" onClick={() => field.onChange(val)} className={pillClass(field.value === val)}>
                        {val === 'live' ? '실시간' : '수동입력'}
                      </button>
                    ))}
                  </div>
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
            <FormItem className={row}>
              <FormLabel className={lbl}>메모</FormLabel>
              <div className="flex-1">
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="예: 물타기" />
                </FormControl>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        {/* 초기 매수 내역 */}
        {showInitialTransaction && isTradeable && (
          <>
            <div className="border-t pt-2">
              <p className="text-sm font-medium">{transactionSectionLabel ?? '초기 매수 내역 (선택)'}</p>
              <p className="text-xs text-muted-foreground">입력하면 거래 내역에 자동 등록됩니다.</p>
            </div>
            <FormField
              control={form.control}
              name="initialQuantity"
              render={({ field }) => (
                <FormItem className={row}>
                  <FormLabel className={lbl}>수량</FormLabel>
                  <div className="flex-1">
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} inputMode="decimal" placeholder={assetType === 'crypto' ? '예: 0.5' : '예: 10'} />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="initialPricePerUnit"
              render={({ field }) => (
                <FormItem className={row}>
                  <FormLabel className={lbl}>매수 단가 {isUSD ? '(USD)' : '(₩)'}</FormLabel>
                  <div className="flex-1">
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} inputMode="decimal" placeholder="예: 75000" />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="initialTransactionDate"
              render={({ field }) => (
                <FormItem className={row}>
                  <FormLabel className={lbl}>매수일</FormLabel>
                  <div className="flex-1">
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            {isUSD && (
              <FormField
                control={form.control}
                name="initialExchangeRate"
                render={({ field }) => (
                  <FormItem className={row}>
                    <FormLabel className={lbl}>환율 (₩/＄)</FormLabel>
                    <div className="flex-1">
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} inputMode="numeric" placeholder="예: 1350" />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            )}
          </>
        )}

        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}

        <div className="border-t" />

        <div className="flex justify-center gap-2">
          <Button type="submit" disabled={isPending} className="w-32">
            {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            {submitLabel}
          </Button>
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} className="w-32">
              취소
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => window.history.back()} disabled={isPending} className="w-32">
              <ArrowLeft className="mr-1.5 h-4 w-4" />취소
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}
