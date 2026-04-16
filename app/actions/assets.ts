'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/db'
import { assets } from '@/db/schema/assets'
import { transactions } from '@/db/schema/transactions'
import { holdings } from '@/db/schema/holdings'
import { manualValuations } from '@/db/schema/manual-valuations'
import { savingsDetails } from '@/db/schema/savings-details'
import { eq, sql, and } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { upsertHoldings } from '@/lib/holdings'

const TRADEABLE_TYPES = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'real_estate'] as const

const assetSchema = z.object({
  name: z.string().min(1, '종목명을 입력해주세요.').max(255),
  assetType: z.enum(['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'savings', 'real_estate', 'insurance', 'precious_metal', 'cma']),
  priceType: z.enum(['live', 'manual']),
  currency: z.enum(['KRW', 'USD']),
  accountType: z.enum(['isa', 'irp', 'pension', 'dc', 'brokerage', 'spot', 'cma', 'insurance', 'upbit', 'bithumb', 'coinone', 'korbit', 'binance', 'coinbase', 'kraken', 'okx', 'fund_mirae', 'fund_samsung', 'fund_kb', 'fund_shinhan', 'fund_hanwha', 'fund_nh', 'fund_korea', 'fund_kiwoom', 'fund_hana', 'fund_woori', 'fund_ibk', 'fund_daishin', 'fund_timefolio', 'fund_truston', 'bank_kb', 'bank_shinhan', 'bank_woori', 'bank_hana', 'bank_nh', 'bank_kakao', 'bank_toss', 'bank_k', 'bank_ibk', 'bank_kdb', 'bank_busan', 'bank_daegu', 'bank_gwangju', 'bank_jeonbuk', 'bank_jeju', 'ins_samsung_life', 'ins_hanwha_life', 'ins_kyobo', 'ins_shinhan_life', 'ins_nh_life', 'ins_kb_life', 'ins_aia', 'ins_metlife', 'ins_prudential', 'ins_samsung_fire', 'ins_hyundai', 'ins_db_fire', 'ins_kb_fire', 'ins_meritz', 'ins_hanwha_fire', 'ins_lotte_fire']).optional().nullable(),
  brokerageId: z.string().max(50).optional().nullable(),
  withdrawalBankId: z.string().max(50).optional().nullable(),
  owner: z.string().max(20).optional().nullable(),
  ticker: z.string().max(20).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  // Initial transaction fields (new asset only, optional)
  initialQuantity: z.string().optional().nullable(),
  initialPricePerUnit: z.string().optional().nullable(),
  initialTransactionDate: z.string().optional().nullable(),
  initialExchangeRate: z.string().optional().nullable(),
  // Insurance-specific fields
  initialSurrenderValue: z.string().optional().nullable(),
  // Savings-specific fields
  savingsKind: z.enum(['term', 'recurring', 'free']).optional().nullable(),
  interestRatePct: z.string().optional().nullable(),  // e.g. "5.25"
  depositStartDate: z.string().optional().nullable(),  // 'YYYY-MM-DD'
  maturityDate: z.string().optional().nullable(),      // 'YYYY-MM-DD'
  monthlyContributionKrw: z.string().optional().nullable(),
  compoundType: z.enum(['simple', 'monthly']).optional().nullable(),
  taxType: z.enum(['taxable', 'tax_free', 'preferential']).optional().nullable(),
  autoRenew: z.boolean().optional().nullable(),
})

export type AssetFormValues = z.infer<typeof assetSchema>
export type AssetActionError = { error: string }

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

export async function createAsset(data: AssetFormValues): Promise<AssetActionError | void> {
  const user = await requireUser()
  const parsed = assetSchema.safeParse(data)
  if (!parsed.success) return { error: '입력 값을 확인해주세요.' }
  const {
    ticker, notes, brokerageId, withdrawalBankId, owner,
    initialQuantity, initialPricePerUnit, initialTransactionDate, initialExchangeRate,
    initialSurrenderValue,
    savingsKind, interestRatePct, depositStartDate, maturityDate,
    monthlyContributionKrw, compoundType, taxType, autoRenew,
    ...rest
  } = parsed.data

  const [newAsset] = await db.insert(assets).values({
    ...rest,
    userId: user.id,
    ticker: ticker ?? null,
    accountType: rest.accountType ?? null,
    brokerageId: brokerageId ?? null,
    withdrawalBankId: withdrawalBankId ?? null,
    owner: owner ?? null,
    notes: notes ?? null,
  }).returning({ id: assets.id })

  const txDate = initialTransactionDate || new Date().toISOString().split('T')[0]

  // Savings: 초기 원금/납입액 → buy tx (qty=1e8), 예적금 메타 → savings_details
  if (rest.assetType === 'savings') {
    if (initialPricePerUnit && !isNaN(parseFloat(initialPricePerUnit)) && parseFloat(initialPricePerUnit) > 0) {
      const principalKrw = Math.round(parseFloat(initialPricePerUnit))
      const txNotes = savingsKind === 'term' ? '초기예치' : '1차 납입'
      // 가입일을 buy tx 날짜로 사용 (이자 기산점이 가입일이므로)
      const savingsTxDate = depositStartDate ?? txDate
      await db.insert(transactions).values({
        assetId: newAsset.id,
        userId: user.id,
        type: 'buy',
        quantity: 1e8,
        pricePerUnit: principalKrw,
        fee: 0,
        currency: 'KRW',
        exchangeRateAtTime: null,
        transactionDate: savingsTxDate,
        isVoided: false,
        notes: txNotes,
      })
      await upsertHoldings(newAsset.id, user.id)
    }
    // savings_details 저장 (메타 필드 중 하나라도 있으면 생성)
    if (savingsKind) {
      const rateBp = interestRatePct && !isNaN(parseFloat(interestRatePct))
        ? Math.round(parseFloat(interestRatePct) * 10000)
        : null
      const monthlyKrw = monthlyContributionKrw && !isNaN(parseFloat(monthlyContributionKrw))
        ? Math.round(parseFloat(monthlyContributionKrw))
        : null
      await db.insert(savingsDetails).values({
        assetId: newAsset.id,
        userId: user.id,
        kind: savingsKind,
        interestRateBp: rateBp,
        depositStartDate: depositStartDate ?? null,
        maturityDate: maturityDate ?? null,
        monthlyContributionKrw: monthlyKrw,
        compoundType: compoundType ?? 'simple',
        taxType: taxType ?? 'taxable',
        autoRenew: autoRenew ?? false,
      })
    }
    revalidatePath('/assets')
    redirect('/assets')
  }

  // Insurance: 총납입보험료 → buy tx (qty=1), 해지환급금 → manual valuation
  if (rest.assetType === 'insurance') {
    if (initialPricePerUnit && !isNaN(parseFloat(initialPricePerUnit)) && parseFloat(initialPricePerUnit) > 0) {
      const premiumKrw = Math.round(parseFloat(initialPricePerUnit))
      await db.insert(transactions).values({
        assetId: newAsset.id,
        userId: user.id,
        type: 'buy',
        quantity: 1e8, // 1 unit encoded
        pricePerUnit: premiumKrw,
        fee: 0,
        currency: 'KRW',
        exchangeRateAtTime: null,
        transactionDate: txDate,
        isVoided: false,
        notes: '총납입보험료',
      })
      await upsertHoldings(newAsset.id, user.id)
    }
    if (initialSurrenderValue && !isNaN(parseFloat(initialSurrenderValue)) && parseFloat(initialSurrenderValue) >= 0) {
      await db.insert(manualValuations).values({
        assetId: newAsset.id,
        userId: user.id,
        valueKrw: Math.round(parseFloat(initialSurrenderValue)),
        currency: 'KRW',
        exchangeRateAtTime: null,
        valuedAt: txDate,
        notes: '해지환급금',
      })
    }
    revalidatePath('/assets')
    redirect('/assets')
  }

  // Create initial buy transaction if quantity and price are provided
  const isTradeable = (TRADEABLE_TYPES as readonly string[]).includes(rest.assetType)
  if (
    isTradeable &&
    initialQuantity && initialPricePerUnit &&
    !isNaN(parseFloat(initialQuantity)) && parseFloat(initialQuantity) > 0 &&
    !isNaN(parseFloat(initialPricePerUnit)) && parseFloat(initialPricePerUnit) >= 0
  ) {
    const quantityEncoded = Math.round(parseFloat(initialQuantity) * 1e8)

    let pricePerUnitKrw: number
    let exchangeRateEncoded: number | null = null

    const isUsAsset = rest.assetType === 'stock_us' || rest.assetType === 'etf_us'
    if (rest.currency === 'USD') {
      if (!initialExchangeRate || isNaN(parseFloat(initialExchangeRate)) || parseFloat(initialExchangeRate) <= 0) {
        return { error: 'USD 자산의 초기 매수에는 환율이 필요합니다.' }
      }
      pricePerUnitKrw = Math.round(parseFloat(initialPricePerUnit) * parseFloat(initialExchangeRate))
      exchangeRateEncoded = Math.round(parseFloat(initialExchangeRate) * 10000)
    } else {
      pricePerUnitKrw = Math.round(parseFloat(initialPricePerUnit))
      // 원화매수 US 자산: 환율 제공 시 저장 (FX 분해 계산에 필요)
      if (isUsAsset && initialExchangeRate && !isNaN(parseFloat(initialExchangeRate)) && parseFloat(initialExchangeRate) > 0) {
        exchangeRateEncoded = Math.round(parseFloat(initialExchangeRate) * 10000)
      }
    }

    await db.insert(transactions).values({
      assetId: newAsset.id,
      userId: user.id,
      type: 'buy',
      quantity: quantityEncoded,
      pricePerUnit: pricePerUnitKrw,
      fee: 0,
      currency: rest.currency,
      exchangeRateAtTime: exchangeRateEncoded,
      transactionDate: txDate,
      isVoided: false,
      notes: null,
    })
    await upsertHoldings(newAsset.id, user.id)
  }

  revalidatePath('/assets')
  redirect('/assets')
}

export async function updateAsset(
  id: string,
  data: AssetFormValues
): Promise<AssetActionError | void> {
  const user = await requireUser()
  const parsed = assetSchema.safeParse(data)
  if (!parsed.success) return { error: '입력 값을 확인해주세요.' }

  // WR-02: prevent changing currency when existing transactions would have wrong encoding
  const existingAsset = await db.select({ currency: assets.currency }).from(assets).where(and(eq(assets.id, id), eq(assets.userId, user.id))).limit(1)
  if (existingAsset[0] && existingAsset[0].currency !== parsed.data.currency) {
    const txCountRows = await db.select({ count: sql<number>`count(*)` }).from(transactions).where(eq(transactions.assetId, id))
    const txCount = Number(txCountRows[0]?.count ?? 0)
    if (txCount > 0) {
      return { error: '거래 내역이 있는 자산의 통화는 변경할 수 없습니다.' }
    }
  }

  const {
    ticker, notes, brokerageId, withdrawalBankId, owner,
    initialQuantity, initialPricePerUnit, initialTransactionDate, initialExchangeRate,
    initialSurrenderValue: _surrender,
    savingsKind, interestRatePct, depositStartDate, maturityDate,
    monthlyContributionKrw, compoundType, taxType, autoRenew,
    ...rest
  } = parsed.data

  await db.update(assets).set({
    ...rest,
    ticker: ticker ?? null,
    accountType: rest.accountType ?? null,
    brokerageId: brokerageId ?? null,
    withdrawalBankId: withdrawalBankId ?? null,
    owner: owner ?? null,
    notes: notes ?? null,
  }).where(and(eq(assets.id, id), eq(assets.userId, user.id)))

  // Optionally add a new buy transaction if quantity and price are provided
  const isTradeable = (TRADEABLE_TYPES as readonly string[]).includes(rest.assetType)
  if (
    isTradeable &&
    initialQuantity && initialPricePerUnit &&
    !isNaN(parseFloat(initialQuantity)) && parseFloat(initialQuantity) > 0 &&
    !isNaN(parseFloat(initialPricePerUnit)) && parseFloat(initialPricePerUnit) >= 0
  ) {
    const quantityEncoded = Math.round(parseFloat(initialQuantity) * 1e8)
    const txDate = initialTransactionDate || new Date().toISOString().split('T')[0]

    let pricePerUnitKrw: number
    let exchangeRateEncoded: number | null = null

    const isUsAsset = rest.assetType === 'stock_us' || rest.assetType === 'etf_us'
    if (rest.currency === 'USD') {
      if (!initialExchangeRate || isNaN(parseFloat(initialExchangeRate)) || parseFloat(initialExchangeRate) <= 0) {
        return { error: 'USD 자산의 매수 추가에는 환율이 필요합니다.' }
      }
      pricePerUnitKrw = Math.round(parseFloat(initialPricePerUnit) * parseFloat(initialExchangeRate))
      exchangeRateEncoded = Math.round(parseFloat(initialExchangeRate) * 10000)
    } else {
      pricePerUnitKrw = Math.round(parseFloat(initialPricePerUnit))
      // 원화매수 US 자산: 환율 제공 시 저장 (FX 분해 계산에 필요)
      if (isUsAsset && initialExchangeRate && !isNaN(parseFloat(initialExchangeRate)) && parseFloat(initialExchangeRate) > 0) {
        exchangeRateEncoded = Math.round(parseFloat(initialExchangeRate) * 10000)
      }
    }

    await db.insert(transactions).values({
      assetId: id,
      userId: user.id,
      type: 'buy',
      quantity: quantityEncoded,
      pricePerUnit: pricePerUnitKrw,
      fee: 0,
      currency: rest.currency,
      exchangeRateAtTime: exchangeRateEncoded,
      transactionDate: txDate,
      isVoided: false,
      notes: null,
    })
    await upsertHoldings(id, user.id)
  }

  // savings_details upsert (메타 필드가 전달된 경우)
  if (rest.assetType === 'savings' && savingsKind) {
    const rateBp = interestRatePct && !isNaN(parseFloat(interestRatePct))
      ? Math.round(parseFloat(interestRatePct) * 10000)
      : null
    const monthlyKrw = monthlyContributionKrw && !isNaN(parseFloat(monthlyContributionKrw))
      ? Math.round(parseFloat(monthlyContributionKrw))
      : null
    await db.insert(savingsDetails).values({
      assetId: id,
      userId: user.id,
      kind: savingsKind,
      interestRateBp: rateBp,
      depositStartDate: depositStartDate ?? null,
      maturityDate: maturityDate ?? null,
      monthlyContributionKrw: monthlyKrw,
      compoundType: compoundType ?? 'simple',
      taxType: taxType ?? 'taxable',
      autoRenew: autoRenew ?? false,
    }).onConflictDoUpdate({
      target: savingsDetails.assetId,
      set: {
        kind: savingsKind,
        interestRateBp: rateBp,
        depositStartDate: depositStartDate ?? null,
        maturityDate: maturityDate ?? null,
        monthlyContributionKrw: monthlyKrw,
        compoundType: compoundType ?? 'simple',
        taxType: taxType ?? 'taxable',
        autoRenew: autoRenew ?? false,
        updatedAt: new Date(),
      },
    })
  }

  revalidatePath('/assets')
  revalidatePath(`/assets/${id}`)
}

export async function deleteAsset(id: string): Promise<AssetActionError | void> {
  const user = await requireUser()
  if (!id) return { error: '자산 ID가 없습니다.' }
  // Pre-delete child rows inside a transaction to prevent partial deletes on failure
  await db.transaction(async (tx) => {
    await tx.delete(transactions).where(eq(transactions.assetId, id))
    await tx.delete(manualValuations).where(eq(manualValuations.assetId, id))
    await tx.delete(holdings).where(eq(holdings.assetId, id))
    await tx.delete(assets).where(and(eq(assets.id, id), eq(assets.userId, user.id)))
  })
  revalidatePath('/assets')
  redirect('/assets')
}
