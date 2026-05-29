import { cache } from 'react'
import { db } from '@/db'
import { portfolioSnapshots } from '@/db/schema/portfolio-snapshots'
import { portfolioSnapshotBreakdowns } from '@/db/schema/portfolio-snapshot-breakdowns'
import { asc, eq } from 'drizzle-orm'

export interface SnapshotRow {
  snapshotDate: string
  totalValueKrw: number
  totalCostKrw: number
  returnBps: number
}

export interface SnapshotWithBreakdowns extends SnapshotRow {
  byType: Record<string, { totalValueKrw: number; totalCostKrw: number }>
}

/**
 * Returns all portfolio snapshots ordered by date ascending.
 * Used by the charts page (Server Component) and aggregation functions.
 * No live API calls — reads only from pre-computed snapshot table.
 */
export const getAllSnapshots = cache(async (userId: string): Promise<SnapshotRow[]> => {
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
})

/**
 * Returns all portfolio snapshots with per-asset-type breakdowns.
 * Snapshots without breakdowns (written before migration) have an empty byType map.
 * Used by the assets page for per-type monthly/annual charts.
 */
export const getAllSnapshotsWithBreakdowns = cache(async (userId: string): Promise<SnapshotWithBreakdowns[]> => {
  type BreakdownRow = { snapshotDate: string; assetType: string; totalValueKrw: number; totalCostKrw: number }

  // Both queries are independent — run in parallel for 1 fewer round-trip
  const [snapshotRows, breakdownRows] = await Promise.all([
    getAllSnapshots(userId).catch((): SnapshotRow[] | null => null),
    db
      .select({
        snapshotDate: portfolioSnapshots.snapshotDate,
        assetType: portfolioSnapshotBreakdowns.assetType,
        totalValueKrw: portfolioSnapshotBreakdowns.totalValueKrw,
        totalCostKrw: portfolioSnapshotBreakdowns.totalCostKrw,
      })
      .from(portfolioSnapshotBreakdowns)
      .innerJoin(portfolioSnapshots, eq(portfolioSnapshotBreakdowns.snapshotId, portfolioSnapshots.id))
      .where(eq(portfolioSnapshots.userId, userId))
      .orderBy(asc(portfolioSnapshots.snapshotDate))
      // Gracefully handle missing table (migration not yet applied)
      .catch((): BreakdownRow[] => []),
  ])

  if (snapshotRows === null) return []

  // Pivot breakdown rows by snapshotDate → assetType
  const byDateType = new Map<string, Record<string, { totalValueKrw: number; totalCostKrw: number }>>()
  for (const b of breakdownRows) {
    if (!byDateType.has(b.snapshotDate)) byDateType.set(b.snapshotDate, {})
    byDateType.get(b.snapshotDate)![b.assetType] = {
      totalValueKrw: b.totalValueKrw,
      totalCostKrw: b.totalCostKrw,
    }
  }

  return snapshotRows.map((s) => ({
    ...s,
    byType: byDateType.get(s.snapshotDate) ?? {},
  }))
})
