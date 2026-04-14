import { db } from '@/db'
import { portfolioSnapshots } from '@/db/schema/portfolio-snapshots'
import { asc, eq } from 'drizzle-orm'

export interface SnapshotRow {
  snapshotDate: string
  totalValueKrw: number
  totalCostKrw: number
  returnBps: number
}

/**
 * Returns all portfolio snapshots ordered by date ascending.
 * Used by the charts page (Server Component) and aggregation functions.
 * No live API calls — reads only from pre-computed snapshot table.
 */
export async function getAllSnapshots(userId: string): Promise<SnapshotRow[]> {
  return db
    .select({
      snapshotDate: portfolioSnapshots.snapshotDate,
      totalValueKrw: portfolioSnapshots.totalValueKrw,
      totalCostKrw: portfolioSnapshots.totalCostKrw,
      returnBps: portfolioSnapshots.returnBps,
    })
    .from(portfolioSnapshots)
    .where(eq(portfolioSnapshots.userId, userId))
    .orderBy(asc(portfolioSnapshots.snapshotDate))
}
