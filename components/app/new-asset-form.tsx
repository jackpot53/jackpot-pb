'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTransition, useState, useRef, useEffect } from 'react'
import {
  Loader2, Save, ArrowLeft, ArrowRight, SkipForward,
  TrendingUp, Globe, BarChart2, BarChart3, Bitcoin, Briefcase, Landmark, Building2,
  Layers, Tag, Hash, Wallet, MessageSquare, Package, Receipt, Calendar,
  Coins, Info, Shield, PiggyBank, Heart, Store, Banknote, DollarSign, ArrowLeftRight, CreditCard,
  type LucideIcon,
} from 'lucide-react'
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
import { cn } from '@/lib/utils'
import type { AssetFormValues } from '@/app/actions/assets'
import { AssetLogo } from '@/components/app/asset-logo'

// ── Constants ──────────────────────────────────────────────────────────────

const TRADEABLE_TYPES = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'real_estate', 'savings']
const SEARCHABLE_TYPES = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us']
const ACCOUNT_TYPE_TYPES = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'fund', 'real_estate']

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  isa: 'ISA', irp: 'IRP', pension: '연금저축', dc: 'DC', brokerage: '위탁', spot: '현물', cma: 'CMA',
}
const ACCOUNT_TYPE_ICONS: Record<string, LucideIcon> = {
  isa: Shield, irp: PiggyBank, pension: Heart, dc: Building2, brokerage: Store, spot: Banknote, cma: CreditCard,
}
const ACCOUNT_TYPE_BY_ASSET: Record<string, string[]> = {
  real_estate: ['spot'],
  stock_kr: ['isa', 'irp', 'pension', 'dc', 'brokerage', 'cma'],
  stock_us: ['isa', 'irp', 'pension', 'dc', 'brokerage', 'cma'],
  etf_kr: ['isa', 'irp', 'pension', 'dc', 'brokerage', 'cma'],
  etf_us: ['isa', 'irp', 'pension', 'dc', 'brokerage', 'cma'],
  fund: ['isa', 'irp', 'pension', 'dc', 'brokerage', 'cma'],
}
const ASSET_TYPE_LABELS: Record<string, string> = {
  stock_kr: '주식 (국내)', stock_us: '주식 (미국)', etf_kr: 'ETF (국내)', etf_us: 'ETF (미국)',
  crypto: '코인', fund: '펀드', savings: '예적금', real_estate: '부동산',
}
const ASSET_TYPE_ICONS: Record<string, LucideIcon> = {
  stock_kr: TrendingUp, stock_us: Globe, etf_kr: BarChart2, etf_us: BarChart3,
  crypto: Bitcoin, fund: Briefcase, savings: Landmark, real_estate: Building2,
}
const TICKER_HINTS: Record<string, { placeholder: string; hint: string }> = {
  stock_kr: { placeholder: '예: 005930.KS', hint: 'KOSPI는 {종목코드}.KS, KOSDAQ는 {종목코드}.KQ\n예) 삼성전자 005930.KS · 카카오 035720.KQ' },
  etf_kr:   { placeholder: '예: 069500.KS', hint: 'KOSPI 상장 ETF는 {종목코드}.KS\n예) KODEX 200 069500.KS · TIGER 미국S&P500 360750.KS' },
  stock_us: { placeholder: '예: AAPL',      hint: '예) AAPL · MSFT · TSLA · NVDA' },
  etf_us:   { placeholder: '예: VOO',       hint: '예) VOO · QQQ · SPY · SCHD' },
  crypto:   { placeholder: '예: BINANCE:BTCUSDT', hint: 'Finnhub 형식: {거래소}:{심볼}\n예) BINANCE:BTCUSDT' },
  fund:     { placeholder: '예: K55236CN5311', hint: 'funetf.co.kr에서 펀드 검색 후 URL 마지막 코드 입력' },
}

// ── Schema ─────────────────────────────────────────────────────────────────

