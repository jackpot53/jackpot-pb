'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db'
import { transactions } from '@/db/schema/transactions'
import { assets } from '@/db/schema/assets'
import { eq } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'
import { upsertHoldings } from '@/lib/holdings'

// ---- Auth helper ----
async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

// ---- Encoding helpers ----
function encodeQuantity(input: string): number {
  return Math.round(parseFloat(input) * 1e8)
}
function encodeExchangeRate(rate: string): number {
  return Math.round(parseFloat(rate) * 10000)
}

// ---- Zod form schema ----
// All numeric fields arrive as strings from the form
const transactionFormSchema = z.object({
  type: z.enum(['buy', 'sell']),
  transactionDate: z.string().min(1, '날짜를 입력해주세요.'),
  quantity: z.string().min(1, '수량을 입력해주세요.').refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
    '유효한 수량을 입력해주세요.'
  ),
  pricePerUnit: z.string().min(1, '단가를 입력해주세요.').refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0,
    '유효한 단가를 입력해주세요.'
  ),
  fee: z.string().optional().default('0'),
  exchangeRate: z.string().optional(), // only for USD assets
  notes: z.string().max(1000).optional().nullable(),
})

export type TransactionFormValues = z.infer<typeof transactionFormSchema>
export type TransactionActionError = { error: string; fieldErrors?: Record<string, string[]> }

// ---- Server Actions ----

export async function createTransaction(
  assetId: string,
  data: TransactionFormValues
): Promise<TransactionActionError | void> {
  await requireUser()
  const parsed = transactionFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: '입력 값을 확인해주세요.', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }
  const d = parsed.data

  // Look up asset currency to determine price encoding
  const assetRows = await db.select({ currency: assets.currency }).from(assets).where(eq(assets.id, assetId)).limit(1)
  if (!assetRows[0]) return { error: '자산을 찾을 수 없습니다.' }
  const currency = assetRows[0].currency

  const quantityEncoded = encodeQuantity(d.quantity)
  let pricePerUnitKrw: number
  let exchangeRateEncoded: number | null = null

  if (currency === 'USD') {
    if (!d.exchangeRate || isNaN(parseFloat(d.exchangeRate)) || parseFloat(d.exchangeRate) <= 0) {
      return { error: '환율을 입력해주세요.' }
    }
    const rate = parseFloat(d.exchangeRate)
    const usdPrice = parseFloat(d.pricePerUnit)
    pricePerUnitKrw = Math.round(usdPrice * rate)
    exchangeRateEncoded = encodeExchangeRate(d.exchangeRate)
  } else {
    pricePerUnitKrw = Math.round(parseFloat(d.pricePerUnit))
  }

  const feeKrw = d.fee ? Math.round(parseFloat(d.fee)) : 0

  await db.insert(transactions).values({
    assetId,
    type: d.type,
    quantity: quantityEncoded,
    pricePerUnit: pricePerUnitKrw,
    fee: feeKrw,
    currency,
    exchangeRateAtTime: exchangeRateEncoded,
    transactionDate: d.transactionDate,
    isVoided: false,
    notes: d.notes ?? null,
  })

  await upsertHoldings(assetId)
  revalidatePath(`/assets/${assetId}`)
}

export async function voidTransaction(
  transactionId: string,
  assetId: string
): Promise<TransactionActionError | void> {
  await requireUser()
  if (!transactionId) return { error: '거래 ID가 없습니다.' }
  // D-08: void = is_voided=true, never DELETE
  await db.update(transactions).set({ isVoided: true }).where(eq(transactions.id, transactionId))
  await upsertHoldings(assetId)
  revalidatePath(`/assets/${assetId}`)
}

export async function updateTransaction(
  transactionId: string,
  assetId: string,
  data: TransactionFormValues
): Promise<TransactionActionError | void> {
  await requireUser()
  const parsed = transactionFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: '입력 값을 확인해주세요.', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }
  const d = parsed.data

  const assetRows = await db.select({ currency: assets.currency }).from(assets).where(eq(assets.id, assetId)).limit(1)
  if (!assetRows[0]) return { error: '자산을 찾을 수 없습니다.' }
  const currency = assetRows[0].currency

  const quantityEncoded = encodeQuantity(d.quantity)
  let pricePerUnitKrw: number
  let exchangeRateEncoded: number | null = null

  if (currency === 'USD') {
    if (!d.exchangeRate || isNaN(parseFloat(d.exchangeRate)) || parseFloat(d.exchangeRate) <= 0) {
      return { error: '환율을 입력해주세요.' }
    }
    const rate = parseFloat(d.exchangeRate)
    pricePerUnitKrw = Math.round(parseFloat(d.pricePerUnit) * rate)
    exchangeRateEncoded = encodeExchangeRate(d.exchangeRate)
  } else {
    pricePerUnitKrw = Math.round(parseFloat(d.pricePerUnit))
  }

  const feeKrw = d.fee ? Math.round(parseFloat(d.fee)) : 0

  await db.update(transactions).set({
    type: d.type,
    quantity: quantityEncoded,
    pricePerUnit: pricePerUnitKrw,
    fee: feeKrw,
    exchangeRateAtTime: exchangeRateEncoded,
    transactionDate: d.transactionDate,
    notes: d.notes ?? null,
  }).where(eq(transactions.id, transactionId))

  await upsertHoldings(assetId)
  revalidatePath(`/assets/${assetId}`)
}
