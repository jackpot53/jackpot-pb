const KRX_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Referer': 'https://data.krx.co.kr/contents/MDC/STAT/standard/MDCSTAT01901',
  'Origin': 'https://data.krx.co.kr',
  'X-Requested-With': 'XMLHttpRequest',
}

let krxCookieCache: { cookies: string; ts: number } | null = null

export async function getKrxCookies(): Promise<string> {
  const now = Date.now()
  if (krxCookieCache && now - krxCookieCache.ts < 10 * 60 * 1000) {
    return krxCookieCache.cookies
  }
  try {
    const res = await fetch('https://data.krx.co.kr/contents/MDC/STAT/standard/MDCSTAT01901', {
      headers: {
        'User-Agent': KRX_HEADERS['User-Agent'],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    const setCookies = res.headers.getSetCookie?.() ?? []
    const cookies = setCookies.map((c) => c.split(';')[0]).join('; ')
    if (!cookies) {
      console.error('[krx] cookie parsing failed — empty cookie set')
    }
    krxCookieCache = { cookies, ts: now }
    return cookies
  } catch (err) {
    console.error('[krx] cookie fetch failed:', err)
    return ''
  }
}

export async function krxPost(bld: string, extra: Record<string, string>): Promise<Response> {
  const cookies = await getKrxCookies()
  const body = `bld=${bld}&` + new URLSearchParams(extra).toString()
  return fetch('https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd', {
    method: 'POST',
    headers: {
      ...KRX_HEADERS,
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body,
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  })
}
