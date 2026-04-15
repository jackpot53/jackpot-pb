import { NextRequest, NextResponse } from 'next/server'

interface YahooQuote {
  symbol: string
  shortname?: string
  longname?: string
  quoteType: string
  exchDisp?: string
}

interface KrxStockResult {
  short_code: string
  codeName: string
  marketName: string
}

interface KrxProductResult {
  short_code: string
  codeName: string
}

interface NaverAcItem {
  code: string
  name: string
  typeCode: string
  nationCode: string
}

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

async function getKrxCookies(): Promise<string> {
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
    krxCookieCache = { cookies, ts: now }
    return cookies
  } catch {
    return ''
  }
}

function krSuffix(typeCode: string): string {
  return typeCode === 'KOSDAQ' ? '.KQ' : '.KS'
}

function hasHangul(q: string): boolean {
  return /[\uAC00-\uD7AF]/.test(q)
}

async function searchNaverKr(q: string): Promise<{ name: string; ticker: string }[]> {
  try {
    const url = `https://ac.stock.naver.com/ac?q=${encodeURIComponent(q)}&target=stock,etf`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://finance.naver.com/',
      },
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data = await res.json()
    const items: NaverAcItem[] = data?.items ?? []
    return items
      .filter((item) =>
        item.nationCode === 'KOR' &&
        /^\d{6}$/.test(item.code) &&
        (item.typeCode === 'KOSPI' || item.typeCode === 'KOSDAQ')
      )
      .slice(0, 6)
      .map((item) => ({ name: item.name, ticker: item.code + krSuffix(item.typeCode) }))
  } catch {
    return []
  }
}

async function krxPost(bld: string, extra: Record<string, string>): Promise<Response> {
  const cookies = await getKrxCookies()
  const body = `bld=${bld}&` + new URLSearchParams(extra).toString()
  return fetch('https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd', {
    method: 'POST',
    headers: {
      ...KRX_HEADERS,
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body,
    signal: AbortSignal.timeout(5000),
    cache: 'no-store',
  })
}

async function krxStocksRaw(q: string): Promise<{ name: string; ticker: string }[]> {
  try {
    const res = await krxPost('dbms/comm/finder/finder_stkisu', {
      mktsel: 'ALL',
      typeNo: '0',
      searchText: q,
    })
    if (!res.ok) return []
    const text = await res.text()
    let data: { block1?: KrxStockResult[] }
    try { data = JSON.parse(text) } catch { data = {} }
    const items = data?.block1 ?? []
    return items.slice(0, 6).map((item) => ({
      name: item.codeName,
      ticker: item.short_code + krSuffix(item.marketName === '코스닥' ? 'KOSDAQ' : 'KOSPI'),
    }))
  } catch {
    return []
  }
}

async function krxEtfsRaw(q: string): Promise<{ name: string; ticker: string }[]> {
  try {
    const res = await krxPost('dbms/comm/finder/finder_secuprodisu', {
      searchText: q,
    })
    if (!res.ok) return []
    const text = await res.text()
    let data: { block1?: KrxProductResult[] }
    try { data = JSON.parse(text) } catch { data = {} }
    return (data?.block1 ?? [])
      .filter((item) => /^\d{6}$/.test(item.short_code))
      .slice(0, 6)
      .map((item) => ({ name: item.codeName, ticker: item.short_code + '.KS' }))
  } catch {
    return []
  }
}

async function searchKoreanChain(q: string, type: string): Promise<{ name: string; ticker: string }[]> {
  const krxRaw = type === 'etf_kr' ? krxEtfsRaw : krxStocksRaw

  if (hasHangul(q)) {
    // Hangul: Naver first (handles Korean name search reliably), then KRX, then Yahoo
    const naver = await searchNaverKr(q)
    if (naver.length > 0) return naver
    const krx = await krxRaw(q)
    if (krx.length > 0) return krx
  } else {
    // Numeric / English: KRX first (precise code lookup), then Naver, then Yahoo
    const krx = await krxRaw(q)
    if (krx.length > 0) return krx
    const naver = await searchNaverKr(q)
    if (naver.length > 0) return naver
  }

  return searchYahooKr(q, type)
}

async function searchYahooKr(q: string, type: string): Promise<{ name: string; ticker: string }[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&enableFuzzyQuery=true`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data = await res.json()
    const quotes: YahooQuote[] = data?.quotes ?? []
    return quotes
      .filter((q) => {
        const sym = q.symbol
        if (type === 'stock_kr') return q.quoteType === 'EQUITY' && (sym.endsWith('.KS') || sym.endsWith('.KQ'))
        if (type === 'etf_kr') return q.quoteType === 'ETF' && (sym.endsWith('.KS') || sym.endsWith('.KQ'))
        return false
      })
      .slice(0, 6)
      .map((q) => ({
        name: q.longname ?? q.shortname ?? q.symbol,
        ticker: q.symbol,
      }))
  } catch {
    return []
  }
}

// Cache funetf session (CSRF token + cookies) for 10 minutes
let funetfSessionCache: { csrf: string; cookies: string; ts: number } | null = null

async function getFunetfSession(q: string): Promise<{ csrf: string; cookies: string } | null> {
  const now = Date.now()
  if (funetfSessionCache && now - funetfSessionCache.ts < 10 * 60 * 1000) {
    return funetfSessionCache
  }
  try {
    const res = await fetch(`https://www.funetf.co.kr/search?schVal=${encodeURIComponent(q)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    })
    if (!res.ok) return null

    const html = await res.text()
    const csrfMatch = html.match(/name="_csrf"\s+value="([^"]+)"/)
    if (!csrfMatch) return null

    const csrf = csrfMatch[1]
    const setCookies = res.headers.getSetCookie?.() ?? []
    const cookies = setCookies.map((c) => c.split(';')[0]).join('; ')

    funetfSessionCache = { csrf, cookies, ts: now }
    return { csrf, cookies }
  } catch {
    return null
  }
}

