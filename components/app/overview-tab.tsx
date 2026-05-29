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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { createManualValuation } from '@/app/actions/manual-valuations'
import type { Asset } from '@/db/queries/assets'
import type { ManualValuation } from '@/db/queries/manual-valuations'
import type { HoldingRow } from '@/db/queries/holdings'
import type { SavingsDetailsRow } from '@/db/schema/savings-details'
import type { InsuranceDetailsRow } from '@/db/schema/insurance-details'
import type { SavingsBuy } from '@/lib/savings'
import { decodeQuantity, formatKrwPlain as formatKrw } from '@/lib/format'

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

interface OverviewTabProps {
  asset: Asset
  valuations: ManualValuation[]
  holding: HoldingRow | null
  savingsDetails?: SavingsDetailsRow | null
  savingsBuys?: SavingsBuy[]
  insuranceDetails?: InsuranceDetailsRow | null
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
      const result = await createManualValuation(asset.id, {
        valueKrw: Math.round(parseFloat(data.pricePerUnit)).toString(),
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

export function OverviewTab({ asset, valuations, holding }: OverviewTabProps) {
  const [showUpdateForm, setShowUpdateForm] = useState(false)
  const isRealEstate = asset.assetType === 'real_estate'
  const usesUnitPrice = isRealEstate || asset.assetType === 'fund'
  const isManual = asset.priceType === 'manual' || isRealEstate

  if (!isManual) return null

  return (
    <div className="space-y-4 pt-4">
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
        <div className="[&_[data-slot=table-container]]:rounded-none">
          <Table>
            <TableHeader>
              <TableRow className="divide-x divide-border">
                <TableHead>날짜</TableHead>
                <TableHead>{isRealEstate ? '단가 (₩/개)' : asset.assetType === 'savings' ? '실지급액 (₩)' : '평가금액 (₩)'}</TableHead>
                <TableHead>메모</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {valuations.map((v) => (
                <TableRow key={v.id} className="divide-x divide-border">
                  <TableCell className="text-sm">{v.valuedAt}</TableCell>
                  <TableCell className="text-sm">{formatKrw(v.valueKrw)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{v.notes ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  )
}
