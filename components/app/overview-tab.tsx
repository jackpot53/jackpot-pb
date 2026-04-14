'use client'
import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
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
import type { Asset } from '@/db/queries/assets'
import type { ManualValuation } from '@/db/queries/manual-valuations'
import type { HoldingRow } from '@/db/queries/holdings'

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
}

const fundPriceSchema = z.object({
  pricePerUnit: z.string()
    .min(1, '현재 단가를 입력해주세요.')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, '유효한 금액을 입력해주세요.'),
  valuedAt: z.string().min(1, '날짜를 입력해주세요.'),
  notes: z.string().max(1000).optional().nullable(),
})
type FundPriceFormValues = z.infer<typeof fundPriceSchema>

function FundValuationForm({ asset, holding, onSuccess }: { asset: Asset; holding: HoldingRow; onSuccess: () => void }) {
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
            평가금액 예상: ₩{formatKrw(previewKrw)} ({decodeQuantity(holding.totalQuantity)}좌 × ₩{formatKrw(Math.round(price))})
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
                <Input {...field} inputMode="numeric" placeholder="예: 1350" />
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

export function OverviewTab({ asset, valuations, holding }: OverviewTabProps) {
  const [showUpdateForm, setShowUpdateForm] = useState(false)
  const isManual = asset.priceType === 'manual' || asset.assetType === 'fund'
  const isFundAsset = asset.assetType === 'fund'

  const latestValuationKrw = valuations[0]?.valueKrw ?? null  // fund: 기준가; others: 총값
  const hasPosition = holding !== null && holding.totalQuantity > 0

  // fund: displayValueKrw = qty × 기준가; others: latestValuationKrw 그대로
  const displayValueKrw =
    isFundAsset && latestValuationKrw !== null && holding !== null
      ? Math.round((holding.totalQuantity / 1e8) * latestValuationKrw)
      : latestValuationKrw

  let evalProfitKrw: number | null = null
  let returnRate: number | null = null
  if (hasPosition && displayValueKrw !== null && holding!.totalCostKrw > 0) {
    evalProfitKrw = displayValueKrw - holding!.totalCostKrw
    returnRate = (evalProfitKrw / holding!.totalCostKrw) * 100
  }

  return (
    <div className="space-y-6 pt-4">
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
              asset.assetType === 'fund' && holding ? (
                <FundValuationForm
                  asset={asset}
                  holding={holding}
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
                    <TableHead>{isFundAsset ? '기준가 (₩/좌)' : '평가금액 (₩)'}</TableHead>
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
