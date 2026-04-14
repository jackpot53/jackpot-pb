import { describe, it, expect, vi } from 'vitest'

const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined)
const mockValues = vi.fn(() => ({ onConflictDoNothing: mockOnConflictDoNothing }))
const mockInsert = vi.fn(() => ({ values: mockValues }))

vi.mock('@/db', () => ({
  db: { insert: mockInsert },
}))
vi.mock('@/db/schema/portfolio-snapshots', () => ({
  portfolioSnapshots: {},
}))

describe('writePortfolioSnapshot', () => {
  it('inserts with correct params and calls onConflictDoNothing', async () => {
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
    expect(mockOnConflictDoNothing).toHaveBeenCalled()
  })
})
