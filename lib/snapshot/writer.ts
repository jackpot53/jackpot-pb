import { sql } from 'drizzle-orm'
import { db } from '@/db'
import { portfolioSnapshots } from '@/db/schema/portfolio-snapshots'
import { portfolioSnapshotBreakdowns } from '@/db/schema/portfolio-snapshot-breakdowns'

export interface SnapshotParams {
  snapshotDate: string   // 'YYYY-MM-DD' (UTC date)
  totalValueKrw: number
  totalCostKrw: number
  returnBps: number      // return% × 10000, e.g. 12.34% = 12340
  userId: string
}

export interface BreakdownEntry {
  assetType: 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'savings' | 'real_estate' | 'fund' | 'insurance' | 'precious_metal'
  totalValueKrw: number
  totalCostKrw: number
}

/**
 * Writes one portfolio snapshot row plus optional per-asset-type breakdowns.
 * Idempotent: upserts snapshot by (userId, snapshotDate) unique constraint,
 * upserts breakdowns by (snapshotId, assetType) primary key.
 * Vercel Cron may deliver the same event twice — this is safe.
 */
export async function writePortfolioSnapshot(
  params: SnapshotParams,
  breakdowns: BreakdownEntry[] = []
): Promise<void> {
  // Upsert snapshot and get back the id
  const [row] = await db
    .insert(portfolioSnapshots)
    .values(params)
    .onConflictDoUpdate({
      target: [portfolioSnapshots.userId, portfolioSnapshots.snapshotDate],
      set: {
        totalValueKrw: sql`excluded.total_value_krw`,
        totalCostKrw: sql`excluded.total_cost_krw`,
        returnBps: sql`excluded.return_bps`,
      },
    })
    .returning({ id: portfolioSnapshots.id })

  if (breakdowns.length === 0) return

  // Upsert per-type breakdown rows
  await db
    .insert(portfolioSnapshotBreakdowns)
    .values(breakdowns.map((b) => ({ snapshotId: row.id, ...b })))
    .onConflictDoUpdate({
      target: [portfolioSnapshotBreakdowns.snapshotId, portfolioSnapshotBreakdowns.assetType],
      set: {
        totalValueKrw: sql`excluded.total_value_krw`,
        totalCostKrw: sql`excluded.total_cost_krw`,
      },
    })
}
