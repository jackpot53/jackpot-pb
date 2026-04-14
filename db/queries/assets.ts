import { db } from '@/db'
import { assets } from '@/db/schema/assets'
import { eq, and } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

export type Asset = InferSelectModel<typeof assets>

export async function getAssets(userId: string): Promise<Asset[]> {
  return db.select().from(assets).where(eq(assets.userId, userId)).orderBy(assets.createdAt)
}

export async function getAssetById(id: string, userId: string): Promise<Asset | undefined> {
  const rows = await db.select().from(assets).where(and(eq(assets.id, id), eq(assets.userId, userId))).limit(1)
  return rows[0]
}
