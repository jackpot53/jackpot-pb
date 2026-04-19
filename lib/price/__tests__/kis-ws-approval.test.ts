import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/db/queries/kis-ws-approval', () => ({
  getKisApproval: vi.fn(),
  upsertKisApproval: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(async () => {
  vi.clearAllMocks()
  process.env.KIS_APP_KEY = 'k'
  process.env.KIS_APP_SECRET = 's'
  const mod = await import('../kis-ws-approval')
  mod.clearApprovalCache()
})

function makeMockResponse(ok: boolean, body: unknown, status = 200): Response {
  return { ok, status, json: async () => body } as Response
}

describe('getApprovalKey', () => {
  it('returns DB-cached key when not near expiry', async () => {
    const { getKisApproval } = await import('@/db/queries/kis-ws-approval')
    const future = new Date(Date.now() + 12 * 60 * 60 * 1000)
    vi.mocked(getKisApproval).mockResolvedValueOnce({ approvalKey: 'cached-key', expiresAt: future })
    vi.stubGlobal('fetch', vi.fn())

    const { getApprovalKey } = await import('../kis-ws-approval')
    const result = await getApprovalKey()

    expect(result.approvalKey).toBe('cached-key')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('refreshes when DB cache is near expiry', async () => {
    const { getKisApproval, upsertKisApproval } = await import('@/db/queries/kis-ws-approval')
    const nearExpiry = new Date(Date.now() + 5 * 60 * 1000) // 5 min from now
    vi.mocked(getKisApproval).mockResolvedValueOnce({ approvalKey: 'old-key', expiresAt: nearExpiry })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeMockResponse(true, { approval_key: 'fresh-key' }),
    ))

    const { getApprovalKey } = await import('../kis-ws-approval')
    const result = await getApprovalKey()

    expect(result.approvalKey).toBe('fresh-key')
    expect(upsertKisApproval).toHaveBeenCalledWith('fresh-key', expect.any(Date))
  })

  it('uses secretkey field (not appsecret) in body', async () => {
    const { getKisApproval } = await import('@/db/queries/kis-ws-approval')
    vi.mocked(getKisApproval).mockResolvedValueOnce(null)
    const fetchSpy = vi.fn().mockResolvedValue(
      makeMockResponse(true, { approval_key: 'k' }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    const { getApprovalKey } = await import('../kis-ws-approval')
    await getApprovalKey()

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(body).toEqual({
      grant_type: 'client_credentials',
      appkey: 'k',
      secretkey: 's',
    })
  })

  it('throws KisApprovalError on missing approval_key in response', async () => {
    const { getKisApproval } = await import('@/db/queries/kis-ws-approval')
    vi.mocked(getKisApproval).mockResolvedValueOnce(null)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeMockResponse(true, {})))

    const { getApprovalKey, KisApprovalError } = await import('../kis-ws-approval')
    await expect(getApprovalKey()).rejects.toThrow(KisApprovalError)
  })

  it('throws KisApprovalError on non-OK HTTP', async () => {
    const { getKisApproval } = await import('@/db/queries/kis-ws-approval')
    vi.mocked(getKisApproval).mockResolvedValueOnce(null)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeMockResponse(false, {}, 500)))

    const { getApprovalKey, KisApprovalError } = await import('../kis-ws-approval')
    await expect(getApprovalKey()).rejects.toThrow(KisApprovalError)
  })

  it('throws when KIS_APP_KEY is missing', async () => {
    delete process.env.KIS_APP_KEY
    const { getApprovalKey, KisApprovalError } = await import('../kis-ws-approval')
    await expect(getApprovalKey()).rejects.toThrow(KisApprovalError)
  })
})
