import { describe, it, expect } from 'vitest'
import type { SnapshotRow } from '@/db/queries/portfolio-snapshots'

// Pure helper functions that GoalProgressChart would use internally
function prepareChartData(snapshots: SnapshotRow[]) {
  return snapshots.map(s => ({
    snapshotDate: s.snapshotDate,  // must remain a string
    totalValueKrw: s.totalValueKrw,
  }))
}
function hasNoData(snapshots: SnapshotRow[]): boolean {
  return snapshots.length === 0
}

const mockSnapshot: SnapshotRow = {
  snapshotDate: '2026-01-01',
  totalValueKrw: 1_000_000,
  totalCostKrw: 900_000,
  returnBps: 1111,
}

describe('prepareChartData', () => {
  it('returns empty array for empty input', () => {
    expect(prepareChartData([])).toEqual([])
  })
  it('maps snapshots to chart data shape', () => {
    const result = prepareChartData([mockSnapshot])
    expect(result).toHaveLength(1)
    expect(result[0].snapshotDate).toBe('2026-01-01')
    expect(result[0].totalValueKrw).toBe(1_000_000)
  })
  it('keeps snapshotDate as string (not converted to Date)', () => {
    const result = prepareChartData([mockSnapshot])
    expect(typeof result[0].snapshotDate).toBe('string')
  })
})

describe('hasNoData', () => {
  it('returns true for empty snapshots', () => {
    expect(hasNoData([])).toBe(true)
  })
  it('returns false when snapshots exist', () => {
    expect(hasNoData([mockSnapshot])).toBe(false)
  })
})
