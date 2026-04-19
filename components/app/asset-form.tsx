'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTransition, useState, useRef, useEffect } from 'react'
import { flushSync } from 'react-dom'
import { Loader2, Save, ArrowLeft, Search, TrendingUp, Globe, BarChart2, BarChart3, Bitcoin, Briefcase, Landmark, Building2, Layers, Tag, Hash, Wallet, Activity, MessageSquare, Package, Receipt, Calendar, ArrowLeftRight, Coins, Info, Shield, PiggyBank, Heart, Store, Banknote, DollarSign, Zap, PenLine, type LucideIcon } from 'lucide-react'
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
import type { ContributionDividendRateRow } from '@/db/schema/contribution-dividend-rates'
import { upsertDividendRate, deleteDividendRate } from '@/app/actions/contribution'

const TRADEABLE_TYPES = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'real_estate', 'savings']
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

const ACCOUNT_TYPE_ICONS: Record<string, LucideIcon> = {
  isa: Shield,
  irp: PiggyBank,
  pension: Heart,
  dc: Building2,
  brokerage: Store,
  spot: Banknote,
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
  assetType: z.enum(['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'savings', 'real_estate', 'insurance', 'precious_metal', 'cma', 'contribution', 'bond']),
  priceType: z.enum(['live', 'manual']),
  currency: z.enum(['KRW', 'USD']),
  accountType: z.enum(['isa', 'irp', 'pension', 'dc', 'brokerage', 'spot', 'cma', 'insurance', 'upbit', 'bithumb', 'coinone', 'korbit', 'binance', 'coinbase', 'kraken', 'okx', 'fund_mirae', 'fund_samsung', 'fund_kb', 'fund_shinhan', 'fund_hanwha', 'fund_nh', 'fund_korea', 'fund_kiwoom', 'fund_hana', 'fund_woori', 'fund_ibk', 'fund_daishin', 'fund_timefolio', 'fund_truston', 'bank_kb', 'bank_shinhan', 'bank_woori', 'bank_hana', 'bank_nh', 'bank_kakao', 'bank_toss', 'bank_k', 'bank_ibk', 'bank_kdb', 'bank_busan', 'bank_daegu', 'bank_gwangju', 'bank_jeonbuk', 'bank_jeju', 'bank_sbi', 'bank_ok', 'bank_welcome', 'bank_pepper', 'bank_shincom', 'bank_saemaul', 'coop_shincom', 'coop_saemaul', 'coop_suhyup', 'coop_nh', 'coop_nfcf', 'ins_samsung_life', 'ins_hanwha_life', 'ins_kyobo', 'ins_shinhan_life', 'ins_nh_life', 'ins_kb_life', 'ins_aia', 'ins_metlife', 'ins_prudential', 'ins_im_life', 'ins_samsung_fire', 'ins_hyundai', 'ins_db_fire', 'ins_kb_fire', 'ins_meritz', 'ins_hanwha_fire', 'ins_lotte_fire']).optional().nullable(),
  brokerageId: z.string().max(50).optional().nullable(),
  withdrawalBankId: z.string().max(50).optional().nullable(),
  owner: z.string().max(20).optional().nullable(),
  ticker: z.string().max(20).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  initialQuantity: z.string().optional().nullable(),
  initialPricePerUnit: z.string().optional().nullable(),
  initialTransactionDate: z.string().optional().nullable(),
  initialExchangeRate: z.string().optional().nullable(),
  insuranceType: z.string().max(50).optional().nullable(),
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
  fund: {
    placeholder: '예: K55236CN5311',
    hint: 'funetf.co.kr에서 펀드 검색 후 URL 마지막 코드를 입력\n예) funetf.co.kr/product/fund/view/K55236CN5311 → K55236CN5311',
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
  contribution: '출자금',
}

const ASSET_TYPE_ICONS: Record<string, LucideIcon> = {
  stock_kr: TrendingUp,
  stock_us: Globe,
  etf_kr: BarChart2,
  etf_us: BarChart3,
  crypto: Bitcoin,
  fund: Briefcase,
  savings: Landmark,
  real_estate: Building2,
  contribution: Coins,
}

const MANUAL_PRICE_TYPES = ['savings', 'real_estate', 'contribution']

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

interface AssetFormProps {
  defaultValues?: Partial<AssetFormValues>
  onSubmit: (data: AssetFormValues) => Promise<{ error: string } | void>
  onCancel?: () => void
  submitLabel: string
  showInitialTransaction?: boolean
  transactionSectionLabel?: string
  contributionDividendRates?: ContributionDividendRateRow[]
  assetId?: string
}

function ContributionDividendSection({
  assetId,
  rates: initialRates,
}: {
  assetId: string
  rates: ContributionDividendRateRow[]
}) {
  const [rates, setRates] = useState<ContributionDividendRateRow[]>(initialRates)
  const [yearInput, setYearInput] = useState(String(new Date().getFullYear()))
  const [rateInput, setRateInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleAdd() {
    const year = parseInt(yearInput, 10)
    if (isNaN(year) || !rateInput) { setError('연도와 배당률을 입력해주세요.'); return }
    setError(null)
    startTransition(async () => {
      const result = await upsertDividendRate(assetId, year, rateInput)
      if (result?.error) { setError(result.error); return }
      setRates(prev => {
        const filtered = prev.filter(r => r.year !== year)
        return [...filtered, {
          id: '', assetId, userId: '', year,
          rateBp: Math.round(parseFloat(rateInput) * 10000),
          createdAt: new Date(),
        }].sort((a, b) => a.year - b.year)
      })
      setRateInput('')
    })
  }

  function handleDelete(year: number) {
    startTransition(async () => {
      await deleteDividendRate(assetId, year)
      setRates(prev => prev.filter(r => r.year !== year))
    })
  }

  return (
    <div className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground pb-2.5 border-b border-border">
        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-muted">
          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
        </span>
        배당 이력
      </p>

      {rates.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {[...rates].sort((a, b) => a.year - b.year).map(r => (
            <div key={r.year} className="flex items-center justify-between px-3 py-2 rounded-lg bg-card border border-border">
              <span className="text-sm font-medium">{r.year}년</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-green-400">{(r.rateBp / 10000).toFixed(2)}%</span>
                <button
                  type="button"
                  onClick={() => handleDelete(r.year)}
                  disabled={pending}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">배당 이력이 없습니다.</p>
      )}

      <div className="flex gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">연도</label>
          <Input
            type="number"
            value={yearInput}
            onChange={e => setYearInput(e.target.value)}
            className="w-20"
            placeholder="2025"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-muted-foreground">배당률 (%)</label>
          <Input
            type="number"
            step="0.01"
            value={rateInput}
            onChange={e => setRateInput(e.target.value)}
            placeholder="예: 3.5"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending}
          className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {pending ? '저장 중…' : '추가'}
        </button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function AssetForm({ defaultValues, onSubmit, onCancel, submitLabel, showInitialTransaction, transactionSectionLabel, contributionDividendRates, assetId }: AssetFormProps) {
  const [isPending, startTransition] = useTransition()
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const isComposingRef = useRef(false)
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
      brokerageId: null,
      withdrawalBankId: null,
      owner: null,
      ticker: null,
      notes: null,
      initialQuantity: null,
      initialPricePerUnit: null,
      initialTransactionDate: new Date().toISOString().split('T')[0],
      initialExchangeRate: null,
      insuranceType: null,
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
    form.setValue('priceType', MANUAL_PRICE_TYPES.includes(assetType) ? 'manual' : 'live')
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
        setActiveIndex(0)
        setShowSuggestions(results.length > 0)
      } catch {
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        setIsSearching(false)
      }
    }, 400)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (isComposingRef.current || e.nativeEvent.isComposing) return
      e.preventDefault()
      const picked = suggestions[activeIndex]
      if (picked) selectSuggestion(picked)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
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

  return (
    <Form data-component="AssetForm" {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.preventDefault() }} className="grid grid-cols-[9rem_1fr] gap-y-3">

        {/* 자산 유형 + 계좌 유형 그룹 */}
        <div className="col-span-2 rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-[9rem_1fr]">

            {/* 자산 유형 */}
            <FormField
              control={form.control}
              name="assetType"
              render={({ field }) => (
                <FormItem className={row}>
                  <FormLabel className={lbl}><Layers className="h-3.5 w-3.5 shrink-0" />자산 유형</FormLabel>
                  <div className={cell}>
                    <FormControl>
                      <div className="grid grid-cols-4 gap-1.5">
                        {Object.entries(ASSET_TYPE_LABELS).map(([val, label]) => {
                          const Icon = ASSET_TYPE_ICONS[val]
                          return (
                            <button key={val} type="button" onClick={() => field.onChange(val)} className={tileClass(field.value === val)}>
                              <Icon className="h-3.5 w-3.5" />
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            {/* 계좌 유형 */}
            <FormField
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem className={row}>
                  <FormLabel className={`${lbl} !border-b-0`}><Wallet className="h-3.5 w-3.5 shrink-0" />계좌 유형</FormLabel>
                  <div className={`${cell} !border-b-0`}>
                    <FormControl>
                      <div className={`grid grid-cols-3 gap-1.5 ${!isAccountTypeable ? 'opacity-40 pointer-events-none' : ''}`}>
                        {availableAccountTypes.map((val) => {
                          const Icon = ACCOUNT_TYPE_ICONS[val]
                          return (
                            <button key={val} type="button" onClick={() => field.onChange(field.value === val ? null : val)} className={tileClass(field.value === val)}>
                              <Icon className="h-3.5 w-3.5" />
                              {ACCOUNT_TYPE_LABELS[val]}
                            </button>
                          )
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* 종목명 + 종목코드 + 초기 매수 내역 그룹 */}
        <div className="col-span-2 rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-[9rem_1fr]">

            {/* 종목명 */}
            <FormField
              control={form.control}
              name="name"
              render={({ field: { value, onChange: fieldOnChange, ...restField } }) => (
                <FormItem className={row}>
                  <FormLabel className={lbl}><Tag className="h-3.5 w-3.5 shrink-0" />종목명</FormLabel>
                  <div className={`${cell} pr-4`}>
                    <div ref={containerRef} className="relative">
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...restField}
                            value={value ?? ''}
                            autoComplete="off"
                            onChange={(e) => handleNameInput(e.target.value, fieldOnChange)}
                            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                            onKeyDown={handleKeyDown}
                            onCompositionStart={() => { isComposingRef.current = true }}
                            onCompositionEnd={() => { isComposingRef.current = false }}
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
                        <ul className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden divide-y divide-border/40">
                          {suggestions.map((s, i) => (
                            <li key={s.ticker}>
                              <button
                                type="button"
                                className={`w-full text-left px-3 py-2 text-xs hover:bg-accent flex items-center justify-between gap-2 transition-colors${activeIndex === i ? ' bg-accent' : ''}`}
                                onMouseEnter={() => setActiveIndex(i)}
                                onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s) }}
                              >
                                <span className="truncate font-medium">{s.name}</span>
                                <span className="text-muted-foreground font-mono shrink-0">{s.ticker}</span>
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

            {/* 보험 유형 */}
            {assetType === 'insurance' && (
              <FormItem className={row}>
                <FormLabel className={lbl}><Shield className="h-3.5 w-3.5 shrink-0" />보험유형</FormLabel>
                <div className={`${cell} pr-4`}>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([
                      ['종신보험', 'whole_life' ],
                      ['정기보험', 'term_life'  ],
                      ['연금보험', 'annuity'    ],
                      ['변액보험', 'variable'   ],
                      ['저축보험', 'savings_ins'],
                      ['실손보험', 'actual_loss'],
                      ['건강보험', 'health'     ],
                    ] as const).map(([label, typeVal]) => {
                      const active = form.watch('insuranceType') === typeVal
                      return (
                        <button
                          key={typeVal}
                          type="button"
                          onClick={() => form.setValue('insuranceType', active ? null : typeVal)}
                          className={tileClass(active)}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  <FormMessage />
                </div>
              </FormItem>
            )}

            {/* 종목코드 */}
            <FormField
              control={form.control}
              name="ticker"
              render={({ field }) => {
                const hint = TICKER_HINTS[assetType]
                const disabled = priceType !== 'live'
                const isLastRow = !showInitialTransaction
                return (
                  <FormItem className={row}>
                    <FormLabel className={`${lbl}${isLastRow ? ' !border-b-0' : ''}`}><Hash className="h-3.5 w-3.5 shrink-0" />종목코드</FormLabel>
                    <div className={`${cell} pr-4${isLastRow ? ' !border-b-0' : ''}`}>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder={hint?.placeholder ?? '예: AAPL'} disabled={disabled} />
                      </FormControl>
                      {hint && !disabled && (
                        <div className="mt-2 flex gap-2 rounded-md border border-border bg-muted/60 px-3 py-2.5">
                          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{hint.hint}</p>
                        </div>
                      )}
                      <FormMessage />
                    </div>
                  </FormItem>
                )
              }}
            />
          </div>

          {/* 초기 매수 내역 */}
          {showInitialTransaction && (
            <>
              <div className="flex items-center gap-3 px-4 pt-3 pb-1">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {transactionSectionLabel ?? '초기 매수 내역 · 선택'}
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
                        <Calendar className="h-3.5 w-3.5 shrink-0" />{assetType === 'savings' ? '가입날짜' : '매수일'}
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="initialExchangeRate"
                render={({ field }) => <input type="hidden" {...field} value={field.value ?? ''} />}
              />
            </>
          )}
        </div>

        {/* 출자금 도움말 */}
        {assetType === 'contribution' && (
          <div className="col-span-2 rounded-xl border border-border overflow-hidden text-xs text-foreground/80">
            <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-2">
              <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="font-semibold text-sm">출자금이란?</span>
            </div>
            <div className="px-4 py-3 leading-relaxed border-b border-border text-muted-foreground">
              조합(신협, 새마을금고, 농협 등)에 조합원으로 가입하면서 납입하는 돈으로, 예금이 아닌 <strong className="text-foreground">조합의 주인(조합원)이 되는 지분</strong> 성격의 자산입니다.
            </div>

            <div className="px-4 py-3 border-b border-border">
              <p className="font-semibold mb-2 text-foreground/70 tracking-wide uppercase text-[10px]">핵심 정보 한눈에 보기</p>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 pr-4 font-medium text-muted-foreground w-32">항목</th>
                    <th className="text-left py-1.5 font-medium text-muted-foreground">내용</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {([
                    ['법적 성격', '지분 (조합원 자격)'],
                    ['원금 보장', '❌ 비보장 (조합 부실 시 손실 가능)'],
                    ['예금자보호', '❌ 적용 안 됨'],
                    ['수익 방식', '연 1회 배당 (조합 결산 후)'],
                    ['배당률', '매년 조합 실적에 따라 변동 (0원 가능)'],
                    ['중도 인출', '❌ 불가 (탈퇴 신청 후 처리 기간 필요)'],
                    ['비과세 한도', '출자금 1,000만원 이하 배당소득 비과세'],
                    ['초과 시 세금', '1,000만원 초과분 배당에 15.4% 부과'],
                  ] as const).map(([item, content]) => (
                    <tr key={item}>
                      <td className="py-1.5 pr-4 text-muted-foreground">{item}</td>
                      <td className="py-1.5">{content}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-b border-border">
              <p className="font-semibold mb-2 text-foreground/70 tracking-wide uppercase text-[10px]">비과세 예시</p>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    {['출자금', '배당률', '배당금', '비과세', '과세', '실수령'].map((h) => (
                      <th key={h} className="text-left py-1.5 pr-3 last:pr-0 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {([
                    ['500만원', '3%', '15만원', '15만원 전액', '없음', '15만원'],
                    ['1,000만원', '3%', '30만원', '30만원 전액', '없음', '30만원'],
                    ['1,500만원', '3%', '45만원', '30만원', '15만원 × 15.4% = 2.3만원', '42.7만원'],
                    ['2,000만원', '3%', '60만원', '30만원', '30만원 × 15.4% = 4.6만원', '55.4만원'],
                  ] as const).map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell, i) => (
                        <td key={i} className="py-1.5 pr-3 last:pr-0 whitespace-nowrap">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 text-muted-foreground leading-relaxed">
              ⚠️ 비과세 한도 및 적용 조건은 변경될 수 있으며, 여러 조합에 분산 출자 시 합산 기준 적용 여부는 가입 전 해당 조합에 직접 확인하세요.
            </div>
          </div>
        )}

        {/* 숨겨진 필드 */}
        <div className="col-span-2 hidden">
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => <input type="hidden" {...field} />}
          />
          <FormField
            control={form.control}
            name="priceType"
            render={({ field }) => <input type="hidden" {...field} />}
          />
        </div>

        {/* 메모 */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem className={row}>
              <FormLabel className={lbl}><MessageSquare className="h-3.5 w-3.5 shrink-0" />메모</FormLabel>
              <div className={cell}>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="예: 물타기" />
                </FormControl>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <p className="col-span-2 text-sm text-destructive pt-2">{form.formState.errors.root.message}</p>
        )}

        {assetType === 'contribution' && assetId && contributionDividendRates !== undefined && (
          <div className="col-span-2">
            <ContributionDividendSection assetId={assetId} rates={contributionDividendRates} />
          </div>
        )}

        <div className="col-span-2 flex items-center justify-end gap-2 pt-4 mt-2 border-t">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} className="w-32">
              취소
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => window.history.back()} disabled={isPending} className="w-32">
              <ArrowLeft className="mr-1.5 h-4 w-4" />취소
            </Button>
          )}
          <Button type="submit" disabled={isPending} className="w-32">
            {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
