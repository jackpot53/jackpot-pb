import { db } from '@/db'
import { holdings } from '@/db/schema/holdings'
import { assets } from '@/db/schema/assets'
import { eq, and } from 'drizzle-orm'

export type HoldingRow = typeof holdings.$inferSelect

export async function getHoldingByAssetId(assetId: string): Promise<HoldingRow | null> {
  const rows = await db.select().from(holdings).where(eq(holdings.assetId, assetId)).limit(1)
  return rows[0] ?? null
}

export async function getHoldingQuantitiesByUserId(userId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({ assetId: holdings.assetId, totalQuantity: holdings.totalQuantity })
    .from(holdings)
    .innerJoin(assets, and(eq(holdings.assetId, assets.id), eq(assets.userId, userId)))
  const map = new Map<string, number>()
  for (const row of rows) map.set(row.assetId, Number(row.totalQuantity))
  return map
}
