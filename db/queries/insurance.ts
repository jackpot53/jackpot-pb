import { db } from '@/db'
import { insuranceDetails } from '@/db/schema/insurance-details'
import { inArray, eq } from 'drizzle-orm'
import type { InsuranceDetailsRow } from '@/db/schema/insurance-details'

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
