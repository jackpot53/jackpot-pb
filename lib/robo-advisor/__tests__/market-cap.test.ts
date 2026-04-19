import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/price/kis', () => ({ fetchKisMarketCap: vi.fn() }))
vi.mock('@/db/queries/robo-advisor', () => ({
  getUniverse: vi.fn(),
  updateUniverseMarketCap: vi.fn().mockResolvedValue(undefined),
  refreshUniverseRanks: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => vi.clearAllMocks())

describe('fetchMarketCaps', () => {
  it('returns empty Map for empty input', async () => {
    const { fetchMarketCaps } = await import('../market-cap')
    const result = await fetchMarketCaps([])
    expect(result.size).toBe(0)
  })

  it('maps ticker→marketCapKrw for successful KIS fetches', async () => {
    const { fetchKisMarketCap } = await import('@/lib/price/kis')
    vi.mocked(fetchKisMarketCap)
      .mockResolvedValueOnce(507_850_000_000_000) // Samsung
      .mockResolvedValueOnce(80_000_000_000_000) // SK Hynix
    const { fetchMarketCaps } = await import('../market-cap')
    const result = await fetchMarketCaps(['005930.KS', '000660.KS'])
    expect(result.get('005930.KS')).toBe(507_850_000_000_000)
    expect(result.get('000660.KS')).toBe(80_000_000_000_000)
  })

  it('omits failed tickers from result (preserve mode)', async () => {
    const { fetchKisMarketCap } = await import('@/lib/price/kis')
    vi.mocked(fetchKisMarketCap)
      .mockResolvedValueOnce(507_850_000_000_000)
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('boom'))
    const { fetchMarketCaps } = await import('../market-cap')
    const result = await fetchMarketCaps(['005930.KS', 'BAD.KS', 'ERR.KS'])
    expect(result.size).toBe(1)
    expect(result.get('005930.KS')).toBe(507_850_000_000_000)
    expect(result.has('BAD.KS')).toBe(false)
    expect(result.has('ERR.KS')).toBe(false)
  })

  it('rejects non-positive market caps', async () => {
    const { fetchKisMarketCap } = await import('@/lib/price/kis')
    vi.mocked(fetchKisMarketCap).mockResolvedValueOnce(0)
    const { fetchMarketCaps } = await import('../market-cap')
    const result = await fetchMarketCaps(['ZERO.KS'])
    expect(result.size).toBe(0)
  })
})

describe('updateUniverseRanks', () => {
  it('updates only successfully fetched market caps and refreshes ranks', async () => {
    const { getUniverse, updateUniverseMarketCap, refreshUniverseRanks } = await import('@/db/queries/robo-advisor')
    const { fetchKisMarketCap } = await import('@/lib/price/kis')

    vi.mocked(getUniverse).mockResolvedValue([
      { id: '1', ticker: '005930.KS', code: '005930', name: 'Samsung', market: 'KOSPI', sector: null, marketCapKrw: 0, rank: 1, isActive: true, updatedAt: new Date() },
      { id: '2', ticker: 'BAD.KS', code: 'BAD000', name: 'Bad', market: 'KOSPI', sector: null, marketCapKrw: 0, rank: 99, isActive: true, updatedAt: new Date() },
    ] as never)

    vi.mocked(fetchKisMarketCap)
      .mockResolvedValueOnce(507_850_000_000_000)
      .mockResolvedValueOnce(null)

    const { updateUniverseRanks } = await import('../market-cap')
    await updateUniverseRanks()

    expect(updateUniverseMarketCap).toHaveBeenCalledTimes(1)
    expect(updateUniverseMarketCap).toHaveBeenCalledWith('005930.KS', 507_850_000_000_000)
    expect(refreshUniverseRanks).toHaveBeenCalledOnce()
  })

  it('still refreshes ranks when no fetches succeed (preserve mode)', async () => {
    const { getUniverse, updateUniverseMarketCap, refreshUniverseRanks } = await import('@/db/queries/robo-advisor')
    const { fetchKisMarketCap } = await import('@/lib/price/kis')

    vi.mocked(getUniverse).mockResolvedValue([
      { id: '1', ticker: 'X.KS', code: 'X', name: 'X', market: 'KOSPI', sector: null, marketCapKrw: 0, rank: 1, isActive: true, updatedAt: new Date() },
    ] as never)
    vi.mocked(fetchKisMarketCap).mockResolvedValue(null)

    const { updateUniverseRanks } = await import('../market-cap')
    await updateUniverseRanks()

    expect(updateUniverseMarketCap).not.toHaveBeenCalled()
    expect(refreshUniverseRanks).toHaveBeenCalledOnce()
  })
})
