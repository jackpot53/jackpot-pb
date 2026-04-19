'use client'
import { useState, useTransition } from 'react'
import { Loader2, PiggyBank, TrendingUp, Calendar, Banknote, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { createManualValuation } from '@/app/actions/manual-valuations'
import { recordMonthlyContribution } from '@/app/actions/savings'
import { recordMonthlyPremium } from '@/app/actions/insurance'
import {
  computeCurrentSavingsValueKrw, computeExpectedMaturityValueKrw,
  remainingDays, annualizedReturnPct,
  type SavingsBuy,
} from '@/lib/savings'
import type { Asset } from '@/db/queries/assets'
import type { ManualValuation } from '@/db/queries/manual-valuations'
import type { HoldingRow } from '@/db/queries/holdings'
import type { SavingsDetailsRow } from '@/db/schema/savings-details'
import type { InsuranceDetailsRow } from '@/db/schema/insurance-details'

const valuationSchema = z.object({
  valueKrw: z.string()
    .min(1, '현재 가치를 입력해주세요.')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, '유효한 금액을 입력해주세요.'),
  currency: z.enum(['KRW', 'USD']),
  exchangeRate: z.string().optional(),
  valuedAt: z.string().min(1, '날짜를 입력해주세요.'),
  notes: z.string().max(1000).optional().nullable(),
})

type ValuationFormValues = z.infer<typeof valuationSchema>

function formatKrw(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value)
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  stock_kr: '주식 (국내)', stock_us: '주식 (미국)',
  etf_kr: 'ETF (국내)', etf_us: 'ETF (미국)',
  crypto: '코인', fund: '펀드', savings: '예적금', real_estate: '부동산',
}
const PRICE_TYPE_LABELS: Record<string, string> = {
  live: '실시간 (Live)', manual: '수동 (Manual)',
}

interface OverviewTabProps {
  asset: Asset
  valuations: ManualValuation[]
  holding: HoldingRow | null
  savingsDetails?: SavingsDetailsRow | null
  savingsBuys?: SavingsBuy[]
  insuranceDetails?: InsuranceDetailsRow | null
}

