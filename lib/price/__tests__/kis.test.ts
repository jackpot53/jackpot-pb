import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchKisQuote, fetchKisOhlc } from '../kis'

// Mock kis-token module
vi.mock('@/lib/price/kis-token', () => ({
  getToken: vi.fn().mockResolvedValue('mock-token'),
  KisTokenError: class KisTokenError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'KisTokenError'
    }
  },
}))

// Mock kis-ticker module
vi.mock('@/lib/price/kis-ticker', () => ({
  parseKrTicker: vi.fn((ticker: string) => {
    const match = /^(\d{6})\.(KS|KQ)$/.exec(ticker)
    if (!match) return null
    return { code: match[1], marketDiv: 'J' }
  }),
  resolveUsTicker: vi.fn().mockResolvedValue({ excd: 'NAS', symb: 'AAPL' }),
  isKrTicker: vi.fn(),
}))

function makeMockResponse(ok: boolean, body: unknown): Response {
  return {
    ok,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.KIS_APP_KEY = 'test-app-key'
  process.env.KIS_APP_SECRET = 'test-app-secret'
})

// fetchKisQuote

describe('fetchKisQuote — KR stock', () => {
  it('parses stck_prpr and prdy_ctrt correctly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeMockResponse(true, {
        output: { stck_prpr: '75000', prdy_ctrt: '-1.32' },
      }),
    ))

    const result = await fetchKisQuote('005930.KS', 'stock_kr')

    expect(result).toEqual({ price: 75000, currency: 'KRW', changePercent: -1.32 })
  })

  it('returns null if price is 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeMockResponse(true, {
        output: { stck_prpr: '0', prdy_ctrt: '0.00' },
      }),
    ))

    const result = await fetchKisQuote('005930.KS', 'stock_kr')

    expect(result).toBeNull()
  })

  it('returns null on non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeMockResponse(false, {}),
    ))

    const result = await fetchKisQuote('005930.KS', 'stock_kr')

    expect(result).toBeNull()
  })
})

describe('fetchKisQuote — US stock', () => {
  it('parses last and diff_rate correctly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeMockResponse(true, {
        output: { last: '189.50', diff_rate: '0.75' },
      }),
    ))

    const result = await fetchKisQuote('AAPL', 'stock_us')

    expect(result).toEqual({ price: 189.5, currency: 'USD', changePercent: 0.75 })
  })

  it('falls back to rate field when diff_rate is absent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeMockResponse(true, {
        output: { last: '450.00', rate: '1.23' },
      }),
    ))

    const result = await fetchKisQuote('NVDA', 'stock_us')

    expect(result).toEqual({ price: 450, currency: 'USD', changePercent: 1.23 })
  })
})

describe('fetchKisQuote — other cases', () => {
  it('returns null for unsupported assetType', async () => {
    vi.stubGlobal('fetch', vi.fn())

    const result = await fetchKisQuote('BTC-USD', 'crypto')

    expect(result).toBeNull()
  })

  it('returns null on thrown error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network failure')))

    const result = await fetchKisQuote('005930.KS', 'stock_kr')

    expect(result).toBeNull()
  })
})

// fetchKisOhlc

describe('fetchKisOhlc — KR', () => {
  it('parses output2 correctly and sorts ascending', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeMockResponse(true, {
        output2: [
          // KIS returns reverse chronological order
          { stck_bsop_date: '20230103', stck_oprc: '74500', stck_hgpr: '75200', stck_lwpr: '74100', stck_clpr: '75000' },
          { stck_bsop_date: '20230102', stck_oprc: '73800', stck_hgpr: '74600', stck_lwpr: '73500', stck_clpr: '74500' },
          { stck_bsop_date: '20230101', stck_oprc: '73000', stck_hgpr: '73900', stck_lwpr: '72800', stck_clpr: '73800' },
        ],
      }),
    ))

    const result = await fetchKisOhlc('005930.KS', 'stock_kr', '2023-01-01', '2023-01-03')

    expect(result).toEqual([
      { date: '2023-01-01', open: 73000, high: 73900, low: 72800, close: 73800 },
      { date: '2023-01-02', open: 73800, high: 74600, low: 73500, close: 74500 },
      { date: '2023-01-03', open: 74500, high: 75200, low: 74100, close: 75000 },
    ])
  })

  it('skips items where any price is 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeMockResponse(true, {
        output2: [
          { stck_bsop_date: '20230102', stck_oprc: '74500', stck_hgpr: '75200', stck_lwpr: '74100', stck_clpr: '75000' },
          // zero price entry — should be skipped
          { stck_bsop_date: '20230101', stck_oprc: '0', stck_hgpr: '0', stck_lwpr: '0', stck_clpr: '0' },
        ],
      }),
    ))

    const result = await fetchKisOhlc('005930.KS', 'stock_kr', '2023-01-01', '2023-01-02')

    // Only one valid point — should return null (< 2 points)
    expect(result).toBeNull()
  })
})

describe('fetchKisOhlc — US', () => {
  it('parses output2 correctly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeMockResponse(true, {
        output2: [
          { xymd: '20230103', open: '130.28', high: '130.90', low: '124.17', clos: '125.07' },
          { xymd: '20230104', open: '126.89', high: '128.66', low: '125.08', clos: '126.36' },
        ],
      }),
    ))

    const result = await fetchKisOhlc('AAPL', 'stock_us', '2023-01-03', '2023-01-04')

    expect(result).toEqual([
      { date: '2023-01-03', open: 130.28, high: 130.9, low: 124.17, close: 125.07 },
      { date: '2023-01-04', open: 126.89, high: 128.66, low: 125.08, close: 126.36 },
    ])
  })
})

describe('fetchKisOhlc — empty result', () => {
  it('returns null for empty output2', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeMockResponse(true, { output2: [] }),
    ))

    const result = await fetchKisOhlc('005930.KS', 'stock_kr', '2023-01-01', '2023-01-03')

    expect(result).toBeNull()
  })

  it('returns null for unsupported assetType', async () => {
    vi.stubGlobal('fetch', vi.fn())

    const result = await fetchKisOhlc('BTC-USD', 'crypto', '2023-01-01', '2023-01-03')

    expect(result).toBeNull()
  })
})
