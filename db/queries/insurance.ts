import { db } from '@/db'
import { insuranceDetails } from '@/db/schema/insurance-details'
import { transactions } from '@/db/schema/transactions'
import { inArray, eq, and } from 'drizzle-orm'
import type { InsuranceDetailsRow } from '@/db/schema/insurance-details'
import type { InsuranceBuy } from '@/lib/insurance'

export type { InsuranceDetailsRow }

/**
 * 단일 자산의 insurance_details (전체 컬럼) 조회 — overview 탭 표시용
 */
export async function getInsuranceDetailsFull(assetId: string): Promise<InsuranceDetailsRow | null> {
  const [row] = await db
    .select()
    .from(insuranceDetails)
    .where(eq(insuranceDetails.assetId, assetId))
    .limit(1)
  return row ?? null
}

/**
 * 복수 보험 자산의 insurance_details를 bulk 조회
 * @returns Map<assetId, InsuranceDetailsRow>
 */
export async function getInsuranceDetails(
  assetIds: string[]
): Promise<Map<string, InsuranceDetailsRow>> {
  if (assetIds.length === 0) return new Map()

  const rows = await db
    .select()
    .from(insuranceDetails)
    .where(inArray(insuranceDetails.assetId, assetIds))

  const map = new Map<string, InsuranceDetailsRow>()
  for (const row of rows) {
    map.set(row.assetId, row)
  }
  return map
}

/**
 * 복수 보험 자산의 거래 내역을 bulk 조회 (buy 거래만)
 * @returns Map<assetId, InsuranceBuy[]>
 */
export async function getInsuranceBuys(
  assetIds: string[]
): Promise<Map<string, InsuranceBuy[]>> {
  if (assetIds.length === 0) return new Map()

  const rows = await db
    .select({
      assetId: transactions.assetId,
      transactionDate: transactions.transactionDate,
      amountKrw: transactions.pricePerUnit,
    })
    .from(transactions)
    .where(
      and(
        inArray(transactions.assetId, assetIds),
        eq(transactions.type, 'buy'),
        eq(transactions.isVoided, false)
      )
    )
    .orderBy(transactions.transactionDate)

  const map = new Map<string, InsuranceBuy[]>()
  for (const row of rows) {
    const key = row.assetId
    if (!map.has(key)) {
      map.set(key, [])
    }
    map.get(key)!.push({
      transactionDate: row.transactionDate.toISOString().split('T')[0],
      amountKrw: row.amountKrw,
    })
  }
  return map
}
