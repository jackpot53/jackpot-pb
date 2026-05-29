'use client'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTransition, useState, useEffect, useRef } from 'react'
import { Loader2, Save, X, ArrowLeftRight, CalendarDays, Hash, CircleDollarSign, BadgeDollarSign, Coins, StickyNote, Wallet, Briefcase } from 'lucide-react'
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
import type { AssetType, Currency } from '@/lib/types/asset'
import { formatKrwRounded } from '@/lib/format'

const STOCK_ETF_TYPES: AssetType[] = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us']

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  isa: 'ISA', irp: 'IRP', pension: '연금저축', dc: 'DC', brokerage: '위탁',
  upbit: '업비트', bithumb: '빗썸', coinone: '코인원', korbit: '코빗',
  binance: '바이낸스', coinbase: '코인베이스', kraken: '크라켄', okx: 'OKX',
  fund_mirae: '미래에셋', fund_samsung: '삼성', fund_kb: 'KB', fund_shinhan: '신한', fund_hanwha: '한화',
  fund_nh: 'NH아문디', fund_korea: '한국투자', fund_kiwoom: '키움', fund_hana: '하나', fund_woori: '우리',
  fund_ibk: 'IBK', fund_daishin: '대신', fund_timefolio: '타임폴리오', fund_truston: '트러스톤',
  bank_kb: 'KB국민', bank_shinhan: '신한', bank_woori: '우리', bank_hana: '하나', bank_nh: 'NH농협',
  bank_kakao: '카카오', bank_toss: '토스', bank_k: '케이뱅크', bank_ibk: 'IBK기업', bank_kdb: 'KDB산업',
  bank_busan: '부산', bank_daegu: '대구', bank_gwangju: '광주', bank_jeonbuk: '전북', bank_jeju: '제주',
  bank_sbi: 'SBI저축', bank_ok: 'OK저축', bank_welcome: '웰컴저축', bank_pepper: '페퍼저축',
  bank_shincom: '신협', bank_saemaul: '새마을금고',
  coop_shincom: '신협', coop_saemaul: '새마을금고', coop_suhyup: '수협', coop_nh: '농협', coop_nfcf: '산림조합',
  ins_samsung_life: '삼성생명', ins_hanwha_life: '한화생명', ins_kyobo: '교보생명',
  ins_shinhan_life: '신한라이프', ins_nh_life: 'NH농협생명', ins_kb_life: 'KB라이프',
  ins_aia: 'AIA생명', ins_metlife: '메트라이프', ins_prudential: '푸르덴셜',
  ins_samsung_fire: '삼성화재', ins_hyundai: '현대해상', ins_db_fire: 'DB손보',
  ins_kb_fire: 'KB손보', ins_meritz: '메리츠화재', ins_hanwha_fire: '한화손보',
  ins_lotte_fire: '롯데손보', ins_im_life: 'IM라이프',
}
const BROKERAGE_LABELS: Record<string, string> = {
  sec_mirae: '미래에셋', sec_samsung: '삼성', sec_korea: '한국투자',
  sec_kb: 'KB', sec_nh: 'NH투자', sec_shinhan: '신한투자',
  sec_kiwoom: '키움', sec_daishin: '대신', sec_hana: '하나',
  sec_meritz: '메리츠', sec_toss: '토스', sec_kakao: '카카오페이',
  sec_hyundai: '현대차', sec_kyobo: '교보', sec_ibk: 'IBK',
}
const ACCOUNT_OPTIONS: Record<string, string[]> = {
  stock: ['isa', 'irp', 'pension', 'dc', 'brokerage'],
  fund: ['isa', 'irp', 'pension', 'dc', 'brokerage'],
  crypto: ['upbit', 'bithumb', 'coinone', 'korbit', 'binance', 'coinbase', 'kraken', 'okx'],
  savings: ['bank_kb', 'bank_shinhan', 'bank_woori', 'bank_hana', 'bank_nh', 'bank_kakao', 'bank_toss', 'bank_k', 'bank_ibk', 'bank_kdb', 'bank_busan', 'bank_daegu', 'bank_gwangju', 'bank_jeonbuk', 'bank_jeju', 'bank_sbi', 'bank_ok', 'bank_welcome', 'bank_pepper', 'bank_shincom', 'bank_saemaul'],
  insurance: ['ins_samsung_life', 'ins_hanwha_life', 'ins_kyobo', 'ins_shinhan_life', 'ins_nh_life', 'ins_kb_life', 'ins_aia', 'ins_metlife', 'ins_prudential', 'ins_im_life', 'ins_samsung_fire', 'ins_hyundai', 'ins_db_fire', 'ins_kb_fire', 'ins_meritz', 'ins_hanwha_fire', 'ins_lotte_fire'],
  fund_company: ['fund_mirae', 'fund_samsung', 'fund_kb', 'fund_shinhan', 'fund_hanwha', 'fund_nh', 'fund_korea', 'fund_kiwoom', 'fund_hana', 'fund_woori', 'fund_ibk', 'fund_daishin', 'fund_timefolio', 'fund_truston'],
  brokerage: Object.keys(BROKERAGE_LABELS),
}

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
  initialAccountType?: string | null
  initialBrokerageId?: string | null
  onSaveAccountType?: (accountType: string | null, brokerageId: string | null) => Promise<void>
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
  initialAccountType,
  initialBrokerageId,
  onSaveAccountType,
}: TransactionFormProps) {
  const [isPending, startTransition] = useTransition()
  const [krwPreview, setKrwPreview] = useState<string | null>(null)
  const [accountType, setAccountType] = useState(initialAccountType ?? '')
  const [brokerageId, setBrokerageId] = useState(initialBrokerageId ?? '')
  const [isFetchingFx, setIsFetchingFx] = useState(false)
  const fxFetchedDate = useRef<string | null>(null)
  const isUSD = currency === 'USD'
  const isUsAsset = assetType === 'stock_us' || assetType === 'etf_us'

  const schema = buildSchema(assetType)
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(schema) as Resolver<TransactionFormValues>,
    defaultValues: {
      type: 'buy',
      transactionDate: new Date().toISOString().split('T')[0],
      quantity: assetType === 'savings' ? '1' : '',
      pricePerUnit: '',
      fee: '0',
      exchangeRate: '',
      notes: null,
      ...defaultValues,
    },
    mode: 'onBlur',
  })

  const transactionDate = form.watch('transactionDate')
  useEffect(() => {
    if (!isUsAsset || !transactionDate) return
    if (fxFetchedDate.current === transactionDate) return
    setIsFetchingFx(true)
    fetch(`/api/fx-rate?date=${transactionDate}`)
      .then(r => r.json())
      .then(data => {
        if (data.rate) {
          form.setValue('exchangeRate', String(data.rate))
          fxFetchedDate.current = transactionDate
          // KRW 프리뷰 재계산
          setTimeout(() => computeKrwPreview(), 0)
        }
      })
      .catch(() => {})
      .finally(() => setIsFetchingFx(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUsAsset, transactionDate])

  function computeKrwPreview() {
    const qty = parseFloat(form.getValues('quantity') || '0')
    const price = parseFloat(form.getValues('pricePerUnit') || '0')
    const rate = parseFloat(form.getValues('exchangeRate') || '1')
    if (isUSD && qty > 0 && price > 0 && rate > 0) {
      setKrwPreview(`≈ ₩${formatKrwRounded(qty * price * rate)}`)
    } else if (!isUSD && qty > 0 && price > 0) {
      setKrwPreview(`≈ ₩${formatKrwRounded(qty * price)}`)
    } else {
      setKrwPreview(null)
    }
  }

  function handleSubmit(data: TransactionFormValues) {
    startTransition(async () => {
      const [result] = await Promise.all([
        onSubmit(data),
        onSaveAccountType ? onSaveAccountType(accountType || null, brokerageId || null) : Promise.resolve(),
      ])
      if (result?.error) {
        form.setError('root', { message: result.error })
      }
    })
  }

  const isSavings = assetType === 'savings'

  return (
    <Form data-component="TransactionForm" {...form}>
      <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-2">
        <FormField control={form.control} name="type" render={({ field }) => (
          <FormItem className="flex flex-row items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
            <FormLabel className="w-32 shrink-0 text-right text-muted-foreground pr-4 border-r border-black/40"><ArrowLeftRight className="inline mr-1.5 h-3.5 w-3.5 opacity-60" />거래 유형</FormLabel>
            <div className="flex-1">
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full border-0 bg-transparent shadow-none focus:ring-0 p-0 h-auto">
                    <SelectValue>{isSavings ? (field.value === 'buy' ? '납입' : '해지출금') : (field.value === 'buy' ? '매수' : '매도')}</SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="buy">{isSavings ? '납입' : '매수'}</SelectItem>
                  <SelectItem value="sell">{isSavings ? '해지출금' : '매도'}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </div>
          </FormItem>
        )} />

        <FormField control={form.control} name="transactionDate" render={({ field }) => (
          <FormItem className="flex flex-row items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
            <FormLabel className="w-32 shrink-0 text-right text-muted-foreground pr-4 border-r border-black/40"><CalendarDays className="inline mr-1.5 h-3.5 w-3.5 opacity-60" />{isSavings ? '납입일' : '날짜'}</FormLabel>
            <div className="flex-1">
              <FormControl><Input type="date" className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto" {...field} /></FormControl>
              <FormMessage />
            </div>
          </FormItem>
        )} />

        {!isSavings && (
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
        )}

        <FormField control={form.control} name="pricePerUnit" render={({ field }) => (
          <FormItem className="flex flex-row items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
            <FormLabel className="w-32 shrink-0 text-right text-muted-foreground pr-4 border-r border-black/40"><CircleDollarSign className="inline mr-1.5 h-3.5 w-3.5 opacity-60" />{isSavings ? '납입액 (₩)' : `단가 ${isUSD ? '(USD)' : '(₩)'}`}</FormLabel>
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

        {isUsAsset && (
          <FormField control={form.control} name="exchangeRate" render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
              <FormLabel className="w-32 shrink-0 text-right text-muted-foreground pr-4 border-r border-black/40"><BadgeDollarSign className="inline mr-1.5 h-3.5 w-3.5 opacity-60" />환율 (₩/$)</FormLabel>
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <div className="relative flex-1 min-w-0">
                  <FormControl>
                    <Input
                      className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto pr-6"
                      {...field}
                      inputMode="decimal"
                      placeholder="예: 1356.50"
                      onBlur={() => { field.onBlur(); computeKrwPreview() }}
                    />
                  </FormControl>
                  {isFetchingFx && (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    </span>
                  )}
                  <FormMessage />
                </div>
                {krwPreview && (
                  <span className="text-sm text-muted-foreground font-mono shrink-0">{krwPreview}</span>
                )}
              </div>
            </FormItem>
          )} />
        )}

        <FormField control={form.control} name="fee" render={({ field }) => (
          <FormItem className="flex flex-row items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
            <FormLabel className="w-32 shrink-0 text-right text-muted-foreground pr-4 border-r border-black/40"><Coins className="inline mr-1.5 h-3.5 w-3.5 opacity-60" />수수료 (₩)</FormLabel>
            <div className="flex-1">
              <FormControl><Input className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto" {...field} inputMode="decimal" /></FormControl>
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

        {onSaveAccountType && (() => {
          const isStockEtf = STOCK_ETF_TYPES.includes(assetType)
          const isFund = assetType === 'fund'
          const isCrypto = assetType === 'crypto'
          const isSavings = assetType === 'savings'
          const isInsurance = assetType === 'insurance'
          const accountLabel = isCrypto ? '거래소' : isSavings ? '은행' : isInsurance ? '보험사' : '계좌 유형'
          const accountOptions = isCrypto ? ACCOUNT_OPTIONS.crypto : isSavings ? ACCOUNT_OPTIONS.savings : isInsurance ? ACCOUNT_OPTIONS.insurance : ACCOUNT_OPTIONS.stock
          const showBrokerageRow = isStockEtf || isFund
          const brokerageOptions = isFund ? ACCOUNT_OPTIONS.fund_company : ACCOUNT_OPTIONS.brokerage
          const brokerageLabel = isFund ? '운용사' : '증권사'
          const getBrokerLabel = (v: string) => isFund ? ACCOUNT_TYPE_LABELS[v] : (BROKERAGE_LABELS[v] ?? v)

          return (
            <>
              {showBrokerageRow && (
                <div className="flex flex-row items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
                  <div className="w-32 shrink-0 text-left text-muted-foreground pr-4 border-r border-black/40 text-sm font-medium">
                    <Briefcase className="inline mr-1.5 h-3.5 w-3.5 opacity-60" />{brokerageLabel}
                  </div>
                  <div className="flex-1">
                    <Select value={brokerageId} onValueChange={(v) => setBrokerageId(v ?? '')}>
                      <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-0 p-0 h-auto">
                        <SelectValue>{brokerageId ? getBrokerLabel(brokerageId) : '선택 안함'}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">선택 안함</SelectItem>
                        {brokerageOptions.map((v) => <SelectItem key={v} value={v}>{getBrokerLabel(v)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className="flex flex-row items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
                <div className="w-32 shrink-0 text-left text-muted-foreground pr-4 border-r border-black/40 text-sm font-medium">
                  <Wallet className="inline mr-1.5 h-3.5 w-3.5 opacity-60" />{accountLabel}
                </div>
                <div className="flex-1">
                  <Select value={accountType} onValueChange={(v) => setAccountType(v ?? '')}>
                    <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-0 p-0 h-auto">
                      <SelectValue>{accountType ? ACCOUNT_TYPE_LABELS[accountType] ?? accountType : '선택 안함'}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">선택 안함</SelectItem>
                      {accountOptions.map((v) => <SelectItem key={v} value={v}>{ACCOUNT_TYPE_LABELS[v]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )
        })()}

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
