import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the modules the route depends on
vi.mock('@/lib/snapshot/writer', () => ({
  writePortfolioSnapshot: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/price/cache', () => ({
  refreshPriceIfStale: vi.fn().mockResolvedValue(undefined),
  refreshFxIfStale: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
      })),
    })),
  },
}))
vi.mock('@/db/schema/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/schema/assets')>()
  return {
    ...actual,
  }
})
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>()
  return {
    ...actual,
    and: vi.fn(),
    eq: vi.fn(),
    isNotNull: vi.fn(),
  }
})
vi.mock('@/db/queries/assets-with-holdings', () => ({
  getAssetsWithHoldings: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/db/queries/price-cache', () => ({
  getPriceCacheByTickers: vi.fn().mockResolvedValue(new Map()),
  getInvalidPriceCacheTickers: vi.fn().mockResolvedValue([]),
}))

describe('GET /api/cron/snapshot', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'testSecret', CRON_TARGET_USER_ID: 'test-user-uuid' }
    vi.resetModules()
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('returns 401 when Authorization header is missing', async () => {
    const { GET } = await import('@/app/api/cron/snapshot/route')
    const request = new Request('http://localhost/api/cron/snapshot')
    const response = await GET(request as Parameters<typeof GET>[0])
    expect(response.status).toBe(401)
  })

  it('returns 401 when Authorization header has wrong token', async () => {
    const { GET } = await import('@/app/api/cron/snapshot/route')
    const request = new Request('http://localhost/api/cron/snapshot', {
      headers: { Authorization: 'Bearer wrongtoken' },
    })
    const response = await GET(request as Parameters<typeof GET>[0])
    expect(response.status).toBe(401)
  })

  it('returns 200 when Authorization header is correct', async () => {
    const { GET } = await import('@/app/api/cron/snapshot/route')
    const request = new Request('http://localhost/api/cron/snapshot', {
      headers: { Authorization: 'Bearer testSecret' },
    })
    const response = await GET(request as Parameters<typeof GET>[0])
    expect(response.status).toBe(200)
  })
})
