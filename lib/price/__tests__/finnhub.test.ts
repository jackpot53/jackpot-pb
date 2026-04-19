import { describe, it, expect, vi, beforeEach } from 'vitest'

// Source module does not exist yet — this import will fail (RED state)
// After Task 2 implements lib/price/finnhub.ts, this resolves
const fetchModule = vi.hoisted(() => ({
  fetch: vi.fn(),
}))
vi.stubGlobal('fetch', fetchModule.fetch)

// Set API key so tests reach the fetch logic (key is server-side only in production)
process.env.FINNHUB_API_KEY = 'test-key'

describe('fetchFinnhubQuote', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns USD price in cents when Finnhub returns c > 0', async () => {
    fetchModule.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ c: 185.43, d: 1.2, dp: 0.65 }),
    })
    const { fetchFinnhubQuote } = await import('../finnhub')
    const result = await fetchFinnhubQuote('AAPL')
    expect(result).toEqual({ priceUsdCents: 18543, changePercent: 0.65 })
  })

  it('returns null when Finnhub returns c = 0 (unknown ticker)', async () => {
    fetchModule.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ c: 0, d: 0, dp: 0 }),
    })
    const { fetchFinnhubQuote } = await import('../finnhub')
    const result = await fetchFinnhubQuote('005930.KS')
    expect(result).toBeNull()
  })

  it('returns null when fetch is not ok', async () => {
    fetchModule.fetch.mockResolvedValueOnce({ ok: false })
    const { fetchFinnhubQuote } = await import('../finnhub')
    const result = await fetchFinnhubQuote('AAPL')
    expect(result).toBeNull()
  })
})
