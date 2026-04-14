import { db } from '@/db'
import { manualValuations } from '@/db/schema/manual-valuations'
import { eq, desc, and } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

export type ManualValuation = InferSelectModel<typeof manualValuations>

export async function getValuationsByAsset(assetId: string, userId: string): Promise<ManualValuation[]> {
  return db
    .select()
    .from(manualValuations)
    .where(and(eq(manualValuations.assetId, assetId), eq(manualValuations.userId, userId)))
    .orderBy(desc(manualValuations.valuedAt), desc(manualValuations.createdAt))
}
