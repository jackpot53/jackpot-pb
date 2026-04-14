import { db } from '@/db'
import { portfolioSnapshots } from '@/db/schema/portfolio-snapshots'

export interface SnapshotParams {
  snapshotDate: string   // 'YYYY-MM-DD' (UTC date)
  totalValueKrw: number
  totalCostKrw: number
  returnBps: number      // return% × 10000, e.g. 12.34% = 12340
}

/**
 * Writes one portfolio snapshot row.
 * Idempotent: onConflictDoNothing on snapshotDate UNIQUE constraint.
 * Vercel Cron may deliver the same event twice — this is safe.
 */
export async function writePortfolioSnapshot(params: SnapshotParams): Promise<void> {
  await db
    .insert(portfolioSnapshots)
    .values(params)
    .onConflictDoNothing()
}
