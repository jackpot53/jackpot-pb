import { describe, it, expect, vi, beforeEach } from 'vitest'

// Source module does not exist yet — this import will fail (RED state)
// After Task 2 implements lib/price/finnhub.ts, this resolves
const fetchModule = vi.hoisted(() => ({
  fetch: vi.fn(),
}))
vi.stubGlobal('fetch', fetchModule.fetch)

describe('fetchFinnhubQuote', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns USD price in cents when Finnhub returns c > 0', async () => {
    fetchModule.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ c: 185.43, d: 1.2, dp: 0.65 }),
    })
    const { fetchFinnhubQuote } = await import('../finnhub')
    const result = await fetchFinnhubQuote('AAPL')
    expect(result).toBe(18543) // 185.43 * 100 rounded
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