const assetSchema = z.object({
  name: z.string().min(1, '종목명을 입력해주세요.').max(255),
  assetType: z.enum(['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'savings', 'real_estate']),
  priceType: z.enum(['live', 'manual']),
  currency: z.enum(['KRW', 'USD']),
  accountType: z.enum(['isa', 'irp', 'pension', 'dc', 'brokerage', 'spot', 'cma']).optional().nullable(),
  ticker: z.string().max(20).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  initialQuantity: z.string().optional().nullable(),
  initialPricePerUnit: z.string().optional().nullable(),
  initialTransactionDate: z.string().optional().nullable(),
  initialExchangeRate: z.string().optional().nullable(),
})

interface TickerSuggestion { name: string; ticker: string }

const STEPS = [
  { label: '자산 유형' },
  { label: '종목 정보' },
  { label: '초기 매수' },
]

// ── Component ──────────────────────────────────────────────────────────────

export function NewAssetForm({ onSubmit }: {
  onSubmit: (data: AssetFormValues) => Promise<{ error: string } | void>
}) {
  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()

  // Ticker autocomplete state
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const isComposingRef = useRef(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: '', assetType: 'stock_kr', priceType: 'live', currency: 'KRW',
      accountType: null, ticker: null, notes: null,
      initialQuantity: null, initialPricePerUnit: null,
      initialTransactionDate: new Date().toISOString().split('T')[0],
      initialExchangeRate: null,
    },
    mode: 'onBlur',
  })

  const assetType = form.watch('assetType')
  const priceType = form.watch('priceType')
  const currency = form.watch('currency')
  const isSearchable = SEARCHABLE_TYPES.includes(assetType) && priceType === 'live'
  const isAccountTypeable = ACCOUNT_TYPE_TYPES.includes(assetType)
  const availableAccountTypes = ACCOUNT_TYPE_BY_ASSET[assetType] ?? Object.keys(ACCOUNT_TYPE_LABELS)
  const isUSD = currency === 'USD'

  useEffect(() => {
    if (assetType === 'real_estate') {
      form.setValue('accountType', 'spot')
    } else {
      const current = form.getValues('accountType')
      if (current === 'spot') form.setValue('accountType', null)
    }
    form.setValue('priceType', ['savings', 'real_estate'].includes(assetType) ? 'manual' : 'live')
  }, [assetType])

  // ── Ticker search ────────────────────────────────────────────────────────

  function handleNameInput(value: string, fieldOnChange: (val: string) => void) {
    fieldOnChange(value)
    if (!isSearchable) return
    clearTimeout(searchTimeout.current)
    if (value.length < 1) { setSuggestions([]); return }
    setIsSearching(true)
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ticker-search?q=${encodeURIComponent(value)}&type=${assetType}`)
        const data = await res.json()
        setSuggestions(data.results ?? [])
      } catch { setSuggestions([]) }
      finally { setIsSearching(false) }
    }, 400)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return
    if (e.key === 'Enter') {
      if (isComposingRef.current || e.nativeEvent.isComposing) return
      e.preventDefault()
      selectSuggestion(suggestions[0])
    } else if (e.key === 'Escape') {
      setSuggestions([])
    }
  }

  function selectSuggestion(s: TickerSuggestion) {
    form.setValue('name', s.name, { shouldValidate: true })
    form.setValue('ticker', s.ticker, { shouldValidate: true })
    setSuggestions([])
  }

  // ── Step navigation ──────────────────────────────────────────────────────

  async function goNext() {
    if (step === 0) {
      const ok = await form.trigger(['assetType'])
      if (ok) setStep(1)
    } else if (step === 1) {
      const ok = await form.trigger(['name', 'ticker'])
      if (ok) setStep(2)
    }
  }

  function handleSubmit(data: AssetFormValues) {
    startTransition(async () => {
      const result = await onSubmit(data)
      if (result?.error) form.setError('root', { message: result.error })
    })
  }

  function submitSkippingTransaction() {
    form.setValue('initialQuantity', null)
    form.setValue('initialPricePerUnit', null)
    form.setValue('initialExchangeRate', null)
    form.handleSubmit(handleSubmit)()
  }

  // ── Style helpers ────────────────────────────────────────────────────────

  const tileClass = (active: boolean) =>
    `rounded-md border py-2.5 px-1.5 text-[11px] text-center leading-snug transition-all duration-150 cursor-pointer flex flex-col items-center gap-1.5 ${
      active
        ? 'bg-foreground text-background border-foreground font-semibold'
        : 'text-foreground/55 border-border hover:border-foreground/35 hover:text-foreground/90'
    }`

  const pillClass = (active: boolean) =>
    `px-3 py-1 rounded-full text-xs border transition-all duration-150 inline-flex items-center gap-1.5 ${
      active
        ? 'bg-foreground text-background border-foreground font-medium'
        : 'text-muted-foreground border-border hover:border-foreground/35 hover:text-foreground'
    }`

  const lbl = 'py-3 pr-4 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground border-b border-r border-border/50'
  const cell = 'py-3 pl-4 min-w-0 border-b border-border/50'
  const row = 'contents'

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Form {...form}>
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-6">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                i < step  ? 'bg-foreground text-background' :
                i === step ? 'bg-foreground text-background ring-2 ring-foreground ring-offset-2 ring-offset-background' :
                             'bg-muted text-muted-foreground'
              )}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={cn(
                'text-sm transition-colors',
                i === step ? 'font-semibold text-foreground' : 'text-muted-foreground'
              )}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('mx-3 h-px w-8 transition-colors', i < step ? 'bg-foreground' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.preventDefault() }}
        className="space-y-4"
      >
        {/* ── Step 1: 자산 유형 ────────────────────────────────────────── */}
        {step === 0 && (
          <div className="flex gap-4 items-stretch">
            {/* 자산 유형 카드 */}
            <FormField
              control={form.control}
              name="assetType"
              render={({ field }) => (
                <FormItem className="flex-1 min-w-0">
                  <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-3">
                    <Layers className="h-4 w-4" />자산 유형
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-1.5 rounded-xl border border-border bg-muted/20 p-2">
                      {Object.entries(ASSET_TYPE_LABELS).map(([val, label]) => {
                        const Icon = ASSET_TYPE_ICONS[val]
                        const active = field.value === val
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => field.onChange(val)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 cursor-pointer text-left',
                              active
                                ? 'border-foreground bg-foreground text-background shadow-sm'
                                : 'border-border bg-card text-foreground/60 hover:border-foreground/40 hover:text-foreground hover:bg-muted/30'
                            )}
                          >
                            <Icon className="h-5 w-5 shrink-0" />
                            <span className="text-sm font-medium">{label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="w-px bg-border self-stretch" />

            {/* 계좌 유형 카드 */}
            <FormField
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem className="flex-1 min-w-0 self-start">
                  <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-3">
                    <Wallet className="h-4 w-4" />계좌 유형
                    <span className="text-xs font-normal text-muted-foreground/60">(선택)</span>
                  </FormLabel>
                  <FormControl>
                    <div className={cn(
                      'space-y-1.5 rounded-xl border border-border bg-muted/20 p-2',
                      !isAccountTypeable && 'opacity-40 pointer-events-none'
                    )}>
                      {availableAccountTypes.map((val) => {
                        const Icon = ACCOUNT_TYPE_ICONS[val]
                        const active = field.value === val
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => field.onChange(active ? null : val)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 cursor-pointer text-left',
                              active
                                ? 'border-foreground bg-foreground text-background shadow-sm'
                                : 'border-border bg-card text-foreground/60 hover:border-foreground/40 hover:text-foreground hover:bg-muted/30'
                            )}
                          >
                            <Icon className="h-5 w-5 shrink-0" />
                            <span className="text-sm font-medium">{ACCOUNT_TYPE_LABELS[val]}</span>
                          </button>
                        )
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* ── Step 2: 종목 정보 ────────────────────────────────────────── */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3 items-start">

            {/* 좌: 종목명 */}
            <FormField
              control={form.control}
              name="name"
              render={({ field: { value, onChange: fieldOnChange, ...restField } }) => (
                <FormItem className="rounded-xl border border-border bg-card p-4 space-y-3 row-span-2">
                  <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Tag className="h-4 w-4 shrink-0" />종목명
                    {isSearching && <Loader2 className="h-3.5 w-3.5 animate-spin ml-auto text-muted-foreground" />}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...restField}
                      value={value ?? ''}
                      autoComplete="off"
                      onChange={(e) => handleNameInput(e.target.value, fieldOnChange)}
                      onKeyDown={handleKeyDown}
                      onCompositionStart={() => { isComposingRef.current = true }}
                      onCompositionEnd={() => { isComposingRef.current = false }}
                    />
                  </FormControl>
                  <FormMessage />

                  {/* 검색 결과 리스트 */}
                  {suggestions.length > 0 && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      {suggestions.map((s) => {
                        const isSelected = value === s.name
                        return (
                          <button
                            key={s.ticker}
                            type="button"
                            onClick={() => selectSuggestion(s)}
                            className={cn(
                              'flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-all duration-150 cursor-pointer',
                              isSelected
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-border bg-background hover:border-foreground/40 hover:bg-muted/50'
                            )}
                          >
                            <AssetLogo
                              ticker={s.ticker}
                              name={s.name}
                              assetType={assetType as Parameters<typeof AssetLogo>[0]['assetType']}
                              size={32}
                            />
                            <span className="flex-1 text-sm font-medium truncate">{s.name}</span>
                            <span className={cn('text-xs font-mono shrink-0', isSelected ? 'text-background/70' : 'text-muted-foreground')}>{s.ticker}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </FormItem>
              )}
            />

            {/* 우상: 종목코드 */}
            <FormField
              control={form.control}
              name="ticker"
              render={({ field }) => {
                const hint = TICKER_HINTS[assetType]
                const disabled = priceType !== 'live'
                return (
                  <FormItem className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                      <Hash className="h-4 w-4 shrink-0" />종목코드
                    </FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} placeholder={hint?.placeholder ?? '예: AAPL'} disabled={disabled} />
                    </FormControl>
                    {hint && !disabled && (
                      <div className="flex gap-2 rounded-md border border-border bg-muted/60 px-3 py-2.5">
                        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{hint.hint}</p>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )
              }}
            />

            {/* 우하: 메모 */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <MessageSquare className="h-4 w-4 shrink-0" />메모
                    <span className="text-xs font-normal text-muted-foreground/60">(선택)</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} placeholder="예: 물타기" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* ── Step 3: 초기 매수 내역 ──────────────────────────────────── */}
        {step === 2 && (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-4 pt-3 pb-1 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                초기 매수 내역 · 선택
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="px-4 pb-4 grid grid-cols-[1fr_2fr_1.5fr] gap-3">
              <FormField
                control={form.control}
                name="initialQuantity"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-1.5">
                    <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                      <Package className="h-3.5 w-3.5 shrink-0" />수량
                    </FormLabel>
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
                  <FormItem className="flex flex-col gap-1.5">
                    <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                      <Receipt className="h-3.5 w-3.5 shrink-0" />매수 단가
                    </FormLabel>
                    <div className="flex items-center gap-1.5">
                      <FormControl className="flex-1 min-w-0">
                        <Input {...field} value={field.value ?? ''} inputMode="decimal" placeholder="예: 75000" className="w-full" />
                      </FormControl>
                      <div className="flex gap-1 shrink-0">
                        {([['KRW', '₩'], ['USD', '$']] as const).map(([val, label]) => {
                          const Icon = val === 'KRW' ? Banknote : DollarSign
                          return (
                            <button key={val} type="button" onClick={() => form.setValue('currency', val)} className={pillClass(currency === val)}>
                              <Icon className="h-3 w-3 shrink-0" />{label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="initialTransactionDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-1.5">
                    <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />매수일
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 환율 (USD인 경우만) */}
            {isUSD && (
              <div className="px-4 pb-4">
                <FormField
                  control={form.control}
                  name="initialExchangeRate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-1.5">
                      <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                        <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />환율 (원/달러)
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} inputMode="decimal" placeholder="예: 1350" className="max-w-48" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* hidden fields */}
            <FormField control={form.control} name="currency" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="priceType" render={({ field }) => <input type="hidden" {...field} />} />
          </div>
        )}

        {/* Root error */}
        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}

        {/* ── Navigation buttons ──────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t">
          {/* Left: back / cancel */}
          {step === 0 ? (
            <Button type="button" variant="outline" onClick={() => window.history.back()} className="w-28">
              <ArrowLeft className="mr-1.5 h-4 w-4" />취소
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)} disabled={isPending} className="w-28">
              <ArrowLeft className="mr-1.5 h-4 w-4" />이전
            </Button>
          )}

          {/* Right: next / skip+save / save */}
          <div className="flex items-center gap-2">
            {step < 2 && (
              <Button type="button" onClick={goNext} className="w-28">
                다음<ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
            {step === 2 && (
              <>
                <Button type="button" variant="outline" onClick={submitSkippingTransaction} disabled={isPending} className="w-36">
                  <SkipForward className="mr-1.5 h-4 w-4" />건너뛰기
                </Button>
                <Button type="submit" disabled={isPending} className="w-28">
                  {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                  저장
                </Button>
              </>
            )}
          </div>
        </div>
      </form>
    </Form>
  )
}
