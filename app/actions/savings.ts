'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/db'
import { transactions } from '@/db/schema/transactions'
import { savingsDetails } from '@/db/schema/savings-details'
import { eq, and, desc } from 'drizzle-orm'
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
 * 이번 달 납입 원클릭 기록
 * - savings_details.monthly_contribution_krw를 기본값으로 사용
 * - amountKrw를 명시적으로 넘기면 override (납입액 변경 시)
 */
export async function recordMonthlyContribution(
  assetId: string,
  amountKrwOverride?: number
): Promise<{ error: string } | void> {
  const user = await requireUser()

  // savings_details에서 계획 월납입액 조회
  const [details] = await db
    .select({ monthlyContributionKrw: savingsDetails.monthlyContributionKrw })
    .from(savingsDetails)
    .where(
      and(
        eq(savingsDetails.assetId, assetId),
        eq(savingsDetails.userId, user.id)
      )
    )
    .limit(1)

  const amountKrw = amountKrwOverride ?? details?.monthlyContributionKrw ?? null
  if (!amountKrw || amountKrw <= 0) {
    return { error: '납입액이 설정되어 있지 않습니다. 자산 메타에서 월납입액을 먼저 입력해주세요.' }
  }

  const today = new Date().toISOString().split('T')[0]
  const yyyyMM = today.slice(0, 7)  // 'YYYY-MM'

  await db.insert(transactions).values({
    assetId,
    userId: user.id,
    type: 'buy',
    quantity: 1e8,        // savings: quantity 단위 1 (1e8 인코딩)
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
}

const savingsDetailsPatchSchema = z.object({
  kind: z.enum(['term', 'recurring', 'free']).optional(),
  interestRatePct: z.string().optional().nullable(),
  depositStartDate: z.string().optional().nullable(),
  maturityDate: z.string().optional().nullable(),
  monthlyContributionKrw: z.string().optional().nullable(),
  compoundType: z.enum(['simple', 'monthly']).optional(),
  taxType: z.enum(['taxable', 'tax_free', 'preferential']).optional(),
  autoRenew: z.boolean().optional(),
})

/**
 * savings_details 메타 수정 (overview 탭 편집 다이얼로그용)
 */
export async function updateSavingsDetails(
  assetId: string,
  patch: z.infer<typeof savingsDetailsPatchSchema>
): Promise<{ error: string } | void> {
  const user = await requireUser()
  const parsed = savingsDetailsPatchSchema.safeParse(patch)
  if (!parsed.success) return { error: '입력 값을 확인해주세요.' }

  const { kind, interestRatePct, depositStartDate, maturityDate, monthlyContributionKrw, compoundType, taxType, autoRenew } = parsed.data

  const rateBp = interestRatePct != null && !isNaN(parseFloat(interestRatePct))
    ? Math.round(parseFloat(interestRatePct) * 10000)
    : undefined
  const monthlyKrw = monthlyContributionKrw != null && !isNaN(parseFloat(monthlyContributionKrw))
    ? Math.round(parseFloat(monthlyContributionKrw))
    : monthlyContributionKrw === null ? null : undefined

  const setValues: Record<string, unknown> = { updatedAt: new Date() }
  if (kind !== undefined) setValues.kind = kind
  if (rateBp !== undefined) setValues.interestRateBp = rateBp
  if (depositStartDate !== undefined) setValues.depositStartDate = depositStartDate
  if (maturityDate !== undefined) setValues.maturityDate = maturityDate
  if (monthlyKrw !== undefined) setValues.monthlyContributionKrw = monthlyKrw
  if (compoundType !== undefined) setValues.compoundType = compoundType
  if (taxType !== undefined) setValues.taxType = taxType
  if (autoRenew !== undefined) setValues.autoRenew = autoRenew

  await db
    .update(savingsDetails)
    .set(setValues)
    .where(
      and(
        eq(savingsDetails.assetId, assetId),
        eq(savingsDetails.userId, user.id)
      )
    )

  revalidatePath(`/assets/${assetId}`)
}
