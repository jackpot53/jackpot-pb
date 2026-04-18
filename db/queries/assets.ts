import { cache } from 'react'
import { db } from '@/db'
import { assets } from '@/db/schema/assets'
import { savingsDetails } from '@/db/schema/savings-details'
import { insuranceDetails } from '@/db/schema/insurance-details'
import { eq, and } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

export type Asset = InferSelectModel<typeof assets> & {
  savingsCompoundType: string | null
  insuranceCompoundType: string | null
}

export const getAssets = cache(async (userId: string): Promise<Asset[]> => {
  const rows = await db
    .select({
      id: assets.id,
      userId: assets.userId,
      name: assets.name,
      ticker: assets.ticker,
      assetType: assets.assetType,
      priceType: assets.priceType,
      currency: assets.currency,
      accountType: assets.accountType,
      brokerageId: assets.brokerageId,
      withdrawalBankId: assets.withdrawalBankId,
      owner: assets.owner,
      notes: assets.notes,
      insuranceType: assets.insuranceType,
      createdAt: assets.createdAt,
      savingsCompoundType: savingsDetails.compoundType,
      insuranceCompoundType: insuranceDetails.compoundType,
    })
    .from(assets)
    .leftJoin(savingsDetails, eq(assets.id, savingsDetails.assetId))
    .leftJoin(insuranceDetails, eq(assets.id, insuranceDetails.assetId))
    .where(eq(assets.userId, userId))
    .orderBy(assets.createdAt)
  return rows as Asset[]
})

export async function getAssetById(id: string, userId: string): Promise<Asset | undefined> {
  const rows = await db
    .select({
      id: assets.id,
      userId: assets.userId,
      name: assets.name,
      ticker: assets.ticker,
      assetType: assets.assetType,
      priceType: assets.priceType,
      currency: assets.currency,
      accountType: assets.accountType,
      brokerageId: assets.brokerageId,
      withdrawalBankId: assets.withdrawalBankId,
      owner: assets.owner,
      notes: assets.notes,
      insuranceType: assets.insuranceType,
      createdAt: assets.createdAt,
      savingsCompoundType: savingsDetails.compoundType,
      insuranceCompoundType: insuranceDetails.compoundType,
    })
    .from(assets)
    .leftJoin(savingsDetails, eq(assets.id, savingsDetails.assetId))
    .leftJoin(insuranceDetails, eq(assets.id, insuranceDetails.assetId))
    .where(and(eq(assets.id, id), eq(assets.userId, userId)))
    .limit(1)
  return rows[0] as Asset | undefined
}
