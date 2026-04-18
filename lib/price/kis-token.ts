import { getKisToken, upsertKisToken } from '@/db/queries/kis-token'

export class KisTokenError extends Error {}

// 60 minutes safety buffer before expiry
const EXPIRY_BUFFER_MS = 60 * 60 * 1000

let tokenCache: { value: string; expiresAt: Date } | null = null

export function clearTokenCache(): void {
  tokenCache = null
}

export async function getToken(): Promise<string> {
  const appKey = process.env.KIS_APP_KEY
  const appSecret = process.env.KIS_APP_SECRET

  if (!appKey) throw new KisTokenError('KIS_APP_KEY is not set')
  if (!appSecret) throw new KisTokenError('KIS_APP_SECRET is not set')

  const now = Date.now()

  // Return in-memory cache if still fresh (> 60 min remaining)
  if (tokenCache && tokenCache.expiresAt.getTime() - now > EXPIRY_BUFFER_MS) {
    return tokenCache.value
  }

  // Try loading from DB
  const dbToken = await getKisToken()
  if (dbToken && dbToken.expiresAt.getTime() - now > EXPIRY_BUFFER_MS) {
    tokenCache = { value: dbToken.tokenValue, expiresAt: dbToken.expiresAt }
    return tokenCache.value
  }

  // Single-user app: concurrent refresh is low-risk but could cause double API calls.
  // Acceptable given usage pattern (personal finance tracker, not high-traffic).
  return refreshToken(appKey, appSecret)
}

async function refreshToken(appKey: string, appSecret: string): Promise<string> {
  let response: Response
  try {
    response = await fetch('https://openapi.koreainvestment.com:9443/oauth2/tokenP', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: appKey,
        appsecret: appSecret,
      }),
      signal: AbortSignal.timeout(3_000),
    })
  } catch (err) {
    throw new KisTokenError(`KIS token fetch failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (!response.ok) {
    throw new KisTokenError(`KIS token request failed with status ${response.status}`)
  }

  let data: { access_token?: string; expires_in?: number }
  try {
    data = await response.json()
  } catch (err) {
    throw new KisTokenError(`KIS token response parse failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (!data.access_token) {
    throw new KisTokenError('KIS token response missing access_token')
  }

  if (data.expires_in === undefined) {
    console.warn('[kis-token] expires_in missing from KIS response, defaulting to 24h')
  }
  const expiresIn = data.expires_in ?? 86400
  const expiresAt = new Date(Date.now() + expiresIn * 1000)

  await upsertKisToken(data.access_token, expiresAt)
  tokenCache = { value: data.access_token, expiresAt }

  return data.access_token
}