function SavingsInfoSection({
  assetId, details, buys, holding, latestManualKrw,
}: {
  assetId: string
  details: SavingsDetailsRow
  buys: SavingsBuy[]
  holding: HoldingRow | null
  latestManualKrw: number | null
}) {
  const [isPending, startTransition] = useTransition()
  const [recordError, setRecordError] = useState<string | null>(null)
  const [recorded, setRecorded] = useState(false)

  const rateBp = details.interestRateBp
  const hasRate = rateBp != null && rateBp > 0

  const autoValueKrw = hasRate ? computeCurrentSavingsValueKrw({
    buys,
    interestRateBp: rateBp!,
    maturityDate: details.maturityDate,
    compoundType: (details.compoundType ?? 'simple') as 'simple' | 'monthly',
    taxType: (details.taxType ?? 'taxable') as 'taxable' | 'tax_free' | 'preferential',
    autoRenew: details.autoRenew,
    kind: details.kind as 'term' | 'recurring' | 'free',
    monthlyContributionKrw: details.monthlyContributionKrw,
    depositStartDate: details.depositStartDate,
  }) : null

  const currentValueKrw = latestManualKrw ?? autoValueKrw
  const totalCostKrw = holding?.totalCostKrw ?? 0

  const returnPct = totalCostKrw > 0 && currentValueKrw != null
    ? ((currentValueKrw - totalCostKrw) / totalCostKrw) * 100
    : null

  const expectedMaturity = hasRate ? computeExpectedMaturityValueKrw({
    buys,
    interestRateBp: rateBp!,
    maturityDate: details.maturityDate,
    compoundType: (details.compoundType ?? 'simple') as 'simple' | 'monthly',
    taxType: (details.taxType ?? 'taxable') as 'taxable' | 'tax_free' | 'preferential',
    kind: details.kind as 'term' | 'recurring' | 'free',
    monthlyContributionKrw: details.monthlyContributionKrw,
    depositStartDate: details.depositStartDate,
  }) : null

  const daysLeft = details.maturityDate ? remainingDays(details.maturityDate) : null

  // 경과일수 (첫 납입일 → 오늘)
  const firstBuy = buys.length > 0 ? buys.reduce((a, b) => a.transactionDate < b.transactionDate ? a : b) : null
  const elapsedDays = firstBuy
    ? Math.floor((Date.now() - new Date(firstBuy.transactionDate).getTime()) / 86400000)
    : null
  const annualized = returnPct != null && elapsedDays != null && elapsedDays > 0
    ? annualizedReturnPct(returnPct, elapsedDays)
    : null

  const KIND_LABELS: Record<string, string> = { term: '정기예금', recurring: '정기적금', free: '자유적금' }
  const TAX_LABELS: Record<string, string> = { taxable: '일반 (15.4%)', tax_free: '비과세', preferential: '우대 (9.5%)' }

  function handleMonthlyContribution() {
    setRecordError(null)
    startTransition(async () => {
      const result = await recordMonthlyContribution(assetId)
      if (result?.error) {
        setRecordError(result.error)
      } else {
        setRecorded(true)
      }
    })
  }

  return (
    <div className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <PiggyBank className="h-4 w-4 text-yellow-600" />
        <span className="text-sm font-semibold text-yellow-800">예적금 정보</span>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-2 max-w-sm">
        <span className="text-sm text-muted-foreground">종류</span>
        <span className="text-sm">{KIND_LABELS[details.kind] ?? details.kind}</span>

        {details.depositStartDate && (
          <>
            <span className="text-sm text-muted-foreground">가입일</span>
            <span className="text-sm">{details.depositStartDate}</span>
          </>
        )}

        {details.maturityDate && (
          <>
            <span className="text-sm text-muted-foreground">만기일</span>
            <span className="text-sm">
              {details.maturityDate}
              {daysLeft != null && (
                <span className={`ml-2 text-xs font-medium ${daysLeft < 0 ? 'text-muted-foreground' : daysLeft <= 30 ? 'text-red-600' : 'text-yellow-700'}`}>
                  {daysLeft < 0 ? '만기완료' : `D-${daysLeft}`}
                </span>
              )}
            </span>
          </>
        )}

        {hasRate && (
          <>
            <span className="text-sm text-muted-foreground">연이자율</span>
            <span className="text-sm">{(rateBp! / 10000).toFixed(2)}%</span>
          </>
        )}

        <span className="text-sm text-muted-foreground">세금</span>
        <span className="text-sm">{TAX_LABELS[details.taxType ?? 'taxable']}</span>

        <span className="text-sm text-muted-foreground">복리 방식</span>
        <span className="text-sm">{details.compoundType === 'monthly' ? '월복리' : '단리'}</span>

        {currentValueKrw != null && (
          <>
            <span className="text-sm text-muted-foreground">현재 추정 평가액</span>
            <span className="text-sm font-medium">₩{formatKrw(currentValueKrw)}</span>
          </>
        )}

        {expectedMaturity != null && (
          <>
            <span className="text-sm text-muted-foreground">예상 만기 수령액</span>
            <span className="text-sm text-yellow-700 font-medium">₩{formatKrw(expectedMaturity)}</span>
          </>
        )}

        {annualized != null && (
          <>
            <span className="text-sm text-muted-foreground">연환산 수익률</span>
            <span className="text-sm font-medium text-red-500">+{annualized.toFixed(2)}%</span>
          </>
        )}
      </div>

      {(details.kind === 'recurring' || details.kind === 'free') && details.monthlyContributionKrw && (
        <div className="flex items-center gap-3 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="border-yellow-400 text-yellow-700 hover:bg-yellow-100"
            onClick={handleMonthlyContribution}
            disabled={isPending || recorded}
          >
            {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Banknote className="mr-1.5 h-3.5 w-3.5" />}
            {recorded ? '납입 완료!' : `이번 달 납입 기록 (₩${formatKrw(details.monthlyContributionKrw)})`}
          </Button>
          {recordError && <p className="text-xs text-destructive">{recordError}</p>}
        </div>
      )}
    </div>
  )
}

