import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseKrTicker,
  isKrTicker,
  resolveUsTicker,
  EXCHANGE_CACHE,
} from '../kis-ticker'

const mockGetToken = vi.fn().mockResolvedValue('test-token')
const APP_KEY = 'test-app-key'
const APP_SECRET = 'test-app-secret'

function makeFetchMock(responses: Array<{ ok: boolean; json?: () => Promise<unknown> }>) {
  let call = 0
  return vi.fn().mockImplementation(() => {
    const res = responses[call++] ?? { ok: false }
    return Promise.resolve(res)
  })
}

beforeEach(() => {
  EXCHANGE_CACHE.clear()
  vi.clearAllMocks()
})

describe('parseKrTicker', () => {
  it('parses KOSPI ticker', () => {
    expect(parseKrTicker('005930.KS')).toEqual({ code: '005930', marketDiv: 'J' })
  })

  it('parses KOSDAQ ticker', () => {
    expect(parseKrTicker('000660.KQ')).toEqual({ code: '000660', marketDiv: 'J' })
  })

  it('returns null for US ticker', () => {
    expect(parseKrTicker('AAPL')).toBeNull()
  })

  it('returns null for 5-digit code', () => {
    expect(parseKrTicker('12345.KS')).toBeNull()
  })

  it('returns null for 7-digit code', () => {
    expect(parseKrTicker('1234567.KS')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseKrTicker('')).toBeNull()
  })
})

describe('isKrTicker', () => {
  it('returns true for KOSPI ticker', () => {
    expect(isKrTicker('005930.KS')).toBe(true)
  })

  it('returns true for KOSDAQ ticker', () => {
    expect(isKrTicker('069500.KQ')).toBe(true)
  })

  it('returns false for US ticker', () => {
    expect(isKrTicker('AAPL')).toBe(false)
  })

  it('returns false for crypto ticker', () => {
    expect(isKrTicker('BTC-USD')).toBe(false)
  })
})

describe('resolveUsTicker', () => {
  it('returns NAS for AAPL from KNOWN_EXCHANGE without API call', async () => {
    const mockFetch = vi.fn()
    const result = await resolveUsTicker('AAPL', mockGetToken, APP_KEY, APP_SECRET, mockFetch)
    expect(result).toEqual({ excd: 'NAS', symb: 'AAPL' })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns NYS for JPM from KNOWN_EXCHANGE without API call', async () => {
    const mockFetch = vi.fn()
    const result = await resolveUsTicker('JPM', mockGetToken, APP_KEY, APP_SECRET, mockFetch)
    expect(result).toEqual({ excd: 'NYS', symb: 'JPM' })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('probes NAS first and returns it on success for unknown ticker', async () => {
    const mockFetch = makeFetchMock([
      { ok: true, json: async () => ({ output: { last: '150.00' } }) },
    ])
    const result = await resolveUsTicker('UNKN', mockGetToken, APP_KEY, APP_SECRET, mockFetch)
    expect(result).toEqual({ excd: 'NAS', symb: 'UNKN' })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][0]).toContain('EXCD=NAS')
  })

  it('falls back to NYS if NAS probe fails', async () => {
    const mockFetch = makeFetchMock([
      { ok: true, json: async () => ({ output: { last: '0' } }) },
      { ok: true, json: async () => ({ output: { last: '95.50' } }) },
    ])
    const result = await resolveUsTicker('XYZ', mockGetToken, APP_KEY, APP_SECRET, mockFetch)
    expect(result).toEqual({ excd: 'NYS', symb: 'XYZ' })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('falls back to NAS if all probes fail', async () => {
    const mockFetch = makeFetchMock([
      { ok: false },
      { ok: false },
      { ok: false },
    ])
    const result = await resolveUsTicker('NOPE', mockGetToken, APP_KEY, APP_SECRET, mockFetch)
    expect(result).toEqual({ excd: 'NAS', symb: 'NOPE' })
  })

  it('caches result in EXCHANGE_CACHE after probe', async () => {
    const mockFetch = makeFetchMock([
      { ok: true, json: async () => ({ output: { last: '200.00' } }) },
    ])
    await resolveUsTicker('NEWT', mockGetToken, APP_KEY, APP_SECRET, mockFetch)
    expect(EXCHANGE_CACHE.get('NEWT')).toBe('NAS')

    const mockFetch2 = vi.fn()
    const result = await resolveUsTicker('NEWT', mockGetToken, APP_KEY, APP_SECRET, mockFetch2)
    expect(result).toEqual({ excd: 'NAS', symb: 'NEWT' })
    expect(mockFetch2).not.toHaveBeenCalled()
  })
})
