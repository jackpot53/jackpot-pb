import { db } from '@/db'
import { assets } from '@/db/schema/assets'
import { holdings } from '@/db/schema/holdings'
import { eq, sql } from 'drizzle-orm'

export interface AssetWithHolding {
  assetId: string
  name: string
  ticker: string | null
  assetType: 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'fund' | 'savings' | 'real_estate'
  priceType: 'live' | 'manual'
  currency: 'KRW' | 'USD'
  accountType: 'isa' | 'irp' | 'pension' | 'dc' | 'brokerage' | null
  notes: string | null
  totalQuantity: number | null
  avgCostPerUnit: number | null
  totalCostKrw: number | null
  latestManualValuationKrw: number | null
}

/**
 * Returns ALL assets left-joined with holdings and latest manual valuation.
 * Assets with no holdings have null quantity/cost fields.
 */
export async function getAssetsWithHoldings(): Promise<AssetWithHolding[]> {
  const rows = await db
    .select({
      assetId: assets.id,
      name: assets.name,
      ticker: assets.ticker,
      assetType: assets.assetType,
      priceType: assets.priceType,
      currency: assets.currency,
      accountType: assets.accountType,
      notes: assets.notes,
      totalQuantity: holdings.totalQuantity,
      avgCostPerUnit: holdings.avgCostPerUnit,
      totalCostKrw: holdings.totalCostKrw,
      latestManualValuationKrw: sql<number | null>`(
        SELECT mv.value_krw
        FROM manual_valuations mv
        WHERE mv.asset_id = ${assets.id}
        ORDER BY mv.valued_at DESC, mv.created_at DESC
        LIMIT 1
      )`,
    })
    .from(assets)
    .leftJoin(holdings, eq(holdings.assetId, assets.id))
    .orderBy(assets.createdAt)
  return rows as AssetWithHolding[]
}