function InsuranceInfoSection({
  assetId, details, holding, latestManualKrw,
}: {
  assetId: string
  details: InsuranceDetailsRow
  holding: HoldingRow | null
  latestManualKrw: number | null
}) {
  const [isPending, startTransition] = useTransition()
  const [recordError, setRecordError] = useState<string | null>(null)
  const [recorded, setRecorded] = useState(false)

  const surrenderValueKrw = latestManualKrw
  const totalCostKrw = holding?.totalCostKrw ?? 0

  const surrenderRatePct = totalCostKrw > 0 && surrenderValueKrw != null
    ? (surrenderValueKrw / totalCostKrw) * 100
    : null

  const returnPct = totalCostKrw > 0 && surrenderValueKrw != null
    ? ((surrenderValueKrw - totalCostKrw) / totalCostKrw) * 100
    : null

  // 납입 진행률: paymentStartDate → paymentEndDate 기준
  const paymentProgress = (() => {
    if (!details.paymentStartDate || !details.paymentEndDate || !details.premiumPerCycleKrw) return null
    const start = new Date(details.paymentStartDate).getTime()
    const end = new Date(details.paymentEndDate).getTime()
    const now = Date.now()
    if (end <= start) return null
    const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
    return Math.round(pct)
  })()

  // 만기까지 남은 날수 (coverageEndDate 기준)
  const coverageDaysLeft = details.coverageEndDate
    ? Math.ceil((new Date(details.coverageEndDate).getTime() - Date.now()) / 86400000)
    : null

  // 납입 만료까지 남은 날수
  const paymentDaysLeft = details.paymentEndDate
    ? Math.ceil((new Date(details.paymentEndDate).getTime() - Date.now()) / 86400000)
    : null

  const CATEGORY_LABELS: Record<string, string> = { protection: '보장성', savings: '저축성' }
  const CYCLE_LABELS: Record<string, string> = {
    monthly: '월납', quarterly: '분기납', yearly: '연납', lump_sum: '일시납',
  }

  function handleMonthlyPremium() {
    setRecordError(null)
    startTransition(async () => {
      const result = await recordMonthlyPremium(assetId)
      if (result?.error) {
        setRecordError(result.error)
      } else {
        setRecorded(true)
      }
    })
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-semibold text-blue-800">보험 정보</span>
        {details.isPaidUp && (
          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">납입완료</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-2 max-w-sm">
        <span className="text-sm text-muted-foreground">보험 성격</span>
        <span className="text-sm">{CATEGORY_LABELS[details.category] ?? details.category}</span>

        <span className="text-sm text-muted-foreground">납입 주기</span>
        <span className="text-sm">{CYCLE_LABELS[details.paymentCycle] ?? details.paymentCycle}</span>

        {details.premiumPerCycleKrw != null && (
          <>
            <span className="text-sm text-muted-foreground">주기당 납입액</span>
            <span className="text-sm font-medium">₩{formatKrw(details.premiumPerCycleKrw)}</span>
          </>
        )}

        {details.contractDate && (
          <>
            <span className="text-sm text-muted-foreground">계약일</span>
            <span className="text-sm">{details.contractDate}</span>
          </>
        )}

        {details.paymentStartDate && (
          <>
            <span className="text-sm text-muted-foreground">납입 시작일</span>
            <span className="text-sm">{details.paymentStartDate}</span>
          </>
        )}

        {details.paymentEndDate && (
          <>
            <span className="text-sm text-muted-foreground">납입 만료일</span>
            <span className="text-sm">
              {details.paymentEndDate}
              {paymentDaysLeft != null && (
                <span className={`ml-2 text-xs font-medium ${paymentDaysLeft < 0 ? 'text-muted-foreground' : paymentDaysLeft <= 90 ? 'text-amber-600' : 'text-blue-700'}`}>
                  {paymentDaysLeft < 0 ? '납입완료' : `D-${paymentDaysLeft}`}
                </span>
              )}
            </span>
          </>
        )}

        {details.coverageEndDate && (
          <>
            <span className="text-sm text-muted-foreground">보장 만료일</span>
            <span className="text-sm">
              {details.coverageEndDate}
              {coverageDaysLeft != null && (
                <span className={`ml-2 text-xs font-medium ${coverageDaysLeft < 0 ? 'text-muted-foreground' : coverageDaysLeft <= 180 ? 'text-red-600' : 'text-blue-700'}`}>
                  {coverageDaysLeft < 0 ? '만기' : `D-${coverageDaysLeft}`}
                </span>
              )}
            </span>
          </>
        )}

        {details.sumInsuredKrw != null && (
          <>
            <span className="text-sm text-muted-foreground">보험가입금액</span>
            <span className="text-sm">₩{formatKrw(details.sumInsuredKrw)}</span>
          </>
        )}

        {details.expectedReturnRateBp != null && (
          <>
            <span className="text-sm text-muted-foreground">예상 공시이율</span>
            <span className="text-sm">{(details.expectedReturnRateBp / 10000).toFixed(2)}%</span>
          </>
        )}

        {surrenderValueKrw != null && totalCostKrw > 0 && (
          <>
            <span className="text-sm text-muted-foreground">해지환급금</span>
            <span className="text-sm font-medium">₩{formatKrw(surrenderValueKrw)}</span>
            <span className="text-sm text-muted-foreground">환급률</span>
            <span className={`text-sm font-medium ${returnPct != null && returnPct >= 0 ? 'text-red-500' : 'text-blue-600'}`}>
              {surrenderRatePct != null ? `${surrenderRatePct.toFixed(1)}%` : '—'}
              {returnPct != null && ` (${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%)`}
            </span>
          </>
        )}
      </div>

      {paymentProgress != null && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>납입 진행률</span>
            <span>{paymentProgress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-blue-100">
            <div
              className="h-1.5 rounded-full bg-blue-500 transition-all"
              style={{ width: `${paymentProgress}%` }}
            />
          </div>
        </div>
      )}

      {details.paymentCycle === 'monthly' && details.premiumPerCycleKrw && !details.isPaidUp && (
        <div className="flex items-center gap-3 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="border-blue-400 text-blue-700 hover:bg-blue-100"
            onClick={handleMonthlyPremium}
            disabled={isPending || recorded}
          >
            {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Banknote className="mr-1.5 h-3.5 w-3.5" />}
            {recorded ? '납입 완료!' : `이번 달 납입 기록 (₩${formatKrw(details.premiumPerCycleKrw)})`}
          </Button>
          {recordError && <p className="text-xs text-destructive">{recordError}</p>}
        </div>
      )}
    </div>
  )
}

const fundPriceSchema = z.object({
  pricePerUnit: z.string()
    .min(1, '현재 단가를 입력해주세요.')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, '유효한 금액을 입력해주세요.'),
  valuedAt: z.string().min(1, '날짜를 입력해주세요.'),
  notes: z.string().max(1000).optional().nullable(),
})
type FundPriceFormValues = z.infer<typeof fundPriceSchema>

function FundValuationForm({ asset, holding, onSuccess, unitLabel = '좌' }: { asset: Asset; holding: HoldingRow; onSuccess: () => void; unitLabel?: string }) {
  const [isPending, startTransition] = useTransition()
  const form = useForm<FundPriceFormValues>({
    resolver: zodResolver(fundPriceSchema),
    defaultValues: { pricePerUnit: '', valuedAt: new Date().toISOString().split('T')[0], notes: null },
    mode: 'onBlur',
  })
  const priceStr = form.watch('pricePerUnit')
  const price = parseFloat(priceStr)
  const qty = holding.totalQuantity / 1e8
  const previewKrw = !isNaN(price) && price > 0 && qty > 0 ? Math.round(price * qty) : null

  function handleSubmit(data: FundPriceFormValues) {
    startTransition(async () => {
      const price = parseFloat(data.pricePerUnit)
      // 기준가(NAV per unit)를 그대로 저장 — 곱셈 없음 (D-16 변경)
      const result = await createManualValuation(asset.id, {
        valueKrw: Math.round(price).toString(),
        currency: 'KRW',
        valuedAt: data.valuedAt,
        notes: data.notes ?? null,
      })
      if (result?.error) {
        form.setError('root', { message: result.error })
      } else {
        onSuccess()
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 max-w-sm">
        <FormField control={form.control} name="pricePerUnit" render={({ field }) => (
          <FormItem>
            <FormLabel>현재 단가 (₩)</FormLabel>
            <FormControl><Input {...field} inputMode="decimal" placeholder="예: 1250" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {previewKrw !== null && (
          <p className="text-xs text-muted-foreground">
            평가금액 예상: ₩{formatKrw(previewKrw)} ({decodeQuantity(holding.totalQuantity)}{unitLabel} × ₩{formatKrw(Math.round(price))})
          </p>
        )}

        <FormField control={form.control} name="valuedAt" render={({ field }) => (
          <FormItem>
            <FormLabel>기준 날짜</FormLabel>
            <FormControl><Input type="date" {...field} /></FormControl>
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
            가치 저장
          </Button>
          <Button type="button" variant="outline" onClick={onSuccess} disabled={isPending}>
            취소
          </Button>
        </div>
      </form>
    </Form>
  )
}

function ValuationUpdateForm({ asset, onSuccess }: { asset: Asset; onSuccess: () => void }) {
  const [isPending, startTransition] = useTransition()
  const isUSD = asset.currency === 'USD'
  const form = useForm<ValuationFormValues>({
    resolver: zodResolver(valuationSchema),
    defaultValues: {
      valueKrw: '',
      currency: asset.currency,
      exchangeRate: '',
      valuedAt: new Date().toISOString().split('T')[0],
      notes: null,
    },
    mode: 'onBlur',
  })

  function handleSubmit(data: ValuationFormValues) {
    startTransition(async () => {
      const result = await createManualValuation(asset.id, data)
      if (result?.error) {
        form.setError('root', { message: result.error })
      } else {
        onSuccess()
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 max-w-sm">
        <FormField control={form.control} name="valueKrw" render={({ field }) => (
          <FormItem>
            <FormLabel>현재 가치 {isUSD ? '(USD)' : '(₩)'}</FormLabel>
            <FormControl><Input {...field} inputMode="decimal" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {isUSD && (
          <FormField control={form.control} name="exchangeRate" render={({ field }) => (
            <FormItem>
              <FormLabel>거래 시 환율 (₩/＄)</FormLabel>
              <FormControl>
                <Input {...field} inputMode="decimal" placeholder="예: 1356.50" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}

        <FormField control={form.control} name="valuedAt" render={({ field }) => (
          <FormItem>
            <FormLabel>기준 날짜</FormLabel>
            <FormControl><Input type="date" {...field} /></FormControl>
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
            가치 저장
          </Button>
          <Button type="button" variant="outline" onClick={onSuccess} disabled={isPending}>
            취소
          </Button>
        </div>
      </form>
    </Form>
  )
}

function decodeQuantity(stored: number): string {
  const intPart = Math.floor(stored / 1e8)
  const fracPart = stored % 1e8
  if (fracPart === 0) return intPart.toString()
  return `${intPart}.${fracPart.toString().padStart(8, '0').replace(/0+$/, '')}`
}

export function OverviewTab({ asset, valuations, holding, savingsDetails = null, savingsBuys = [], insuranceDetails = null }: OverviewTabProps) {
  const [showUpdateForm, setShowUpdateForm] = useState(false)
  const isRealEstate = asset.assetType === 'real_estate'
  const usesUnitPrice = isRealEstate
  const isManual = asset.priceType === 'manual' || isRealEstate

  const latestValuationKrw = valuations[0]?.valueKrw ?? null  // fund/real_estate: 단가; others: 총값
  const hasPosition = holding !== null && holding.totalQuantity > 0

  // fund/real_estate: displayValueKrw = qty × 단가; others: latestValuationKrw 그대로
  const displayValueKrw =
    usesUnitPrice && latestValuationKrw !== null && holding !== null
      ? Math.round((holding.totalQuantity / 1e8) * latestValuationKrw)
      : latestValuationKrw

  let evalProfitKrw: number | null = null
  let returnRate: number | null = null
  if (hasPosition && displayValueKrw !== null && holding!.totalCostKrw > 0) {
    evalProfitKrw = displayValueKrw - holding!.totalCostKrw
    returnRate = (evalProfitKrw / holding!.totalCostKrw) * 100
  }

  return (
    <div data-component="OverviewTab" className="space-y-6 pt-4">
      {/* Holdings summary */}
      {hasPosition && (
        <>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">보유 현황</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 max-w-sm">
              <span className="text-sm text-muted-foreground">보유 수량</span>
              <span className="text-sm font-mono">{decodeQuantity(holding!.totalQuantity)}</span>
              <span className="text-sm text-muted-foreground">평균 단가</span>
              <span className="text-sm">₩{formatKrw(holding!.avgCostPerUnit)}</span>
              <span className="text-sm text-muted-foreground">총 투자금액</span>
              <span className="text-sm">₩{formatKrw(holding!.totalCostKrw)}</span>
              {displayValueKrw !== null && (
                <>
                  <span className="text-sm text-muted-foreground">현재 평가금액</span>
                  <span className="text-sm">₩{formatKrw(displayValueKrw)}</span>
                </>
              )}
              {evalProfitKrw !== null && returnRate !== null && (
                <>
                  <span className="text-sm text-muted-foreground">평가손익</span>
                  <span className={`text-sm font-medium ${evalProfitKrw >= 0 ? 'text-red-500' : 'text-blue-600'}`}>
                    {evalProfitKrw >= 0 ? '+' : ''}₩{formatKrw(evalProfitKrw)}
                    {' '}({returnRate >= 0 ? '+' : ''}{returnRate.toFixed(2)}%)
                  </span>
                </>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Savings info section */}
      {asset.assetType === 'savings' && savingsDetails && (
        <>
          <SavingsInfoSection
            assetId={asset.id}
            details={savingsDetails}
            buys={savingsBuys}
            holding={holding}
            latestManualKrw={valuations[0]?.valueKrw ?? null}
          />
          <Separator />
        </>
      )}

      {/* Insurance info section */}
      {asset.assetType === 'insurance' && insuranceDetails && (
        <>
          <InsuranceInfoSection
            assetId={asset.id}
            details={insuranceDetails}
            holding={holding}
            latestManualKrw={valuations[0]?.valueKrw ?? null}
          />
          <Separator />
        </>
      )}

      {/* Asset metadata */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 max-w-sm">
          <span className="text-sm text-muted-foreground">자산 유형</span>
          <span className="text-sm">{ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType}</span>
          <span className="text-sm text-muted-foreground">통화</span>
          <span className="text-sm">{asset.currency}</span>
          <span className="text-sm text-muted-foreground">시세 유형</span>
          <span className="text-sm">{PRICE_TYPE_LABELS[asset.priceType] ?? asset.priceType}</span>
          {asset.ticker && (
            <>
              <span className="text-sm text-muted-foreground">티커</span>
              <span className="text-sm font-mono">{asset.ticker}</span>
            </>
          )}
          {asset.notes && (
            <>
              <span className="text-sm text-muted-foreground">메모</span>
              <span className="text-sm">{asset.notes}</span>
            </>
          )}
        </div>
      </div>

      {/* Manual valuation section (only for manual assets) */}
      {isManual && (
        <>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">가치 이력</h2>
              {!showUpdateForm && (
                <Button onClick={() => setShowUpdateForm(true)}>
                  현재 가치 업데이트
                </Button>
              )}
            </div>

            {showUpdateForm && (
              usesUnitPrice && holding ? (
                <FundValuationForm
                  asset={asset}
                  holding={holding}
                  unitLabel={isRealEstate ? '개' : '좌'}
                  onSuccess={() => setShowUpdateForm(false)}
                />
              ) : (
                <ValuationUpdateForm
                  asset={asset}
                  onSuccess={() => setShowUpdateForm(false)}
                />
              )
            )}

            {valuations.length === 0 && !showUpdateForm ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-sm font-semibold text-foreground">가치 업데이트 내역이 없습니다</p>
                <p className="text-sm text-muted-foreground">현재 가치를 업데이트하면 이력이 여기에 표시됩니다.</p>
              </div>
            ) : valuations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead>{isRealEstate ? '단가 (₩/개)' : asset.assetType === 'savings' ? '실지급액 (₩)' : '평가금액 (₩)'}</TableHead>
                    <TableHead>메모</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {valuations.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="text-sm">{v.valuedAt}</TableCell>
                      <TableCell className="text-sm">{formatKrw(v.valueKrw)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{v.notes ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
