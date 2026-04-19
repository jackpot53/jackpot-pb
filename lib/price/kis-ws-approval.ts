import { getKisApproval, upsertKisApproval } from '@/db/queries/kis-ws-approval'

export class KisApprovalError extends Error {}

// 30-min safety buffer before expiry — refresh well before WS connection breaks.
const EXPIRY_BUFFER_MS = 30 * 60 * 1000
// KIS approval keys are single-use credentials but valid up to 24 hours.
const DEFAULT_EXPIRY_S = 24 * 60 * 60

let memCache: { value: string; expiresAt: Date } | null = null

export function clearApprovalCache(): void {
  memCache = null
}

export async function getApprovalKey(): Promise<{ approvalKey: string; expiresAt: Date }> {
  const appKey = process.env.KIS_APP_KEY
  const appSecret = process.env.KIS_APP_SECRET

  if (!appKey) throw new KisApprovalError('KIS_APP_KEY is not set')
  if (!appSecret) throw new KisApprovalError('KIS_APP_SECRET is not set')

  const now = Date.now()

  if (memCache && memCache.expiresAt.getTime() - now > EXPIRY_BUFFER_MS) {
    return { approvalKey: memCache.value, expiresAt: memCache.expiresAt }
  }

  const dbRow = await getKisApproval()
  if (dbRow && dbRow.expiresAt.getTime() - now > EXPIRY_BUFFER_MS) {
    memCache = { value: dbRow.approvalKey, expiresAt: dbRow.expiresAt }
    return { approvalKey: memCache.value, expiresAt: memCache.expiresAt }
  }

  return refreshApproval(appKey, appSecret)
}

async function refreshApproval(appKey: string, appSecret: string): Promise<{ approvalKey: string; expiresAt: Date }> {
  let response: Response
  try {
    // KIS WS approval body uses `secretkey` (not `appsecret` like the REST token endpoint).
    response = await fetch('https://openapi.koreainvestment.com:9443/oauth2/Approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: appKey,
        secretkey: appSecret,
      }),
      signal: AbortSignal.timeout(5_000),
    })
  } catch (err) {
    throw new KisApprovalError(`KIS approval fetch failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (!response.ok) {
    throw new KisApprovalError(`KIS approval request failed with status ${response.status}`)
  }

  let data: { approval_key?: string }
  try {
    data = await response.json()
  } catch (err) {
    throw new KisApprovalError(`KIS approval response parse failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (!data.approval_key) {
    throw new KisApprovalError('KIS approval response missing approval_key')
  }

  const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_S * 1000)
  await upsertKisApproval(data.approval_key, expiresAt)
  memCache = { value: data.approval_key, expiresAt }

  return { approvalKey: data.approval_key, expiresAt }
}
