import { db } from '@/db'
import { savingsDetails } from '@/db/schema/savings-details'
import { transactions } from '@/db/schema/transactions'
import { inArray, eq, and } from 'drizzle-orm'
import type { SavingsBuy, SavingsDetails } from '@/lib/savings'

/**
 * 단일 자산의 savings_details 조회
 */
export async function getSavingsDetailsByAsset(assetId: string): Promise<SavingsDetails | null> {
  const [row] = await db
    .select()
    .from(savingsDetails)
    .where(eq(savingsDetails.assetId, assetId))
    .limit(1)
  if (!row) return null
  return {
    kind: row.kind as SavingsDetails['kind'],
    interestRateBp: row.interestRateBp,
    depositStartDate: row.depositStartDate,
    maturityDate: row.maturityDate,
    compoundType: (row.compoundType ?? 'simple') as SavingsDetails['compoundType'],
    taxType: (row.taxType ?? 'taxable') as SavingsDetails['taxType'],
    autoRenew: row.autoRenew,
    monthlyContributionKrw: row.monthlyContributionKrw ?? null,
  }
}

/**
 * 단일 자산의 savings_details (월납입액 포함 전체 컬럼) 조회 — overview 탭 표시용
 */
export async function getSavingsDetailsFull(assetId: string) {
  const [row] = await db
    .select()
    .from(savingsDetails)
    .where(eq(savingsDetails.assetId, assetId))
    .limit(1)
  return row ?? null
}

/**
 * 복수 savings 자산의 savings_details를 bulk 조회
 * @returns Map<assetId, SavingsDetails>
 */
export async function getSavingsDetails(
  assetIds: string[]
): Promise<Map<string, SavingsDetails>> {
  if (assetIds.length === 0) return new Map()

  const rows = await db
    .select()
    .from(savingsDetails)
    .where(inArray(savingsDetails.assetId, assetIds))

  const map = new Map<string, SavingsDetails>()
  for (const row of rows) {
    map.set(row.assetId, {
      kind: row.kind as SavingsDetails['kind'],
      interestRateBp: row.interestRateBp,
      depositStartDate: row.depositStartDate,
      maturityDate: row.maturityDate,
      compoundType: (row.compoundType ?? 'simple') as SavingsDetails['compoundType'],
      taxType: (row.taxType ?? 'taxable') as SavingsDetails['taxType'],
      autoRenew: row.autoRenew,
      monthlyContributionKrw: row.monthlyContributionKrw ?? null,
    })
  }
  return map
}

/**
 * 복수 savings 자산의 유효 buy 거래 내역을 bulk 조회 (voided 제외)
 * @returns Map<assetId, SavingsBuy[]>
 */
export async function getSavingsBuys(
  assetIds: string[]
): Promise<Map<string, SavingsBuy[]>> {
  if (assetIds.length === 0) return new Map()

  const rows = await db
    .select({
      assetId: transactions.assetId,
      transactionDate: transactions.transactionDate,
      pricePerUnit: transactions.pricePerUnit,
    })
    .from(transactions)
    .where(
      and(
        inArray(transactions.assetId, assetIds),
        eq(transactions.type, 'buy'),
        eq(transactions.isVoided, false)
      )
    )

  const map = new Map<string, SavingsBuy[]>()
  for (const row of rows) {
    const list = map.get(row.assetId) ?? []
    list.push({
      transactionDate: row.transactionDate,
      amountKrw: Number(row.pricePerUnit), // savings: quantity=1e8 고정, pricePerUnit=KRW 원금
    })
    map.set(row.assetId, list)
  }
  return map
}
