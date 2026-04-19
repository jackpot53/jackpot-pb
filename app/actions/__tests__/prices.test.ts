import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks must be hoisted before importing the module under test.

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/perf', () => ({ timed: <T,>(_label: string, fn: () => T): T => fn() }))
vi.mock('@/lib/price/cache', () => ({ refreshFxIfStale: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/price/funetf', () => ({ fetchFunetfNav: vi.fn() }))
vi.mock('@/lib/price/kis', () => ({ fetchKisQuote: vi.fn() }))
vi.mock('@/lib/price/yahoo', () => ({ fetchYahooQuote: vi.fn() }))
vi.mock('@/db/queries/price-cache', () => ({
  getPriceCacheByTickers: vi.fn(),
  upsertPriceCache: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/db/schema/assets', () => ({ assets: {} }))
vi.mock('@/db/schema/price-cache', () => ({ priceCache: {} }))
vi.mock('drizzle-orm', () => ({
  and: vi.fn(),
  eq: vi.fn(),
  isNotNull: vi.fn(),
  or: vi.fn(),
  sql: Object.assign(vi.fn(), {}),
}))

const liveAssetsRows: Array<{ ticker: string; assetType: string }> = []
vi.mock('@/db', () => {
  const select = vi.fn(() => ({
    from: vi.fn((table: unknown) => {
      // First select: MAX(cached_at) on priceCache
      // Second select: assets list
      if (table && (table as { _isAssets?: boolean })._isAssets) {
        return { where: vi.fn().mockResolvedValue(liveAssetsRows) }
      }
      // Default: maxCachedAt query — return empty so dedup gate opens
      return Promise.resolve([{ maxCachedAt: null }])
    }),
  }))
  return { db: { select } }
})

beforeEach(() => {
  vi.clearAllMocks()
  liveAssetsRows.length = 0
})

describe('refreshAllPricesInternal — fetcher routing', () => {
  it('routes KR stocks/ETFs to KIS, never Yahoo', async () => {
    const { fetchKisQuote } = await import('@/lib/price/kis')
    const { fetchYahooQuote } = await import('@/lib/price/yahoo')
    const { getPriceCacheByTickers } = await import('@/db/queries/price-cache')

    // Patch db mock to return our KR asset
    const dbMod = await import('@/db')
    vi.spyOn(dbMod.db, 'select').mockImplementation(((...args: unknown[]) => {
      void args
      return {
        from: vi.fn(() => {
          // Return distinct payloads for the two distinct queries
          // 1. maxCachedAt
          // 2. assets list
          // Sequence them via call counter
          callCount++
          if (callCount === 1) return Promise.resolve([{ maxCachedAt: null }])
          return { where: vi.fn().mockResolvedValue([{ ticker: '005930.KS', assetType: 'stock_kr' }]) }
        }),
      }
    }) as never)
    let callCount = 0

    vi.mocked(getPriceCacheByTickers).mockResolvedValue(
      new Map([
        ['USD_KRW', {
          id: 'fx', ticker: 'USD_KRW', priceKrw: 13565000, priceOriginal: 13565000,
          currency: 'KRW', changeBps: null, cachedAt: new Date(Date.now() - 30 * 60_000),
        }],
      ]),
    )
    vi.mocked(fetchKisQuote).mockResolvedValue({ price: 75000, currency: 'KRW', changePercent: 1.5 })

    const { refreshAllPricesInternal } = await import('../prices')
    await refreshAllPricesInternal()

    expect(fetchKisQuote).toHaveBeenCalledWith('005930.KS', 'stock_kr')
    expect(fetchYahooQuote).not.toHaveBeenCalled()
  })

  it('routes US stocks/ETFs to KIS, never Yahoo', async () => {
    const { fetchKisQuote } = await import('@/lib/price/kis')
    const { fetchYahooQuote } = await import('@/lib/price/yahoo')
    const { getPriceCacheByTickers } = await import('@/db/queries/price-cache')

    let callCount = 0
    const dbMod = await import('@/db')
    vi.spyOn(dbMod.db, 'select').mockImplementation((() => ({
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return Promise.resolve([{ maxCachedAt: null }])
        return { where: vi.fn().mockResolvedValue([{ ticker: 'AAPL', assetType: 'stock_us' }]) }
      }),
    })) as never)

    vi.mocked(getPriceCacheByTickers).mockResolvedValue(
      new Map([
        ['USD_KRW', {
          id: 'fx', ticker: 'USD_KRW', priceKrw: 13565000, priceOriginal: 13565000,
          currency: 'KRW', changeBps: null, cachedAt: new Date(Date.now() - 30 * 60_000),
        }],
      ]),
    )
    vi.mocked(fetchKisQuote).mockResolvedValue({ price: 185.43, currency: 'USD', changePercent: 0.5 })

    const { refreshAllPricesInternal } = await import('../prices')
    await refreshAllPricesInternal()

    expect(fetchKisQuote).toHaveBeenCalledWith('AAPL', 'stock_us')
    expect(fetchYahooQuote).not.toHaveBeenCalled()
  })

  it('routes crypto to Yahoo (KIS does not cover crypto)', async () => {
    const { fetchKisQuote } = await import('@/lib/price/kis')
    const { fetchYahooQuote } = await import('@/lib/price/yahoo')
    const { getPriceCacheByTickers } = await import('@/db/queries/price-cache')

    let callCount = 0
    const dbMod = await import('@/db')
    vi.spyOn(dbMod.db, 'select').mockImplementation((() => ({
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return Promise.resolve([{ maxCachedAt: null }])
        return { where: vi.fn().mockResolvedValue([{ ticker: 'BTC-USD', assetType: 'crypto' }]) }
      }),
    })) as never)

    vi.mocked(getPriceCacheByTickers).mockResolvedValue(
      new Map([
        ['USD_KRW', {
          id: 'fx', ticker: 'USD_KRW', priceKrw: 13565000, priceOriginal: 13565000,
          currency: 'KRW', changeBps: null, cachedAt: new Date(Date.now() - 30 * 60_000),
        }],
      ]),
    )
    vi.mocked(fetchYahooQuote).mockResolvedValue({ price: 65000, currency: 'USD', changePercent: 2.0 })

    const { refreshAllPricesInternal } = await import('../prices')
    await refreshAllPricesInternal()

    expect(fetchYahooQuote).toHaveBeenCalledWith('BTC-USD')
    expect(fetchKisQuote).not.toHaveBeenCalled()
  })
})
