import { db } from '@/db'
import { assets } from '@/db/schema/assets'
import { eq } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

export type Asset = InferSelectModel<typeof assets>

export async function getAssets(): Promise<Asset[]> {
  return db.select().from(assets).orderBy(assets.createdAt)
}

export async function getAssetById(id: string): Promise<Asset | undefined> {
  const rows = await db.select().from(assets).where(eq(assets.id, id)).limit(1)
  return rows[0]
}
