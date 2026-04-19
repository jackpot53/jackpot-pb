import { cache } from 'react'
import { db } from '@/db'
import { assets } from '@/db/schema/assets'
import { holdings } from '@/db/schema/holdings'
import { eq, sql } from 'drizzle-orm'
import type { AssetType, Currency } from '@/lib/types/asset'

export interface AssetWithHolding {
  assetId: string
  name: string
  ticker: string | null
  assetType: AssetType
  priceType: 'live' | 'manual'
  currency: Currency
  accountType: 'isa' | 'irp' | 'pension' | 'dc' | 'brokerage' | null
  brokerageId: string | null
  owner: string | null
  notes: string | null
  insuranceType: string | null
  totalQuantity: number | null
  avgCostPerUnit: number | null
  avgCostPerUnitOriginal: number | null
  avgExchangeRateAtTime: number | null
  totalCostKrw: number | null
  latestManualValuationKrw: number | null
}

/**
 * Returns ALL assets for the given user, left-joined with holdings and latest manual valuation.
 * Assets with no holdings have null quantity/cost fields.
 */
export const getAssetsWithHoldings = cache(async (userId: string): Promise<AssetWithHolding[]> => {
  const rows = await db
    .select({
      assetId: assets.id,
      name: assets.name,
      ticker: assets.ticker,
      assetType: assets.assetType,
      priceType: assets.priceType,
      currency: assets.currency,
      accountType: assets.accountType,
      brokerageId: assets.brokerageId,
      owner: assets.owner,
      notes: assets.notes,
      insuranceType: assets.insuranceType,
      totalQuantity: holdings.totalQuantity,
      avgCostPerUnit: holdings.avgCostPerUnit,
      avgCostPerUnitOriginal: holdings.avgCostPerUnitOriginal,
      avgExchangeRateAtTime: holdings.avgExchangeRateAtTime,
      totalCostKrw: holdings.totalCostKrw,
      latestManualValuationKrw: sql<number | null>`(
        SELECT mv.value_krw
        FROM manual_valuations mv
        WHERE mv.asset_id = ${assets.id}
          AND mv.user_id = ${userId}
        ORDER BY mv.valued_at DESC, mv.created_at DESC
        LIMIT 1
      )`,
    })
    .from(assets)
    .leftJoin(holdings, eq(holdings.assetId, assets.id))
    .where(eq(assets.userId, userId))
    .orderBy(assets.createdAt)
  return rows as AssetWithHolding[]
})
