import { describe, it, expect, vi } from 'vitest'

const mockReturning = vi.fn().mockResolvedValue([{ id: 'snap-id-123' }])
const mockOnConflictDoUpdate = vi.fn(() => ({ returning: mockReturning }))
const mockValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate }))
const mockInsert = vi.fn(() => ({ values: mockValues }))

vi.mock('@/db', () => ({
  db: { insert: mockInsert },
}))
vi.mock('@/db/schema/portfolio-snapshots', () => ({
  portfolioSnapshots: {
    userId: { name: 'user_id' },
    snapshotDate: { name: 'snapshot_date' },
    id: { name: 'id' },
    totalValueKrw: { name: 'total_value_krw' },
    totalCostKrw: { name: 'total_cost_krw' },
    returnBps: { name: 'return_bps' },
  },
}))
vi.mock('@/db/schema/portfolio-snapshot-breakdowns', () => ({
  portfolioSnapshotBreakdowns: {
    snapshotId: { name: 'snapshot_id' },
  },
}))

describe('writePortfolioSnapshot', () => {
  it('inserts with correct params and calls onConflictDoUpdate', async () => {
    const { writePortfolioSnapshot } = await import('@/lib/snapshot/writer')
    await writePortfolioSnapshot({
      snapshotDate: '2026-04-13',
      totalValueKrw: 124500000,
      totalCostKrw: 110000000,
      returnBps: 13182,
      userId: 'test-user-id',
    })
    expect(mockValues).toHaveBeenCalledWith({
      snapshotDate: '2026-04-13',
      totalValueKrw: 124500000,
      totalCostKrw: 110000000,
      returnBps: 13182,
      userId: 'test-user-id',
    })
    expect(mockOnConflictDoUpdate).toHaveBeenCalled()
    expect(mockReturning).toHaveBeenCalled()
  })
})
