import { db } from '@/db'
import { manualValuations } from '@/db/schema/manual-valuations'
import { eq, desc, asc, and } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

export type ManualValuation = InferSelectModel<typeof manualValuations>

export async function getValuationsByAsset(assetId: string, userId: string): Promise<ManualValuation[]> {
  return db
    .select()
    .from(manualValuations)
    .where(and(eq(manualValuations.assetId, assetId), eq(manualValuations.userId, userId)))
    .orderBy(desc(manualValuations.valuedAt), desc(manualValuations.createdAt))
}

/** 펀드 자산의 NAV per unit 이력 (날짜 오름차순) — 차트용 */
export async function getFundManualNavHistory(assetId: string, userId: string): Promise<{ date: string; navKrw: number }[]> {
  const rows = await db
    .select({ valuedAt: manualValuations.valuedAt, valueKrw: manualValuations.valueKrw })
    .from(manualValuations)
    .where(and(eq(manualValuations.assetId, assetId), eq(manualValuations.userId, userId)))
    .orderBy(asc(manualValuations.valuedAt))
  return rows.map(r => ({ date: r.valuedAt, navKrw: r.valueKrw }))
}
