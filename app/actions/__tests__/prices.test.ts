import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks must be hoisted before importing the module under test.

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/perf', () => ({ timed: <T,>(_label: string, fn: () => T): T => fn() }))
vi.mock('@/lib/price/cache', () => ({ refreshFxIfStale: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/price/funetf', () => ({ fetchFunetfNav: vi.fn() }))
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
  it('routes KR stocks/ETFs to Yahoo', async () => {
    const { fetchYahooQuote } = await import('@/lib/price/yahoo')
    const { getPriceCacheByTickers, upsertPriceCache } = await import('@/db/queries/price-cache')

    let callCount = 0
    const dbMod = await import('@/db')
    vi.spyOn(dbMod.db, 'select').mockImplementation(((...args: unknown[]) => {
      void args
      return {
        from: vi.fn(() => {
          callCount++
          if (callCount === 1) return Promise.resolve([{ maxCachedAt: null }])
          return { where: vi.fn().mockResolvedValue([{ ticker: '005930.KS', assetType: 'stock_kr' }]) }
        }),
      }
    }) as never)

    vi.mocked(getPriceCacheByTickers).mockResolvedValue(
      new Map([
        ['USD_KRW', {
          id: 'fx', ticker: 'USD_KRW', priceKrw: 13565000, priceOriginal: 13565000,
          currency: 'KRW', changeBps: null, cachedAt: new Date(Date.now() - 30 * 60_000),
        }],
      ]),
    )
    vi.mocked(fetchYahooQuote).mockResolvedValue({ price: 75000, currency: 'KRW', changePercent: 1.5 })

    const { refreshAllPricesInternal } = await import('../prices')
    await refreshAllPricesInternal()

    expect(fetchYahooQuote).toHaveBeenCalledWith('005930.KS')
    expect(upsertPriceCache).toHaveBeenCalledWith(expect.objectContaining({
      ticker: '005930.KS',
      currency: 'KRW',
    }))
  })

  it('routes US stocks/ETFs to Yahoo', async () => {
    const { fetchYahooQuote } = await import('@/lib/price/yahoo')
    const { getPriceCacheByTickers, upsertPriceCache } = await import('@/db/queries/price-cache')

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
    vi.mocked(fetchYahooQuote).mockResolvedValue({ price: 185.43, currency: 'USD', changePercent: 0.5 })

    const { refreshAllPricesInternal } = await import('../prices')
    await refreshAllPricesInternal()

    expect(fetchYahooQuote).toHaveBeenCalledWith('AAPL')
    expect(upsertPriceCache).toHaveBeenCalledWith(expect.objectContaining({
      ticker: 'AAPL',
      currency: 'USD',
    }))
  })

  it('routes crypto to Yahoo', async () => {
    const { fetchYahooQuote } = await import('@/lib/price/yahoo')
    const { getPriceCacheByTickers, upsertPriceCache } = await import('@/db/queries/price-cache')

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
    expect(upsertPriceCache).toHaveBeenCalledWith(expect.objectContaining({
      ticker: 'BTC-USD',
      currency: 'USD',
    }))
  })

  it('skips refresh when dedup guard is active (recent cache)', async () => {
    const { refreshFxIfStale } = await import('@/lib/price/cache')

    const dbMod = await import('@/db')
    vi.spyOn(dbMod.db, 'select').mockImplementation((() => ({
      from: vi.fn(() => Promise.resolve([{ maxCachedAt: new Date(Date.now() - 1000) }])),
    })) as never)

    const { refreshAllPricesInternal } = await import('../prices')
    await refreshAllPricesInternal()

    // Should bail out before touching FX or assets
    expect(refreshFxIfStale).not.toHaveBeenCalled()
  })

  it('skips stale ticker when all caches are fresh', async () => {
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

    // Cache is fresh (30 seconds ago — well within 5-min TTL)
    vi.mocked(getPriceCacheByTickers).mockResolvedValue(
      new Map([
        ['AAPL', {
          id: '1', ticker: 'AAPL', priceKrw: 250000, priceOriginal: 18500,
          currency: 'USD', changeBps: 50, cachedAt: new Date(Date.now() - 30_000),
        }],
        ['USD_KRW', {
          id: 'fx', ticker: 'USD_KRW', priceKrw: 13565000, priceOriginal: 13565000,
          currency: 'KRW', changeBps: null, cachedAt: new Date(Date.now() - 30_000),
        }],
      ]),
    )

    const { refreshAllPricesInternal } = await import('../prices')
    await refreshAllPricesInternal()

    expect(fetchYahooQuote).not.toHaveBeenCalled()
  })

  it('routes fund assets to fetchFunetfNav', async () => {
    const { fetchFunetfNav } = await import('@/lib/price/funetf')
    const { fetchYahooQuote } = await import('@/lib/price/yahoo')
    const { getPriceCacheByTickers } = await import('@/db/queries/price-cache')

    let callCount = 0
    const dbMod = await import('@/db')
    vi.spyOn(dbMod.db, 'select').mockImplementation((() => ({
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return Promise.resolve([{ maxCachedAt: null }])
        return { where: vi.fn().mockResolvedValue([{ ticker: 'KR123456', assetType: 'fund' }]) }
      }),
    })) as never)

    vi.mocked(getPriceCacheByTickers).mockResolvedValue(new Map())
    vi.mocked(fetchFunetfNav).mockResolvedValue({ price: 12345, changePercent: 0.3 })

    const { refreshAllPricesInternal } = await import('../prices')
    await refreshAllPricesInternal()

    expect(fetchFunetfNav).toHaveBeenCalledWith('KR123456')
    expect(fetchYahooQuote).not.toHaveBeenCalled()
  })
})
