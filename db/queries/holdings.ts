import { db } from '@/db'
import { holdings } from '@/db/schema/holdings'
import { eq } from 'drizzle-orm'

export type HoldingRow = typeof holdings.$inferSelect

export async function getHoldingByAssetId(assetId: string): Promise<HoldingRow | null> {
  const rows = await db.select().from(holdings).where(eq(holdings.assetId, assetId)).limit(1)
  return rows[0] ?? null
}
