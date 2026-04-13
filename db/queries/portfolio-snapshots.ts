import { db } from '@/db'
import { portfolioSnapshots } from '@/db/schema/portfolio-snapshots'
import { asc } from 'drizzle-orm'

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
export async function getAllSnapshots(): Promise<SnapshotRow[]> {
  return db
    .select({
      snapshotDate: portfolioSnapshots.snapshotDate,
      totalValueKrw: portfolioSnapshots.totalValueKrw,
      totalCostKrw: portfolioSnapshots.totalCostKrw,
      returnBps: portfolioSnapshots.returnBps,
    })
    .from(portfolioSnapshots)
    .orderBy(asc(portfolioSnapshots.snapshotDate))
}
