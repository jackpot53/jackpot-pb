import type { SnapshotRow, SnapshotWithBreakdowns } from '@/db/queries/portfolio-snapshots'
import type { CandlestickPoint } from '@/components/app/candlestick-chart'

/**
 * Extracts per-asset-type SnapshotRow[] from SnapshotWithBreakdowns[].
 * Only includes dates that have a breakdown entry for the given type
 * (dates written before the migration have empty byType and are skipped).
 */
export function snapshotsForType(snapshots: SnapshotWithBreakdowns[], assetType: string): SnapshotRow[] {
  return snapshots
    .filter((s) => s.byType[assetType] !== undefined)
    .map((s) => ({
      snapshotDate: s.snapshotDate,
      totalValueKrw: s.byType[assetType].totalValueKrw,
      totalCostKrw: s.byType[assetType].totalCostKrw,
      returnBps: 0, // not used by toMonthlyData / toAnnualData
    }))
}

export interface DailyDataPoint {
  label: string          // 'M/D' e.g. '4/15'
  totalValueKrw: number
  profitKrw: number
  totalCostKrw: number
}

/**
 * Returns last 30 daily snapshots as-is for the daily chart.
 */
export function toDailyData(snapshots: SnapshotRow[]): DailyDataPoint[] {
  if (snapshots.length === 0) return []
  const recent = snapshots.slice(-30)
  return recent.map((s) => {
    const d = new Date(s.snapshotDate)
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    return {
      label,
      totalValueKrw: s.totalValueKrw,
      profitKrw: s.totalValueKrw - s.totalCostKrw,
      totalCostKrw: s.totalCostKrw,
    }
  })
}

export interface AnnualDataPoint {
  year: number
  returnPct: number      // YoY return %
  totalValueKrw: number  // year-end total value
  profitKrw: number      // year-end profit = totalValueKrw - totalCostKrw
}

export interface MonthlyDataPoint {
  label: string          // 'YYYY-MM' e.g. '2025-04'
  totalValueKrw: number  // month-end snapshot totalValueKrw
  returnPct?: number     // MoM return % (tooltip)
  profitKrw: number      // month-end profit = totalValueKrw - totalCostKrw
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
    return { year, returnPct, totalValueKrw: snap.totalValueKrw, profitKrw: snap.totalValueKrw - snap.totalCostKrw }
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
    return { label, totalValueKrw: snap.totalValueKrw, returnPct, profitKrw: snap.totalValueKrw - snap.totalCostKrw }
  })
}

/**
 * Converts daily snapshots into daily candlestick data (last 60 days).
 * Since each day has one data point, O = prev day's close, C = current close.
 * H = max(O, C), L = min(O, C).
 */
export function toDailyCandlestick(snapshots: SnapshotRow[]): CandlestickPoint[] {
  const recent = snapshots.slice(-60)
  if (recent.length === 0) return []
  return recent.map((s, i) => {
    const profit = s.totalValueKrw - s.totalCostKrw
    const prevProfit = i > 0 ? recent[i - 1].totalValueKrw - recent[i - 1].totalCostKrw : profit
    const open = prevProfit
    const close = profit
    const high = Math.max(open, close)
    const low = Math.min(open, close)
    const d = new Date(s.snapshotDate)
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    const returnPct = s.totalCostKrw > 0 ? (profit / s.totalCostKrw) * 100 : 0
    return { date: s.snapshotDate, label, open, high, low, close, returnPct, delta: close - open }
  })
}

/**
 * Converts daily snapshots into monthly candlestick data.
 * Each candle = one calendar month.
 * O = previous month's close (continuity), H/L = max/min profit across all days in the month.
 */
