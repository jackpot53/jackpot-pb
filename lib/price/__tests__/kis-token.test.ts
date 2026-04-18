import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/db/queries/kis-token', () => ({
  getKisToken: vi.fn(),
  upsertKisToken: vi.fn(),
}))

describe('getToken', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    process.env.KIS_APP_KEY = 'test-app-key'
    process.env.KIS_APP_SECRET = 'test-app-secret'

    // Reset module-level token cache before each test
    const { clearTokenCache } = await import('../kis-token')
    clearTokenCache()
  })

  it('throws KisTokenError if KIS_APP_KEY is missing', async () => {
    delete process.env.KIS_APP_KEY
    const { getToken, KisTokenError } = await import('../kis-token')
    await expect(getToken()).rejects.toBeInstanceOf(KisTokenError)
  })

  it('throws KisTokenError if KIS_APP_SECRET is missing', async () => {
    delete process.env.KIS_APP_SECRET
    const { getToken, KisTokenError } = await import('../kis-token')
    await expect(getToken()).rejects.toBeInstanceOf(KisTokenError)
  })

  it('returns cached token if in-memory cache is fresh (> 60 min remaining)', async () => {
    const { getToken, clearTokenCache } = await import('../kis-token')
    const { getKisToken } = await import('@/db/queries/kis-token')

    // Prime the in-memory cache by having a fresh DB token on first call
    const freshExpiry = new Date(Date.now() + 3 * 60 * 60 * 1000) // 3 hours from now
    vi.mocked(getKisToken).mockResolvedValueOnce({ tokenValue: 'cached-token', expiresAt: freshExpiry })

    await getToken() // populates in-memory cache
    vi.mocked(getKisToken).mockClear()

    // Second call should use in-memory cache
    const token = await getToken()
    expect(token).toBe('cached-token')
  })

  it('skips DB call if in-memory cache is fresh', async () => {
    const { getToken } = await import('../kis-token')
    const { getKisToken } = await import('@/db/queries/kis-token')

    // Prime the cache
    const freshExpiry = new Date(Date.now() + 3 * 60 * 60 * 1000)
    vi.mocked(getKisToken).mockResolvedValueOnce({ tokenValue: 'cached-token', expiresAt: freshExpiry })
    await getToken()
    vi.mocked(getKisToken).mockClear()

    // Second call should NOT hit DB
    await getToken()
    expect(getKisToken).not.toHaveBeenCalled()
  })

  it('returns DB token if in-memory cache is null but DB token is fresh', async () => {
    const { getToken } = await import('../kis-token')
    const { getKisToken } = await import('@/db/queries/kis-token')

    const freshExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
    vi.mocked(getKisToken).mockResolvedValueOnce({ tokenValue: 'db-token', expiresAt: freshExpiry })

    const token = await getToken()
    expect(token).toBe('db-token')
    expect(getKisToken).toHaveBeenCalledTimes(1)
  })

  it('calls KIS API to refresh if DB token expires within 60 minutes', async () => {
    const { getToken } = await import('../kis-token')
    const { getKisToken, upsertKisToken } = await import('@/db/queries/kis-token')

    // DB token expires in 30 min (within buffer)
    const staleExpiry = new Date(Date.now() + 30 * 60 * 1000)
    vi.mocked(getKisToken).mockResolvedValueOnce({ tokenValue: 'stale-token', expiresAt: staleExpiry })
    vi.mocked(upsertKisToken).mockResolvedValue(undefined)

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'new-token', expires_in: 86400 }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const token = await getToken()
    expect(token).toBe('new-token')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://openapi.koreainvestment.com:9443/oauth2/tokenP',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('calls KIS API to refresh if DB returns null', async () => {
    const { getToken } = await import('../kis-token')
    const { getKisToken, upsertKisToken } = await import('@/db/queries/kis-token')

    vi.mocked(getKisToken).mockResolvedValueOnce(null)
    vi.mocked(upsertKisToken).mockResolvedValue(undefined)

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'fresh-token', expires_in: 86400 }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const token = await getToken()
    expect(token).toBe('fresh-token')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('persists new token to DB on refresh (calls upsertKisToken)', async () => {
    const { getToken } = await import('../kis-token')
    const { getKisToken, upsertKisToken } = await import('@/db/queries/kis-token')

    vi.mocked(getKisToken).mockResolvedValueOnce(null)
    vi.mocked(upsertKisToken).mockResolvedValue(undefined)

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'persisted-token', expires_in: 86400 }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await getToken()
    expect(upsertKisToken).toHaveBeenCalledWith('persisted-token', expect.any(Date))
  })

  it('throws KisTokenError if refresh fetch fails (non-2xx)', async () => {
    const { getToken, KisTokenError } = await import('../kis-token')
    const { getKisToken } = await import('@/db/queries/kis-token')

    vi.mocked(getKisToken).mockResolvedValueOnce(null)

    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 401 })
    vi.stubGlobal('fetch', mockFetch)

    await expect(getToken()).rejects.toBeInstanceOf(KisTokenError)
  })

  it('throws KisTokenError if fetch rejects (network error)', async () => {
    const { getToken, KisTokenError } = await import('../kis-token')
    const { getKisToken } = await import('@/db/queries/kis-token')

    vi.mocked(getKisToken).mockResolvedValueOnce(null)

    const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    vi.stubGlobal('fetch', mockFetch)

    await expect(getToken()).rejects.toBeInstanceOf(KisTokenError)
  })

  it('throws KisTokenError if refresh response has no access_token', async () => {
    const { getToken, KisTokenError } = await import('../kis-token')
    const { getKisToken, upsertKisToken } = await import('@/db/queries/kis-token')

    vi.mocked(getKisToken).mockResolvedValueOnce(null)
    vi.mocked(upsertKisToken).mockResolvedValue(undefined)

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ expires_in: 86400 }), // no access_token
    })
    vi.stubGlobal('fetch', mockFetch)

    await expect(getToken()).rejects.toBeInstanceOf(KisTokenError)
  })
})
