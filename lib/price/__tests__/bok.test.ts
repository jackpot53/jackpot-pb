import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchModule = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.stubGlobal('fetch', fetchModule.fetch)

// Set API key so tests reach the fetch logic (key is server-side only in production)
process.env.BOK_API_KEY = 'test-key'

describe('fetchBokFxRate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns rate × 10000 as integer when ECOS returns DATA_VALUE', async () => {
    fetchModule.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        StatisticSearch: { row: [{ DATA_VALUE: '1356.5' }] },
      }),
    })
    const { fetchBokFxRate } = await import('../bok-fx')
    const result = await fetchBokFxRate()
    expect(result).toBe(13565000) // 1356.5 * 10000
  })

  it('returns null when DATA_VALUE is missing', async () => {
    fetchModule.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ StatisticSearch: { row: [] } }),
    })
    const { fetchBokFxRate } = await import('../bok-fx')
    const result = await fetchBokFxRate()
    expect(result).toBeNull()
  })

  it('returns null when fetch is not ok', async () => {
    fetchModule.fetch.mockResolvedValueOnce({ ok: false })
    const { fetchBokFxRate } = await import('../bok-fx')
    const result = await fetchBokFxRate()
    expect(result).toBeNull()
  })
})
