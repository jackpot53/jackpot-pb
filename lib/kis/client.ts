import { getKisToken, upsertKisToken } from '@/db/queries/kis-token'

const KIS_BASE = 'https://openapi.koreainvestment.com:9443'

// KIS 토큰은 1일 1회 발급 원칙 — 잦은 발급 시 이용 제한 위험.
// 캐시 계층: in-memory(프로세스 생존 동안) → DB(재시작 간 공유) → KIS 실발급(최후 수단)
//
// pendingFetch: 동시 요청이 여러 개 들어와도 토큰 발급은 반드시 1번만 실행된다.
// 진행 중인 발급이 있으면 동일 Promise를 공유해 대기하므로 레이스 컨디션이 없다.

let memToken: { value: string; expiresAt: Date } | null = null
let pendingFetch: Promise<string | null> | null = null

// 만료 10분 전부터 갱신 시도 (24h 토큰 기준, 실질적으로 하루 1회 발급)
const REFRESH_BUFFER_MS = 10 * 60 * 1000

function isStale(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now() + REFRESH_BUFFER_MS
}

/**
 * 유효한 KIS OAuth 액세스 토큰을 반환한다.
 *
 * 우선순위:
 *   1. in-memory 캐시 (DB 조회 없음 — 가장 빠른 경로)
 *   2. DB 캐시 (서버 재시작 후에도 기존 토큰 재사용)
 *   3. KIS API 실발급 (1, 2 모두 없거나 만료된 경우에만)
 *
 * 환경변수 미설정 또는 발급 실패 시 null 반환 → 호출부에서 폴백 처리.
 */
export async function getKisAccessToken(): Promise<string | null> {
  const appKey = process.env.KIS_APP_KEY
  const appSecret = process.env.KIS_APP_SECRET
  if (!appKey || !appSecret) return null

  // 1. in-memory 히트 — DB 조회 없이 즉시 반환
  if (memToken && !isStale(memToken.expiresAt)) {
    return memToken.value
  }

  // 2. 이미 발급이 진행 중이면 동일 Promise 대기 (중복 발급 방지)
  if (pendingFetch) return pendingFetch

  // 3. 발급 시작 — 완료 후 pendingFetch 초기화
  pendingFetch = _acquireToken(appKey, appSecret).finally(() => {
    pendingFetch = null
  })
  return pendingFetch
}

async function _acquireToken(appKey: string, appSecret: string): Promise<string | null> {
  // DB에 유효한 토큰이 있으면 재사용 (다른 프로세스·재시작으로 저장된 경우)
  try {
    const cached = await getKisToken()
    if (cached && !isStale(cached.expiresAt)) {
      memToken = { value: cached.tokenValue, expiresAt: cached.expiresAt }
      return cached.tokenValue
    }
  } catch (err) {
    console.error('[kis] DB token read error:', err)
  }

  // KIS 실발급 (1일 1회 원칙 — 위 캐시 계층이 모두 실패했을 때만 도달)
  try {
    const res = await fetch(`${KIS_BASE}/oauth2/tokenP`, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: appKey,
        appsecret: appSecret,
      }),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error('[kis] token issue failed:', res.status, await res.text().catch(() => ''))
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

    // 메모리 + DB 양쪽에 저장
    memToken = { value: token, expiresAt }
    await upsertKisToken(token, expiresAt).catch((err) =>
      console.error('[kis] token DB save error:', err),
    )
    console.log(`[kis] new token issued, valid until ${expiresAt.toISOString()}`)
    return token
  } catch (err) {
    console.error('[kis] token issue error:', err)
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
