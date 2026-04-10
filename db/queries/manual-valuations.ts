import { db } from '@/db'
import { manualValuations } from '@/db/schema/manual-valuations'
import { eq, desc } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

export type ManualValuation = InferSelectModel<typeof manualValuations>

export async function getValuationsByAsset(assetId: string): Promise<ManualValuation[]> {
  return db
    .select()
    .from(manualValuations)
    .where(eq(manualValuations.assetId, assetId))
    .orderBy(desc(manualValuations.valuedAt), desc(manualValuations.createdAt))
}
