'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/db'
import { transactions } from '@/db/schema/transactions'
import { insuranceDetails } from '@/db/schema/insurance-details'
import { eq, and } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { upsertHoldings } from '@/lib/holdings'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

/**
 * 이번 달 보험료 납입 원클릭 기록
 * - insurance_details.premium_per_cycle_krw를 기본값으로 사용 (월납 전용)
 * - amountKrw를 명시적으로 넘기면 override
 */
export async function recordMonthlyPremium(
  assetId: string,
  amountKrwOverride?: number
): Promise<{ error: string } | void> {
  const user = await requireUser()

  const [details] = await db
    .select({
      premiumPerCycleKrw: insuranceDetails.premiumPerCycleKrw,
      paymentCycle: insuranceDetails.paymentCycle,
      isPaidUp: insuranceDetails.isPaidUp,
    })
    .from(insuranceDetails)
    .where(
      and(
        eq(insuranceDetails.assetId, assetId),
        eq(insuranceDetails.userId, user.id)
      )
    )
    .limit(1)

  if (!details) {
    return { error: '보험 메타 정보가 없습니다. 자산 편집에서 납입 정보를 먼저 입력해주세요.' }
  }
  if (details.isPaidUp) {
    return { error: '납입 완료된 보험입니다.' }
  }
  if (details.paymentCycle !== 'monthly') {
    return { error: `납입 주기가 '월납'이 아닙니다 (${details.paymentCycle}). 직접 거래내역을 추가해주세요.` }
  }

  const amountKrw = amountKrwOverride ?? details.premiumPerCycleKrw ?? null
  if (!amountKrw || amountKrw <= 0) {
    return { error: '월납입액이 설정되어 있지 않습니다. 자산 편집에서 월납입 보험료를 먼저 입력해주세요.' }
  }

  const today = new Date().toISOString().split('T')[0]
  const yyyyMM = today.slice(0, 7)

  await db.insert(transactions).values({
    assetId,
    userId: user.id,
    type: 'buy',
    quantity: 1e8,
    pricePerUnit: amountKrw,
    fee: 0,
    currency: 'KRW',
    exchangeRateAtTime: null,
    transactionDate: today,
    isVoided: false,
    notes: `${yyyyMM} 납입`,
  })

  await upsertHoldings(assetId, user.id)
  revalidatePath(`/assets/${assetId}`)
  revalidatePath('/assets')
  revalidatePath('/transactions')
}

const insuranceDetailsPatchSchema = z.object({
  category: z.enum(['protection', 'savings']).optional(),
  paymentCycle: z.enum(['monthly', 'quarterly', 'yearly', 'lump_sum']).optional(),
  premiumPerCycleKrw: z.string().optional().nullable(),
  contractDate: z.string().optional().nullable(),
  paymentStartDate: z.string().optional().nullable(),
  paymentEndDate: z.string().optional().nullable(),
  coverageEndDate: z.string().optional().nullable(),
  sumInsuredKrw: z.string().optional().nullable(),
  expectedReturnRatePct: z.string().optional().nullable(),
  isPaidUp: z.boolean().optional(),
})

/**
 * insurance_details 메타 수정 (overview 탭 편집 다이얼로그용)
 */
export async function updateInsuranceDetails(
  assetId: string,
  patch: z.infer<typeof insuranceDetailsPatchSchema>
): Promise<{ error: string } | void> {
  const user = await requireUser()
  const parsed = insuranceDetailsPatchSchema.safeParse(patch)
  if (!parsed.success) return { error: '입력 값을 확인해주세요.' }

  const {
    category, paymentCycle, premiumPerCycleKrw, contractDate,
    paymentStartDate, paymentEndDate, coverageEndDate,
    sumInsuredKrw, expectedReturnRatePct, isPaidUp,
  } = parsed.data

  const premiumKrw = premiumPerCycleKrw != null && !isNaN(parseFloat(premiumPerCycleKrw))
    ? Math.round(parseFloat(premiumPerCycleKrw))
    : premiumPerCycleKrw === null ? null : undefined
  const sumKrw = sumInsuredKrw != null && !isNaN(parseFloat(sumInsuredKrw))
    ? Math.round(parseFloat(sumInsuredKrw))
    : sumInsuredKrw === null ? null : undefined
  const rateBp = expectedReturnRatePct != null && !isNaN(parseFloat(expectedReturnRatePct))
    ? Math.round(parseFloat(expectedReturnRatePct) * 10000)
    : expectedReturnRatePct === null ? null : undefined

  const setValues: Record<string, unknown> = { updatedAt: new Date() }
  if (category !== undefined) setValues.category = category
  if (paymentCycle !== undefined) setValues.paymentCycle = paymentCycle
  if (premiumKrw !== undefined) setValues.premiumPerCycleKrw = premiumKrw
  if (contractDate !== undefined) setValues.contractDate = contractDate || null
  if (paymentStartDate !== undefined) setValues.paymentStartDate = paymentStartDate || null
  if (paymentEndDate !== undefined) setValues.paymentEndDate = paymentEndDate || null
  if (coverageEndDate !== undefined) setValues.coverageEndDate = coverageEndDate || null
  if (sumKrw !== undefined) setValues.sumInsuredKrw = sumKrw
  if (rateBp !== undefined) setValues.expectedReturnRateBp = rateBp
  if (isPaidUp !== undefined) setValues.isPaidUp = isPaidUp

  await db
    .update(insuranceDetails)
    .set(setValues)
    .where(
      and(
        eq(insuranceDetails.assetId, assetId),
        eq(insuranceDetails.userId, user.id)
      )
    )

  revalidatePath(`/assets/${assetId}`)
}
