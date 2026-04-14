import { describe, it, expect } from 'vitest'

describe('Drizzle schema exports (smoke test)', () => {
  it('exports all 7 required tables without error', async () => {
    // Import schema files — if any column type or syntax is wrong, this throws
    const assets = await import('@/db/schema/assets')
    const transactions = await import('@/db/schema/transactions')
    const manualValuations = await import('@/db/schema/manual-valuations')
    const holdings = await import('@/db/schema/holdings')
    const priceCache = await import('@/db/schema/price-cache')
    const portfolioSnapshots = await import('@/db/schema/portfolio-snapshots')
    const goals = await import('@/db/schema/goals')

    expect(assets.assets).toBeDefined()
    expect(transactions.transactions).toBeDefined()
    expect(manualValuations.manualValuations).toBeDefined()
    expect(holdings.holdings).toBeDefined()
    expect(priceCache.priceCache).toBeDefined()
    expect(portfolioSnapshots.portfolioSnapshots).toBeDefined()
    expect(goals.goals).toBeDefined()
  })
})