export function toMonthlyCandlestick(snapshots: SnapshotRow[]): CandlestickPoint[] {
  if (snapshots.length === 0) return []

  const byMonth = new Map<string, SnapshotRow[]>()
  for (const s of snapshots) {
    const month = s.snapshotDate.slice(0, 7)
    if (!byMonth.has(month)) byMonth.set(month, [])
    byMonth.get(month)!.push(s)
  }

  const sortedMonths = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b))

  return sortedMonths.map(([month, snaps], i) => {
    const profits = snaps.map(s => s.totalValueKrw - s.totalCostKrw)
    const lastSnap = snaps[snaps.length - 1]
    const prevLastSnap = i > 0 ? sortedMonths[i - 1][1].at(-1)! : snaps[0]
    const open = prevLastSnap.totalValueKrw - prevLastSnap.totalCostKrw
    const close = profits[profits.length - 1]
    const high = Math.max(open, ...profits)
    const low = Math.min(open, ...profits)
    const returnPct = lastSnap.totalCostKrw > 0
      ? ((lastSnap.totalValueKrw - lastSnap.totalCostKrw) / lastSnap.totalCostKrw) * 100
      : 0
    return { date: month, label: month.slice(5), open, high, low, close, returnPct, delta: close - open }
  })
}

/**
 * Converts daily snapshots into annual candlestick data.
 * Each candle = one calendar year.
 * O = previous year's close (continuity), H/L = max/min profit across all days in the year.
 */
export function toAnnualCandlestick(snapshots: SnapshotRow[]): CandlestickPoint[] {
  if (snapshots.length === 0) return []

  const byYear = new Map<string, SnapshotRow[]>()
  for (const s of snapshots) {
    const year = s.snapshotDate.slice(0, 4)
    if (!byYear.has(year)) byYear.set(year, [])
    byYear.get(year)!.push(s)
  }

  const sortedYears = [...byYear.entries()].sort(([a], [b]) => a.localeCompare(b))

  return sortedYears.map(([year, snaps], i) => {
    const profits = snaps.map(s => s.totalValueKrw - s.totalCostKrw)
    const lastSnap = snaps[snaps.length - 1]
    const prevLastSnap = i > 0 ? sortedYears[i - 1][1].at(-1)! : snaps[0]
    const open = prevLastSnap.totalValueKrw - prevLastSnap.totalCostKrw
    const close = profits[profits.length - 1]
    const high = Math.max(open, ...profits)
    const low = Math.min(open, ...profits)
    const returnPct = lastSnap.totalCostKrw > 0
      ? ((lastSnap.totalValueKrw - lastSnap.totalCostKrw) / lastSnap.totalCostKrw) * 100
      : 0
    return { date: year, label: `${year}년`, open, high, low, close, returnPct, delta: close - open }
  })
}

/**
 * Converts daily snapshots into monthly candlestick data tracking totalValueKrw (total asset value).
 * Used for the hero summary card chart.
 */
export function toMonthlyValueCandlestick(snapshots: SnapshotRow[]): CandlestickPoint[] {
  if (snapshots.length === 0) return []

  const byMonth = new Map<string, SnapshotRow[]>()
  for (const s of snapshots) {
    const month = s.snapshotDate.slice(0, 7)
    if (!byMonth.has(month)) byMonth.set(month, [])
    byMonth.get(month)!.push(s)
  }

  const sortedMonths = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b))

  return sortedMonths.map(([month, snaps], i) => {
    const values = snaps.map(s => s.totalValueKrw)
    const lastSnap = snaps[snaps.length - 1]
    const prevLastSnap = i > 0 ? sortedMonths[i - 1][1].at(-1)! : snaps[0]
    const open = prevLastSnap.totalValueKrw
    const close = values[values.length - 1]
    const high = Math.max(open, ...values)
    const low = Math.min(open, ...values)
    const returnPct = lastSnap.totalCostKrw > 0
      ? ((lastSnap.totalValueKrw - lastSnap.totalCostKrw) / lastSnap.totalCostKrw) * 100
      : 0
    return { date: month, label: month.slice(5), open, high, low, close, returnPct, delta: close - open }
  })
}
