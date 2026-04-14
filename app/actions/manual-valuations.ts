'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/db'
import { manualValuations } from '@/db/schema/manual-valuations'
import { createClient } from '@/utils/supabase/server'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

const valuationFormSchema = z.object({
  // valueKrw arrives as a string from the form
  valueKrw: z.string()
    .min(1, '현재 가치를 입력해주세요.')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, '유효한 금액을 입력해주세요.'),
  currency: z.enum(['KRW', 'USD']),
  exchangeRate: z.string().optional(), // only for USD assets
  valuedAt: z.string().min(1, '날짜를 입력해주세요.'),
  notes: z.string().max(1000).optional().nullable(),
})

export type ValuationFormValues = z.infer<typeof valuationFormSchema>
export type ValuationActionError = { error: string }

export async function createManualValuation(
  assetId: string,
  data: ValuationFormValues
): Promise<ValuationActionError | void> {
  await requireUser()
  const parsed = valuationFormSchema.safeParse(data)
  if (!parsed.success) return { error: '입력 값을 확인해주세요.' }
  const d = parsed.data

  let valueKrwInt: number
  let exchangeRateEncoded: number | null = null

  if (d.currency === 'USD') {
    if (!d.exchangeRate || isNaN(parseFloat(d.exchangeRate)) || parseFloat(d.exchangeRate) <= 0) {
      return { error: '환율을 입력해주세요.' }
    }
    const rate = parseFloat(d.exchangeRate)
    valueKrwInt = Math.round(parseFloat(d.valueKrw) * rate)
    exchangeRateEncoded = Math.round(rate * 10000)
  } else {
    valueKrwInt = Math.round(parseFloat(d.valueKrw))
  }

  // D-06 / D-09: INSERT ONLY — never update or delete ManualValuation rows
  await db.insert(manualValuations).values({
    assetId,
    valueKrw: valueKrwInt,
    currency: d.currency,
    exchangeRateAtTime: exchangeRateEncoded,
    valuedAt: d.valuedAt,
    notes: d.notes ?? null,
  })

  revalidatePath(`/assets/${assetId}`)
}
