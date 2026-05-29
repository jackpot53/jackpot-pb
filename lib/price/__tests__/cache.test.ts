import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/price/yahoo', () => ({ fetchYahooQuote: vi.fn(), fetchYahooFxRate: vi.fn() }))
vi.mock('@/db/queries/price-cache', () => ({
  getPriceCacheByTicker: vi.fn(),
  upsertPriceCache: vi.fn(),
}))

describe('refreshPriceIfStale', () => {
  beforeEach(() => vi.clearAllMocks())

  it('skips API call when cache is within 5 minutes', async () => {
    const { getPriceCacheByTicker } = await import('@/db/queries/price-cache')
    const { fetchYahooQuote } = await import('@/lib/price/yahoo')
    vi.mocked(getPriceCacheByTicker).mockResolvedValueOnce({
      id: 'test-uuid', ticker: 'AAPL', priceKrw: 250000, priceOriginal: 18543,
      currency: 'USD', changeBps: null, cachedAt: new Date(Date.now() - 60_000), // 1 min ago
    })
    const { refreshPriceIfStale } = await import('../cache')
    await refreshPriceIfStale('AAPL', 'stock_us')
    expect(fetchYahooQuote).not.toHaveBeenCalled()
  })

  it('calls Yahoo and upserts when US stock cache is stale (> 5 minutes)', async () => {
    const { getPriceCacheByTicker, upsertPriceCache } = await import('@/db/queries/price-cache')
    const { fetchYahooQuote } = await import('@/lib/price/yahoo')
    // First call: stale AAPL cache; second call: USD_KRW FX cache for conversion
    vi.mocked(getPriceCacheByTicker)
      .mockResolvedValueOnce({
        id: 'test-uuid-1', ticker: 'AAPL', priceKrw: 240000, priceOriginal: 18000,
        currency: 'USD', changeBps: null, cachedAt: new Date(Date.now() - 10 * 60_000), // 10 min ago
      })
      .mockResolvedValueOnce({
        id: 'test-uuid-fx', ticker: 'USD_KRW', priceKrw: 13565000, priceOriginal: 13565000,
        currency: 'KRW', changeBps: null, cachedAt: new Date(Date.now() - 30 * 60_000),
      })
    vi.mocked(fetchYahooQuote).mockResolvedValueOnce({ price: 185.43, currency: 'USD', changePercent: 0.5 })
    const { refreshPriceIfStale } = await import('../cache')
    await refreshPriceIfStale('AAPL', 'stock_us')
    expect(fetchYahooQuote).toHaveBeenCalledWith('AAPL')
    expect(upsertPriceCache).toHaveBeenCalled()
  })

  it('keeps existing cache unchanged when Yahoo returns null for US stock (stale fallback — D-02)', async () => {
    const { getPriceCacheByTicker, upsertPriceCache } = await import('@/db/queries/price-cache')
    const { fetchYahooQuote } = await import('@/lib/price/yahoo')
    vi.mocked(getPriceCacheByTicker).mockResolvedValueOnce({
      id: 'test-uuid', ticker: 'AAPL', priceKrw: 240000, priceOriginal: 18000,
      currency: 'USD', changeBps: null, cachedAt: new Date(Date.now() - 10 * 60_000),
    })
    vi.mocked(fetchYahooQuote).mockResolvedValueOnce(null)
    const { refreshPriceIfStale } = await import('../cache')
    await refreshPriceIfStale('AAPL', 'stock_us')
    expect(upsertPriceCache).not.toHaveBeenCalled()
  })

  it('calls Yahoo and upserts when KR stock cache is stale (> 5 minutes)', async () => {
    const { getPriceCacheByTicker, upsertPriceCache } = await import('@/db/queries/price-cache')
    const { fetchYahooQuote } = await import('@/lib/price/yahoo')
    vi.mocked(getPriceCacheByTicker).mockResolvedValueOnce({
      id: 'test-uuid-kr', ticker: '005930.KS', priceKrw: 70000, priceOriginal: 70000,
      currency: 'KRW', changeBps: null, cachedAt: new Date(Date.now() - 10 * 60_000), // 10 min ago
    })
    vi.mocked(fetchYahooQuote).mockResolvedValueOnce({ price: 75000, currency: 'KRW', changePercent: 1.5 })
    const { refreshPriceIfStale } = await import('../cache')
    await refreshPriceIfStale('005930.KS', 'stock_kr')
    expect(fetchYahooQuote).toHaveBeenCalledWith('005930.KS')
    expect(upsertPriceCache).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: '005930.KS', priceKrw: 75000, currency: 'KRW', changeBps: 150 }),
    )
  })

  it('calls Yahoo and upserts when crypto cache is stale (> 5 minutes)', async () => {
    const { getPriceCacheByTicker, upsertPriceCache } = await import('@/db/queries/price-cache')
    const { fetchYahooQuote } = await import('@/lib/price/yahoo')
    vi.mocked(getPriceCacheByTicker)
      .mockResolvedValueOnce({
        id: 'test-uuid-crypto', ticker: 'BTC-USD', priceKrw: 90000000, priceOriginal: 6500000,
        currency: 'USD', changeBps: null, cachedAt: new Date(Date.now() - 10 * 60_000),
      })
      .mockResolvedValueOnce({
        id: 'test-uuid-fx', ticker: 'USD_KRW', priceKrw: 13565000, priceOriginal: 13565000,
        currency: 'KRW', changeBps: null, cachedAt: new Date(Date.now() - 30 * 60_000),
      })
    vi.mocked(fetchYahooQuote).mockResolvedValueOnce({ price: 65000, currency: 'USD', changePercent: null })
    const { refreshPriceIfStale } = await import('../cache')
    await refreshPriceIfStale('BTC-USD', 'crypto')
    expect(fetchYahooQuote).toHaveBeenCalledWith('BTC-USD')
    expect(upsertPriceCache).toHaveBeenCalled()
  })
})

