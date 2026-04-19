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

describe('fetchKrHotStocks', () => {
  it('parses volume rank rows and includes change percent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeMockResponse(true, {
      output: [
        { mksc_shrn_iscd: '005930', hts_kor_isnm: '삼성전자', prdy_ctrt: '+2.50' },
        { mksc_shrn_iscd: '069500', hts_kor_isnm: 'KODEX 200', prdy_ctrt: '-1.20' },
      ],
    })))

    const { fetchKrHotStocks } = await import('../kis-volume')
    const result = await fetchKrHotStocks()

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      code: '005930',
      ticker: '005930.KS',
      name: '삼성전자',
      changePercent: 2.5,
      assetType: 'stock_kr',
    })
    expect(result[1]).toMatchObject({
      code: '069500',
      ticker: '069500',
      assetType: 'etf_kr',
      changePercent: -1.2,
    })
  })

  it('caps to 10 entries', async () => {
    const fifteen = Array.from({ length: 15 }, (_, i) => ({
      mksc_shrn_iscd: String(i).padStart(6, '0'),
      hts_kor_isnm: `종목${i}`,
      prdy_ctrt: '0.0',
    }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeMockResponse(true, { output: fifteen })))

    const { fetchKrHotStocks } = await import('../kis-volume')
    const result = await fetchKrHotStocks()

    expect(result).toHaveLength(10)
  })

  it('returns empty array on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeMockResponse(false, {})))

    const { fetchKrHotStocks } = await import('../kis-volume')
    const result = await fetchKrHotStocks()

    expect(result).toEqual([])
  })
})
