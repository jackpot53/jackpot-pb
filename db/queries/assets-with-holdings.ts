import { db } from '@/db'
import { assets } from '@/db/schema/assets'
import { holdings } from '@/db/schema/holdings'
import { eq, sql } from 'drizzle-orm'

/**
 * Returns all assets joined with their holdings row and the latest manual valuation.
 * Assets with no holdings row are excluded (no positions to display).
 * latestManualValuationKrw is null for LIVE assets (no manual valuation expected).
 */
export interface AssetWithHolding {
  assetId: string
  name: string
  ticker: string | null
  assetType: 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'savings' | 'real_estate'
  priceType: 'live' | 'manual'
  totalQuantity: number
  avgCostPerUnit: number
  totalCostKrw: number
  latestManualValuationKrw: number | null
}

export async function getAssetsWithHoldings(): Promise<AssetWithHolding[]> {
  // Correlated subquery for latest manual valuation per asset.
  // Uses ORDER BY valued_at DESC, created_at DESC to get the most recent entry.
  // T-03-02-T3: Drizzle sql`` template with parameterized asset.id — no string interpolation of user input.
  const rows = await db
    .select({
      assetId: assets.id,
      name: assets.name,
      ticker: assets.ticker,
      assetType: assets.assetType,
      priceType: assets.priceType,
      totalQuantity: holdings.totalQuantity,
      avgCostPerUnit: holdings.avgCostPerUnit,
      totalCostKrw: holdings.totalCostKrw,
      // Subquery for latest manual valuation value_krw per asset
      latestManualValuationKrw: sql<number | null>`(
        SELECT mv.value_krw
        FROM manual_valuations mv
        WHERE mv.asset_id = ${assets.id}
        ORDER BY mv.valued_at DESC, mv.created_at DESC
        LIMIT 1
      )`,
    })
    .from(assets)
    .innerJoin(holdings, eq(holdings.assetId, assets.id))
  return rows as AssetWithHolding[]
}
