import type { SnapshotRow } from '@/db/queries/portfolio-snapshots'

export interface AnnualDataPoint {
  year: number
  returnPct: number      // YoY: (thisYearEnd - lastYearEnd) / lastYearEnd * 100
                         // First year: (totalValueKrw - totalCostKrw) / totalCostKrw * 100
  totalValueKrw: number  // year-end total (tooltip only)
}

export interface MonthlyDataPoint {
  label: string          // 'YYYY-MM' e.g. '2025-04'
  totalValueKrw: number  // month-end snapshot totalValueKrw
  returnPct?: number     // optional: MoM return % (tooltip only)
}

/**
 * Aggregates all snapshots into annual data points for the annual return chart.
 *
 * - Groups by year, keeping the last snapshot per year (date-ordered ASC input means
 *   later dates overwrite earlier ones in the same year).
 * - First year: uses overall return vs. cost basis (no prior year exists).
 * - Subsequent years: YoY = (thisYearEnd - lastYearEnd) / lastYearEnd * 100.
 *
 * Note: returnBps in the snapshot is overall return (not YoY). We compute YoY
 * from consecutive year-end totalValueKrw values per the annual chart design (D-06).
 */
export function toAnnualData(snapshots: SnapshotRow[]): AnnualDataPoint[] {
  if (snapshots.length === 0) return []

  // Group by year, keep last snapshot per year (snapshots are ordered by date ASC)
  const byYear = new Map<number, SnapshotRow>()
  for (const s of snapshots) {
    const year = parseInt(s.snapshotDate.slice(0, 4), 10)
    byYear.set(year, s) // later dates overwrite earlier ones
  }

  const sorted = [...byYear.entries()].sort(([a], [b]) => a - b)

  return sorted.map(([year, snap], i) => {
    const prev = i > 0 ? sorted[i - 1][1] : null
    const returnPct = prev
      ? ((snap.totalValueKrw - prev.totalValueKrw) / prev.totalValueKrw) * 100
      : ((snap.totalValueKrw - snap.totalCostKrw) / snap.totalCostKrw) * 100
    return { year, returnPct, totalValueKrw: snap.totalValueKrw }
  })
}

/**
 * Aggregates snapshots into monthly data points for the monthly portfolio chart.
 *
 * - Filters to trailing 12 months only.
 * - Groups by YYYY-MM, keeping the last snapshot per month (ASC input order).
 * - First month in the window: returnPct is undefined (no prior month to compare).
 * - Subsequent months: MoM = (thisMonth - lastMonth) / lastMonth * 100.
 */
export function toMonthlyData(snapshots: SnapshotRow[]): MonthlyDataPoint[] {
  if (snapshots.length === 0) return []

  // Trailing 12 months cutoff (YYYY-MM string comparison)
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() - 12)
  const cutoffStr = cutoff.toISOString().slice(0, 7) // 'YYYY-MM'

  const recent = snapshots.filter(
    (s) => s.snapshotDate.slice(0, 7) > cutoffStr
  )

  if (recent.length === 0) return []

  // Group by YYYY-MM, keep last snapshot per month (ASC order — last wins)
  const byMonth = new Map<string, SnapshotRow>()
  for (const s of recent) {
    const month = s.snapshotDate.slice(0, 7)
    byMonth.set(month, s)
  }

  const sorted = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b))

  return sorted.map(([label, snap], i) => {
    const prev = i > 0 ? sorted[i - 1][1] : null
    const returnPct = prev
      ? ((snap.totalValueKrw - prev.totalValueKrw) / prev.totalValueKrw) * 100
      : undefined
    return { label, totalValueKrw: snap.totalValueKrw, returnPct }
  })
}