describe('refreshFxIfStale', () => {
  beforeEach(() => vi.clearAllMocks())

  it('skips API call when FX cache is within 1 hour', async () => {
    const { getPriceCacheByTicker } = await import('@/db/queries/price-cache')
    const { fetchYahooFxRate } = await import('@/lib/price/yahoo')
    vi.mocked(getPriceCacheByTicker).mockResolvedValueOnce({
      id: 'test-uuid-fx', ticker: 'USD_KRW', priceKrw: 13565000, priceOriginal: 13565000,
      currency: 'KRW', changeBps: null, cachedAt: new Date(Date.now() - 30 * 60_000), // 30 min ago
    })
    const { refreshFxIfStale } = await import('../cache')
    await refreshFxIfStale()
    expect(fetchYahooFxRate).not.toHaveBeenCalled()
  })

  it('keeps existing cache when Yahoo FX returns null (stale fallback)', async () => {
    const { getPriceCacheByTicker, upsertPriceCache } = await import('@/db/queries/price-cache')
    const { fetchYahooFxRate } = await import('@/lib/price/yahoo')
    vi.mocked(getPriceCacheByTicker).mockResolvedValueOnce({
      id: 'test-uuid-fx', ticker: 'USD_KRW', priceKrw: 13565000, priceOriginal: 13565000,
      currency: 'KRW', changeBps: null, cachedAt: new Date(Date.now() - 2 * 60 * 60_000), // 2 hours ago
    })
    vi.mocked(fetchYahooFxRate).mockResolvedValueOnce(null)
    const { refreshFxIfStale } = await import('../cache')
    await refreshFxIfStale()
    expect(upsertPriceCache).not.toHaveBeenCalled()
  })

  it('calls Yahoo FX and upserts when FX cache is stale (> 1 hour)', async () => {
    const { getPriceCacheByTicker, upsertPriceCache } = await import('@/db/queries/price-cache')
    const { fetchYahooFxRate } = await import('@/lib/price/yahoo')
    vi.mocked(getPriceCacheByTicker).mockResolvedValueOnce({
      id: 'test-uuid-fx', ticker: 'USD_KRW', priceKrw: 13000000, priceOriginal: 13000000,
      currency: 'KRW', changeBps: null, cachedAt: new Date(Date.now() - 2 * 60 * 60_000), // 2 hours ago
    })
    vi.mocked(fetchYahooFxRate).mockResolvedValueOnce(13565000)
    const { refreshFxIfStale } = await import('../cache')
    await refreshFxIfStale()
    expect(fetchYahooFxRate).toHaveBeenCalled()
    expect(upsertPriceCache).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: 'USD_KRW', priceKrw: 13565000, currency: 'KRW' }),
    )
  })
})
