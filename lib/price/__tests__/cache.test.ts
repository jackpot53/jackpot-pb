import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/price/finnhub', () => ({ fetchFinnhubQuote: vi.fn() }))
vi.mock('@/lib/price/bok-fx', () => ({ fetchBokFxRate: vi.fn() }))
vi.mock('@/db/queries/price-cache', () => ({
  getPriceCacheByTicker: vi.fn(),
  upsertPriceCache: vi.fn(),
}))

describe('refreshPriceIfStale', () => {
  beforeEach(() => vi.clearAllMocks())

  it('skips API call when cache is within 5 minutes', async () => {
    const { getPriceCacheByTicker } = await import('@/db/queries/price-cache')
    const { fetchFinnhubQuote } = await import('@/lib/price/finnhub')
    vi.mocked(getPriceCacheByTicker).mockResolvedValueOnce({
      ticker: 'AAPL', priceKrw: 250000, priceOriginal: 18543,
      currency: 'USD', cachedAt: new Date(Date.now() - 60_000), // 1 min ago
    })
    const { refreshPriceIfStale } = await import('../cache')
    await refreshPriceIfStale('AAPL', 'stock_us')
    expect(fetchFinnhubQuote).not.toHaveBeenCalled()
  })

  it('calls API and upserts when cache is stale (> 5 minutes)', async () => {
    const { getPriceCacheByTicker, upsertPriceCache } = await import('@/db/queries/price-cache')
    const { fetchFinnhubQuote } = await import('@/lib/price/finnhub')
    // First call: stale AAPL cache; second call: USD_KRW FX cache for conversion
    vi.mocked(getPriceCacheByTicker)
      .mockResolvedValueOnce({
        ticker: 'AAPL', priceKrw: 240000, priceOriginal: 18000,
        currency: 'USD', cachedAt: new Date(Date.now() - 10 * 60_000), // 10 min ago
      })
      .mockResolvedValueOnce({
        ticker: 'USD_KRW', priceKrw: 13565000, priceOriginal: 13565000,
        currency: 'KRW', cachedAt: new Date(Date.now() - 30 * 60_000),
      })
    vi.mocked(fetchFinnhubQuote).mockResolvedValueOnce(18543)
    const { refreshPriceIfStale } = await import('../cache')
    await refreshPriceIfStale('AAPL', 'stock_us')
    expect(fetchFinnhubQuote).toHaveBeenCalledWith('AAPL')
    expect(upsertPriceCache).toHaveBeenCalled()
  })

  it('keeps existing cache unchanged when API returns null (stale fallback — D-02)', async () => {
    const { getPriceCacheByTicker, upsertPriceCache } = await import('@/db/queries/price-cache')
    const { fetchFinnhubQuote } = await import('@/lib/price/finnhub')
    vi.mocked(getPriceCacheByTicker).mockResolvedValueOnce({
      ticker: 'AAPL', priceKrw: 240000, priceOriginal: 18000,
      currency: 'USD', cachedAt: new Date(Date.now() - 10 * 60_000),
    })
    vi.mocked(fetchFinnhubQuote).mockResolvedValueOnce(null)
    const { refreshPriceIfStale } = await import('../cache')
    await refreshPriceIfStale('AAPL', 'stock_us')
    expect(upsertPriceCache).not.toHaveBeenCalled()
  })
})

describe('refreshFxIfStale', () => {
  beforeEach(() => vi.clearAllMocks())

  it('skips API call when FX cache is within 1 hour', async () => {
    const { getPriceCacheByTicker } = await import('@/db/queries/price-cache')
    const { fetchBokFxRate } = await import('@/lib/price/bok-fx')
    vi.mocked(getPriceCacheByTicker).mockResolvedValueOnce({
      ticker: 'USD_KRW', priceKrw: 13565000, priceOriginal: 13565000,
      currency: 'KRW', cachedAt: new Date(Date.now() - 30 * 60_000), // 30 min ago
    })
    const { refreshFxIfStale } = await import('../cache')
    await refreshFxIfStale()
    expect(fetchBokFxRate).not.toHaveBeenCalled()
  })

  it('keeps existing cache when fetchBokFxRate returns null (stale fallback)', async () => {
    const { getPriceCacheByTicker, upsertPriceCache } = await import('@/db/queries/price-cache')
    const { fetchBokFxRate } = await import('@/lib/price/bok-fx')
    vi.mocked(getPriceCacheByTicker).mockResolvedValueOnce({
      ticker: 'USD_KRW', priceKrw: 13565000, priceOriginal: 13565000,
      currency: 'KRW', cachedAt: new Date(Date.now() - 2 * 60 * 60_000), // 2 hours ago
    })
    vi.mocked(fetchBokFxRate).mockResolvedValueOnce(null)
    const { refreshFxIfStale } = await import('../cache')
    await refreshFxIfStale()
    expect(upsertPriceCache).not.toHaveBeenCalled()
  })
})