async function searchFund(q: string): Promise<{ name: string; ticker: string }[]> {
  try {
    const session = await getFunetfSession(q)
    if (!session) return []

    const body = new URLSearchParams({
      schVal: q,
      page: '1',
      fundOrderTarget: 'fundNm',
      fundOrderType: 'ASC',
      _csrf: session.csrf,
    })

    const res = await fetch('https://www.funetf.co.kr/api/public/main/search/fund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `https://www.funetf.co.kr/search?schVal=${encodeURIComponent(q)}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': session.cookies,
      },
      body: body.toString(),
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    })

    if (!res.ok) return []
    const data = await res.json()
    if (data.result !== 1) return []

    // Deduplicate by repFundCd (representative fund — groups all classes together)
    const seen = new Set<string>()
    const results: { name: string; ticker: string }[] = []
    for (const item of data.fundList?.content ?? []) {
      if (!item.repFundCd || seen.has(item.repFundCd)) continue
      seen.add(item.repFundCd)
      results.push({ name: item.repFundNm, ticker: item.repFundCd })
      if (results.length >= 8) break
    }
    return results
  } catch {
    return []
  }
}

async function searchYahoo(q: string, type: string): Promise<{ name: string; ticker: string }[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&enableFuzzyQuery=true`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(4000),
    cache: 'no-store',
  })

  if (!res.ok) return []
  const data = await res.json()
  const quotes: YahooQuote[] = data?.quotes ?? []

  return quotes
    .filter((q) => {
      const sym = q.symbol
      if (type === 'stock_us') return q.quoteType === 'EQUITY' && !sym.includes('.')
      if (type === 'etf_us') return q.quoteType === 'ETF' && !sym.includes('.')
      return false
    })
    .slice(0, 6)
    .map((q) => ({ name: q.longname ?? q.shortname ?? q.symbol, ticker: q.symbol }))
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  const type = req.nextUrl.searchParams.get('type') ?? ''

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] })
  }

  try {
    if (type === 'stock_kr' || type === 'etf_kr') {
      return NextResponse.json({ results: await searchKoreanChain(q, type) })
    }
    if (type === 'fund') {
      return NextResponse.json({ results: await searchFund(q) })
    }
    return NextResponse.json({ results: await searchYahoo(q, type) })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
