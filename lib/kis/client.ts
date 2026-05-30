import { getKisToken, upsertKisToken } from '@/db/queries/kis-token'

const KIS_BASE = 'https://openapi.koreainvestment.com:9443'

/**
 * 유효한 KIS OAuth 액세스 토큰을 반환한다.
 * DB 캐시 우선 조회 → 만료 5분 이내면 재사용, 만료 시 재발급 후 DB 저장.
 *
 * 주의: KIS는 토큰 발급을 분당 1회로 제한하므로 DB 캐시가 필수.
 * 환경변수 미설정 또는 발급 실패 시 null 반환 → 호출부에서 폴백 처리.
 */
export async function getKisAccessToken(): Promise<string | null> {
  const appKey = process.env.KIS_APP_KEY
  const appSecret = process.env.KIS_APP_SECRET
  if (!appKey || !appSecret) return null

  try {
    const cached = await getKisToken()
    if (cached) {
      const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000)
      if (cached.expiresAt > fiveMinFromNow) {
        return cached.tokenValue
      }
    }
  } catch (err) {
    console.error('[kis] token cache read error:', err)
  }

  try {
    const res = await fetch(`${KIS_BASE}/oauth2/tokenP`, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: appKey,
        appsecret: appSecret,
      }),
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error('[kis] token fetch failed:', res.status, await res.text().catch(() => ''))
      return null
    }
    const data = await res.json()
    const token: string = data.access_token
    if (!token) {
      console.error('[kis] access_token missing in response')
      return null
    }
    const expiresIn: number = typeof data.expires_in === 'number' ? data.expires_in : 86400
    const expiresAt = new Date(Date.now() + expiresIn * 1000)
    await upsertKisToken(token, expiresAt)
    return token
  } catch (err) {
    console.error('[kis] token fetch error:', err)
    return null
  }
}

/**
 * KIS REST API GET 요청 래퍼.
 * 인증 헤더(appkey, appsecret, authorization, tr_id, custtype)를 자동 주입한다.
 * 토큰 취득 실패 또는 fetch 오류 시 null 반환.
 */
export async function kisGet(
  path: string,
  params: Record<string, string>,
  trId: string,
): Promise<Response | null> {
  const appKey = process.env.KIS_APP_KEY
  const appSecret = process.env.KIS_APP_SECRET
  if (!appKey || !appSecret) return null

  const token = await getKisAccessToken()
  if (!token) return null

  const qs = new URLSearchParams(params).toString()
  const url = `${KIS_BASE}${path}?${qs}`

  try {
    return await fetch(url, {
      headers: {
        'authorization': `Bearer ${token}`,
        'appkey': appKey,
        'appsecret': appSecret,
        'tr_id': trId,
        'custtype': 'P',
        'content-type': 'application/json; charset=utf-8',
      },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
  } catch (err) {
    console.error('[kis] GET error:', err)
    return null
  }
}
