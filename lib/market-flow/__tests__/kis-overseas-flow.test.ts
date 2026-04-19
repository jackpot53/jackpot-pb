import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/price/kis-token', () => ({
  getToken: vi.fn().mockResolvedValue('mock-token'),
  KisTokenError: class KisTokenError extends Error {},
}))

function makeMockResponse(ok: boolean, body: unknown): Response {
  return { ok, json: async () => body } as Response
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.KIS_APP_KEY = 'k'
  process.env.KIS_APP_SECRET = 's'
})

describe('fetchUsTrending', () => {
  it('parses overseas volume rank rows', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeMockResponse(true, {
      output2: [
        { symb: 'AAPL', name: '애플', ename: 'Apple Inc', rate: '+1.50' },
        { symb: 'TSLA', ename: 'Tesla Inc', rate: '-2.30' },
      ],
    })))

    const { fetchUsTrending } = await import('../kis-overseas-flow')
    const result = await fetchUsTrending()

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      code: 'AAPL',
      ticker: 'AAPL',
      name: 'Apple Inc',
      changePercent: 1.5,
      assetType: 'stock_us',
    })
    expect(result[1]).toMatchObject({
      code: 'TSLA',
      changePercent: -2.3,
    })
  })

  it('falls back to symb when name fields missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeMockResponse(true, {
      output2: [{ symb: 'NVDA' }],
    })))

    const { fetchUsTrending } = await import('../kis-overseas-flow')
    const result = await fetchUsTrending()

    expect(result[0].name).toBe('NVDA')
  })

  it('caps to 8 entries', async () => {
    const twelve = Array.from({ length: 12 }, (_, i) => ({
      symb: `T${i}`,
      ename: `Ticker ${i}`,
    }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeMockResponse(true, { output2: twelve })))

    const { fetchUsTrending } = await import('../kis-overseas-flow')
    const result = await fetchUsTrending()

    expect(result).toHaveLength(8)
  })

  it('returns empty on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeMockResponse(false, {})))

    const { fetchUsTrending } = await import('../kis-overseas-flow')
    const result = await fetchUsTrending()

    expect(result).toEqual([])
  })
})
