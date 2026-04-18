import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/price/finnhub', () => ({ fetchFinnhubQuote: vi.fn() }))
vi.mock('@/lib/price/bok-fx', () => ({ fetchBokFxRate: vi.fn() }))
vi.mock('@/lib/price/kis', () => ({ fetchKisQuote: vi.fn() }))
vi.mock('@/lib/price/yahoo', () => ({ fetchYahooFxRate: vi.fn() }))
vi.mock('@/db/queries/price-cache', () => ({
  getPriceCacheByTicker: vi.fn(),
  upsertPriceCache: vi.fn(),
}))

describe('refreshPriceIfStale', () => {
  beforeEach(() => vi.clearAllMocks())

  it('skips API call when cache is within 5 minutes', async () => {
    const { getPriceCacheByTicker } = await import('@/db/queries/price-cache')
    const { fetchKisQuote } = await import('@/lib/price/kis')
    vi.mocked(getPriceCacheByTicker).mockResolvedValueOnce({
      id: 'test-uuid', ticker: 'AAPL', priceKrw: 250000, priceOriginal: 18543,
      currency: 'USD', changeBps: null, cachedAt: new Date(Date.now() - 60_000), // 1 min ago
    })
    const { refreshPriceIfStale } = await import('../cache')
    await refreshPriceIfStale('AAPL', 'stock_us')
    expect(fetchKisQuote).not.toHaveBeenCalled()
  })

  it('calls KIS and upserts when US stock cache is stale (> 5 minutes)', async () => {
    const { getPriceCacheByTicker, upsertPriceCache } = await import('@/db/queries/price-cache')
    const { fetchKisQuote } = await import('@/lib/price/kis')
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
    vi.mocked(fetchKisQuote).mockResolvedValueOnce({ price: 185.43, currency: 'USD', changePercent: 0.5 })
    const { refreshPriceIfStale } = await import('../cache')
    await refreshPriceIfStale('AAPL', 'stock_us')
    expect(fetchKisQuote).toHaveBeenCalledWith('AAPL', 'stock_us')
    expect(upsertPriceCache).toHaveBeenCalled()
  })

  it('keeps existing cache unchanged when KIS returns null for US stock (stale fallback — D-02)', async () => {
    const { getPriceCacheByTicker, upsertPriceCache } = await import('@/db/queries/price-cache')
    const { fetchKisQuote } = await import('@/lib/price/kis')
    vi.mocked(getPriceCacheByTicker).mockResolvedValueOnce({
      id: 'test-uuid', ticker: 'AAPL', priceKrw: 240000, priceOriginal: 18000,
      currency: 'USD', changeBps: null, cachedAt: new Date(Date.now() - 10 * 60_000),
    })
    vi.mocked(fetchKisQuote).mockResolvedValueOnce(null)
    const { refreshPriceIfStale } = await import('../cache')
    await refreshPriceIfStale('AAPL', 'stock_us')
    expect(upsertPriceCache).not.toHaveBeenCalled()
  })

  it('calls KIS and upserts when KR stock cache is stale (> 5 minutes)', async () => {
    const { getPriceCacheByTicker, upsertPriceCache } = await import('@/db/queries/price-cache')
    const { fetchKisQuote } = await import('@/lib/price/kis')
    vi.mocked(getPriceCacheByTicker).mockResolvedValueOnce({
      id: 'test-uuid-kr', ticker: '005930', priceKrw: 70000, priceOriginal: 70000,
      currency: 'KRW', changeBps: null, cachedAt: new Date(Date.now() - 10 * 60_000), // 10 min ago
    })
    vi.mocked(fetchKisQuote).mockResolvedValueOnce({ price: 75000, currency: 'KRW', changePercent: 1.5 })
    const { refreshPriceIfStale } = await import('../cache')
    await refreshPriceIfStale('005930', 'stock_kr')
    expect(fetchKisQuote).toHaveBeenCalledWith('005930', 'stock_kr')
    expect(upsertPriceCache).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: '005930', priceKrw: 75000, currency: 'KRW', changeBps: 150 }),
    )
  })

  it('calls Finnhub and upserts when crypto cache is stale (> 5 minutes)', async () => {
    const { getPriceCacheByTicker, upsertPriceCache } = await import('@/db/queries/price-cache')
    const { fetchFinnhubQuote } = await import('@/lib/price/finnhub')
    vi.mocked(getPriceCacheByTicker)
      .mockResolvedValueOnce({
        id: 'test-uuid-crypto', ticker: 'BINANCE:BTCUSDT', priceKrw: 90000000, priceOriginal: 6500000,
        currency: 'USD', changeBps: null, cachedAt: new Date(Date.now() - 10 * 60_000),
      })
      .mockResolvedValueOnce({
        id: 'test-uuid-fx', ticker: 'USD_KRW', priceKrw: 13565000, priceOriginal: 13565000,
        currency: 'KRW', changeBps: null, cachedAt: new Date(Date.now() - 30 * 60_000),
      })
    vi.mocked(fetchFinnhubQuote).mockResolvedValueOnce({ priceUsdCents: 6500000, changePercent: null })
    const { refreshPriceIfStale } = await import('../cache')
    await refreshPriceIfStale('BINANCE:BTCUSDT', 'crypto')
    expect(fetchFinnhubQuote).toHaveBeenCalledWith('BINANCE:BTCUSDT')
    expect(upsertPriceCache).toHaveBeenCalled()
  })
})

describe('refreshFxIfStale', () => {
  beforeEach(() => vi.clearAllMocks())

  it('skips API call when FX cache is within 1 hour', async () => {
    const { getPriceCacheByTicker } = await import('@/db/queries/price-cache')
    const { fetchBokFxRate } = await import('@/lib/price/bok-fx')
    vi.mocked(getPriceCacheByTicker).mockResolvedValueOnce({
      id: 'test-uuid-fx', ticker: 'USD_KRW', priceKrw: 13565000, priceOriginal: 13565000,
      currency: 'KRW', changeBps: null, cachedAt: new Date(Date.now() - 30 * 60_000), // 30 min ago
    })
    const { refreshFxIfStale } = await import('../cache')
    await refreshFxIfStale()
    expect(fetchBokFxRate).not.toHaveBeenCalled()
  })

  it('keeps existing cache when both BOK and Yahoo FX return null (stale fallback)', async () => {
    const { getPriceCacheByTicker, upsertPriceCache } = await import('@/db/queries/price-cache')
    const { fetchBokFxRate } = await import('@/lib/price/bok-fx')
    const { fetchYahooFxRate } = await import('@/lib/price/yahoo')
    vi.mocked(getPriceCacheByTicker).mockResolvedValueOnce({
      id: 'test-uuid-fx', ticker: 'USD_KRW', priceKrw: 13565000, priceOriginal: 13565000,
      currency: 'KRW', changeBps: null, cachedAt: new Date(Date.now() - 2 * 60 * 60_000), // 2 hours ago
    })
    vi.mocked(fetchBokFxRate).mockResolvedValueOnce(null)
    vi.mocked(fetchYahooFxRate).mockResolvedValueOnce(null)
    const { refreshFxIfStale } = await import('../cache')
    await refreshFxIfStale()
    expect(upsertPriceCache).not.toHaveBeenCalled()
  })
})
