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

describe('fetchKrInvestorFlow', () => {
  it('parses foreign net buy ranking from FHPTJ04400000', async () => {
    const fetchSpy = vi.fn()
    fetchSpy.mockResolvedValueOnce(makeMockResponse(true, {
      output: [
        { mksc_shrn_iscd: '005930', hts_kor_isnm: '삼성전자', frgn_ntby_tr_pbmn: '1500000' },
        { mksc_shrn_iscd: '000660', hts_kor_isnm: 'SK하이닉스', frgn_ntby_tr_pbmn: '800000' },
      ],
    }))
    fetchSpy.mockResolvedValueOnce(makeMockResponse(true, {
      output: [
        { mksc_shrn_iscd: '035720', hts_kor_isnm: '카카오', orgn_ntby_tr_pbmn: '500000' },
      ],
    }))
    vi.stubGlobal('fetch', fetchSpy)

    const { fetchKrInvestorFlow } = await import('../kis-investor')
    const result = await fetchKrInvestorFlow()

    expect(result.foreign).toHaveLength(2)
    expect(result.foreign[0]).toMatchObject({
      code: '005930',
      ticker: '005930.KS',
      name: '삼성전자',
      netAmount: 1500000,
      assetType: 'stock_kr',
    })
    expect(result.institutional).toHaveLength(1)
    expect(result.institutional[0]).toMatchObject({
      code: '035720',
      name: '카카오',
      netAmount: 500000,
    })
  })

  it('detects ETF asset type from name prefix', async () => {
    const fetchSpy = vi.fn()
    fetchSpy.mockResolvedValueOnce(makeMockResponse(true, {
      output: [
        { mksc_shrn_iscd: '069500', hts_kor_isnm: 'KODEX 200', frgn_ntby_tr_pbmn: '300000' },
      ],
    }))
    fetchSpy.mockResolvedValueOnce(makeMockResponse(true, { output: [] }))
    vi.stubGlobal('fetch', fetchSpy)

    const { fetchKrInvestorFlow } = await import('../kis-investor')
    const result = await fetchKrInvestorFlow()

    expect(result.foreign[0]).toMatchObject({
      ticker: '069500',  // ETF — no .KS suffix
      assetType: 'etf_kr',
    })
  })

  it('caps to 5 entries each', async () => {
    const ten = Array.from({ length: 10 }, (_, i) => ({
      mksc_shrn_iscd: String(i).padStart(6, '0'),
      hts_kor_isnm: `종목${i}`,
      frgn_ntby_tr_pbmn: String(1000 - i * 100),
    }))
    const fetchSpy = vi.fn()
    fetchSpy.mockResolvedValueOnce(makeMockResponse(true, { output: ten }))
    fetchSpy.mockResolvedValueOnce(makeMockResponse(true, { output: [] }))
    vi.stubGlobal('fetch', fetchSpy)

    const { fetchKrInvestorFlow } = await import('../kis-investor')
    const result = await fetchKrInvestorFlow()

    expect(result.foreign).toHaveLength(5)
  })

  it('returns empty arrays on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeMockResponse(false, {})))

    const { fetchKrInvestorFlow } = await import('../kis-investor')
    const result = await fetchKrInvestorFlow()

    expect(result.foreign).toEqual([])
    expect(result.institutional).toEqual([])
  })
})
