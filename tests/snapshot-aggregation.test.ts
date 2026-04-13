import { describe, it, expect } from 'vitest'
import { toAnnualData, toMonthlyData } from '@/lib/snapshot/aggregation'
import { formatKrwCompact, formatMonthLabel } from '@/lib/snapshot/formatters'
import type { SnapshotRow } from '@/db/queries/portfolio-snapshots'

// ─── toAnnualData ────────────────────────────────────────────────────────────

describe('toAnnualData', () => {
  it('returns [] for empty input', () => {
    expect(toAnnualData([])).toEqual([])
  })

  it('returns overall return vs cost basis for first (only) year', () => {
    const snapshots: SnapshotRow[] = [
      {
        snapshotDate: '2026-04-13',
        totalValueKrw: 124_500_000,
        totalCostKrw: 110_000_000,
        returnBps: 13182,
      },
    ]
    const result = toAnnualData(snapshots)
    expect(result).toHaveLength(1)
    expect(result[0].year).toBe(2026)
    // First year: (124500000 - 110000000) / 110000000 * 100 = 13.181818...
    expect(result[0].returnPct).toBeCloseTo(13.18, 1)
    expect(result[0].totalValueKrw).toBe(124_500_000)
  })

  it('computes YoY return for second year', () => {
    // 2025: 100M value
    // 2026: 120M value → YoY = (120M - 100M) / 100M * 100 = 20%
    const snapshots: SnapshotRow[] = [
      {
        snapshotDate: '2025-12-31',
        totalValueKrw: 100_000_000,
        totalCostKrw: 80_000_000,
        returnBps: 25000,
      },
      {
        snapshotDate: '2026-12-31',
        totalValueKrw: 120_000_000,
        totalCostKrw: 80_000_000,
        returnBps: 50000,
      },
    ]
    const result = toAnnualData(snapshots)
    expect(result).toHaveLength(2)
    expect(result[0].year).toBe(2025)
    // First year: overall return (100M - 80M) / 80M * 100 = 25%
    expect(result[0].returnPct).toBeCloseTo(25.0, 1)
    expect(result[0].totalValueKrw).toBe(100_000_000)
    expect(result[1].year).toBe(2026)
    expect(result[1].returnPct).toBeCloseTo(20.0, 1)
    expect(result[1].totalValueKrw).toBe(120_000_000)
  })

  it('keeps only last snapshot per year when two snapshots are in same year', () => {
    // Both in 2026; 2026-04-13 is later, so that one should win
    const snapshots: SnapshotRow[] = [
      {
        snapshotDate: '2026-04-01',
        totalValueKrw: 100_000_000,
        totalCostKrw: 90_000_000,
        returnBps: 11111,
      },
      {
        snapshotDate: '2026-04-13',
        totalValueKrw: 124_500_000,
        totalCostKrw: 110_000_000,
        returnBps: 13182,
      },
    ]
    const result = toAnnualData(snapshots)
    expect(result).toHaveLength(1)
    expect(result[0].year).toBe(2026)
    expect(result[0].totalValueKrw).toBe(124_500_000)
  })
})

// ─── toMonthlyData ───────────────────────────────────────────────────────────

describe('toMonthlyData', () => {
  it('returns [] for empty input', () => {
    expect(toMonthlyData([])).toEqual([])
  })

  it('returns single entry with undefined returnPct for one snapshot', () => {
    const snapshots: SnapshotRow[] = [
      {
        snapshotDate: '2026-04-13',
        totalValueKrw: 124_500_000,
        totalCostKrw: 110_000_000,
        returnBps: 13182,
      },
    ]
    const result = toMonthlyData(snapshots)
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('2026-04')
    expect(result[0].totalValueKrw).toBe(124_500_000)
    expect(result[0].returnPct).toBeUndefined()
  })

  it('keeps only the last snapshot per month when two are in same month', () => {
    const snapshots: SnapshotRow[] = [
      {
        snapshotDate: '2026-04-01',
        totalValueKrw: 100_000_000,
        totalCostKrw: 90_000_000,
        returnBps: 11111,
      },
      {
        snapshotDate: '2026-04-13',
        totalValueKrw: 124_500_000,
        totalCostKrw: 110_000_000,
        returnBps: 13182,
      },
    ]
    const result = toMonthlyData(snapshots)
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('2026-04')
    expect(result[0].totalValueKrw).toBe(124_500_000)
  })

  it('computes MoM returnPct for two consecutive months', () => {
    const now = new Date()
    // Build two months within trailing 12 months
    const m1 = new Date(now)
    m1.setMonth(m1.getMonth() - 2)
    const m2 = new Date(now)
    m2.setMonth(m2.getMonth() - 1)
    const label1 = m1.toISOString().slice(0, 7)
    const label2 = m2.toISOString().slice(0, 7)
    const date1 = `${label1}-15`
    const date2 = `${label2}-15`

    const valueA = 100_000_000
    const valueB = 110_000_000

    const snapshots: SnapshotRow[] = [
      { snapshotDate: date1, totalValueKrw: valueA, totalCostKrw: 90_000_000, returnBps: 11111 },
      { snapshotDate: date2, totalValueKrw: valueB, totalCostKrw: 90_000_000, returnBps: 22222 },
    ]
    const result = toMonthlyData(snapshots)
    expect(result).toHaveLength(2)
    expect(result[0].returnPct).toBeUndefined()
    // MoM: (110M - 100M) / 100M * 100 = 10%
    expect(result[1].returnPct).toBeCloseTo(10.0, 1)
  })

  it('limits to trailing 12 months when snapshots span 14 months', () => {
    const now = new Date()
    const snapshots: SnapshotRow[] = []
    // Generate 14 months of snapshots going backwards from now
    for (let i = 0; i < 14; i++) {
      const d = new Date(now)
      d.setMonth(d.getMonth() - (13 - i))
      const label = d.toISOString().slice(0, 7)
      snapshots.push({
        snapshotDate: `${label}-15`,
        totalValueKrw: 100_000_000 + i * 1_000_000,
        totalCostKrw: 90_000_000,
        returnBps: 10000 + i * 100,
      })
    }
    const result = toMonthlyData(snapshots)
    // Should have at most 12 or 13 entries (trailing 12 months boundary)
    expect(result.length).toBeLessThanOrEqual(12)
    // The oldest 2 months should be excluded
    expect(result.length).toBeGreaterThanOrEqual(11)
  })
})

// ─── formatKrwCompact ────────────────────────────────────────────────────────

describe('formatKrwCompact', () => {
  it('formats >= 100M as 억 with one decimal', () => {
    expect(formatKrwCompact(150_000_000)).toBe('₩1.5억')
    expect(formatKrwCompact(100_000_000)).toBe('₩1.0억')
  })

  it('formats >= 10M and < 100M as 천만', () => {
    expect(formatKrwCompact(50_000_000)).toBe('₩5천만')
  })

  it('formats >= 1M and < 10M as 백만', () => {
    expect(formatKrwCompact(5_000_000)).toBe('₩5백만')
  })

  it('formats < 1M as full integer with ko-KR locale', () => {
    expect(formatKrwCompact(500_000)).toBe('₩500,000')
  })
})

// ─── formatMonthLabel ────────────────────────────────────────────────────────

describe('formatMonthLabel', () => {
  it('converts YYYY-MM to YY.MM', () => {
    expect(formatMonthLabel('2025-04')).toBe('25.04')
    expect(formatMonthLabel('2026-01')).toBe('26.01')
    expect(formatMonthLabel('2024-12')).toBe('24.12')
  })
})
