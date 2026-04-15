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
    return items.map((item) => ({
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

async function funetfFetchPage(schVal: string, session: { csrf: string; cookies: string }, page: number): Promise<{ content: unknown[]; totalPages: number } | null> {
  const body = new URLSearchParams({
    schVal,
    page: String(page),
    fundOrderTarget: 'fundNm',
    fundOrderType: 'ASC',
    _csrf: session.csrf,
  })
  const res = await fetch('https://www.funetf.co.kr/api/public/main/search/fund', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': `https://www.funetf.co.kr/search?schVal=${encodeURIComponent(schVal)}`,
      'X-Requested-With': 'XMLHttpRequest',
      'Cookie': session.cookies,
    },
    body: body.toString(),
    signal: AbortSignal.timeout(6000),
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.result !== 1) return null
  return {
    content: data.fundList?.content ?? [],
    totalPages: data.fundList?.totalPages ?? 1,
  }
}

async function funetfQuery(schVal: string, session: { csrf: string; cookies: string }): Promise<{ name: string; ticker: string }[]> {
  const seen = new Set<string>()
  const results: { name: string; ticker: string }[] = []

  let page = 1
  let totalPages = 1
  // Fetch pages sequentially to avoid CSRF conflicts (cap at 10 pages)
  while (page <= Math.min(totalPages, 10)) {
    const data = await funetfFetchPage(schVal, session, page)
    if (!data) break
    totalPages = data.totalPages
    for (const item of data.content as { fundFnm?: string; repFundNm?: string; fundCd?: string; repFundCd?: string }[]) {
      const name = item.fundFnm ?? item.repFundNm
      const ticker = item.fundCd ?? item.repFundCd
      if (!ticker || seen.has(ticker)) continue
      seen.add(ticker)
      results.push({ name: name ?? ticker, ticker })
    }
    page++
  }
  return results
}

async function searchFund(q: string): Promise<{ name: string; ticker: string }[]> {
  try {
    const session = await getFunetfSession(q)
    if (!session) return []

    // Try full query first; if no results, retry with progressively shorter prefix
    // (funetf API tokenizes fund names and fails on number boundaries like "투자100세")
    const queries: string[] = [q]
    // Strip trailing non-Korean/non-digit, then shorten by 4 chars up to 5 fallbacks
    // Also add digit-stripped variant of each candidate (e.g. "투자1" → "투자")
    const addCandidate = (s: string) => {
      if (s.length >= 4 && !queries.includes(s)) queries.push(s)
      const noTrailingDigit = s.replace(/\d+$/, '')
      if (noTrailingDigit.length >= 4 && !queries.includes(noTrailingDigit)) queries.push(noTrailingDigit)
    }
    const stripped = q.replace(/[^가-힣\d]+$/, '')
    let cur = stripped.length >= 4 && stripped !== q ? stripped : q
    if (cur !== q) addCandidate(cur)
    for (let i = 0; i < 5 && cur.length > 6; i++) {
      cur = cur.slice(0, -4)
      addCandidate(cur)
    }

    for (const qry of queries) {
      const results = await funetfQuery(qry, session)
      if (results.length > 0) {
        // Filter by original query if we fell back to a shorter one
        if (qry !== q) {
          const filtered = results.filter(r => r.name.includes(q) || q.includes(r.name.slice(0, 6)))
          if (filtered.length > 0) return filtered
        }
        return results
      }
    }
    return []
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
    .map((q) => ({ name: q.longname ?? q.shortname ?? q.symbol, ticker: q.symbol }))
}

const INSURANCE_PRODUCTS: { name: string; ticker: string }[] = [
  // 삼성생명
  { name: '삼성생명 종신보험', ticker: '' }, { name: '삼성생명 연금보험', ticker: '' },
  { name: '삼성생명 암보험', ticker: '' }, { name: '삼성생명 CI보험', ticker: '' },
  { name: '삼성생명 변액연금보험', ticker: '' }, { name: '삼성생명 변액종신보험', ticker: '' },
  // 한화생명
  { name: '한화생명 종신보험', ticker: '' }, { name: '한화생명 연금보험', ticker: '' },
  { name: '한화생명 암보험', ticker: '' }, { name: '한화생명 변액보험', ticker: '' },
  // 교보생명
  { name: '교보생명 종신보험', ticker: '' }, { name: '교보생명 연금보험', ticker: '' },
  { name: '교보생명 CI보험', ticker: '' }, { name: '교보생명 암보험', ticker: '' },
  { name: '교보생명 변액연금보험', ticker: '' },
  // 신한라이프
  { name: '신한라이프 종신보험', ticker: '' }, { name: '신한라이프 연금보험', ticker: '' },
  { name: '신한라이프 암보험', ticker: '' },
  // NH농협생명
  { name: 'NH농협생명 종신보험', ticker: '' }, { name: 'NH농협생명 연금보험', ticker: '' },
  // KB라이프
  { name: 'KB라이프 종신보험', ticker: '' }, { name: 'KB라이프 연금보험', ticker: '' },
  // AIA·메트라이프·푸르덴셜
  { name: 'AIA생명 종신보험', ticker: '' }, { name: 'AIA생명 CI보험', ticker: '' },
  { name: '메트라이프 종신보험', ticker: '' }, { name: '메트라이프 변액보험', ticker: '' },
  { name: '푸르덴셜 종신보험', ticker: '' },
  // 삼성화재
  { name: '삼성화재 실손보험', ticker: '' }, { name: '삼성화재 운전자보험', ticker: '' },
  { name: '삼성화재 어린이보험', ticker: '' }, { name: '삼성화재 암보험', ticker: '' },
  { name: '삼성화재 치아보험', ticker: '' },
  // 현대해상
  { name: '현대해상 실손보험', ticker: '' }, { name: '현대해상 운전자보험', ticker: '' },
  { name: '현대해상 어린이보험', ticker: '' }, { name: '현대해상 암보험', ticker: '' },
  // DB손보
  { name: 'DB손보 실손보험', ticker: '' }, { name: 'DB손보 운전자보험', ticker: '' },
  { name: 'DB손보 어린이보험', ticker: '' }, { name: 'DB손보 암보험', ticker: '' },
  // KB손보
  { name: 'KB손보 실손보험', ticker: '' }, { name: 'KB손보 운전자보험', ticker: '' },
  { name: 'KB손보 암보험', ticker: '' },
  // 메리츠화재
  { name: '메리츠화재 실손보험', ticker: '' }, { name: '메리츠화재 암보험', ticker: '' },
  { name: '메리츠화재 운전자보험', ticker: '' },
  // 공통 상품 유형
  { name: '종신보험', ticker: '' }, { name: '정기보험', ticker: '' },
  { name: '연금보험', ticker: '' }, { name: '변액연금보험', ticker: '' },
  { name: '변액종신보험', ticker: '' }, { name: '실손의료보험', ticker: '' },
  { name: '암보험', ticker: '' }, { name: 'CI보험', ticker: '' },
  { name: '치아보험', ticker: '' }, { name: '운전자보험', ticker: '' },
  { name: '어린이보험', ticker: '' }, { name: '태아보험', ticker: '' },
  { name: '노인장기요양보험', ticker: '' }, { name: '저축보험', ticker: '' },
]

function searchInsurance(q: string): { name: string; ticker: string }[] {
  const lower = q.toLowerCase()
  return INSURANCE_PRODUCTS.filter((p) => p.name.toLowerCase().includes(lower))
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
    if (type === 'insurance') {
      return NextResponse.json({ results: searchInsurance(q) })
    }
    return NextResponse.json({ results: await searchYahoo(q, type) })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
