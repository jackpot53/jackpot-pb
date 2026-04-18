import { NextRequest, NextResponse } from 'next/server'
import { searchInsuranceProducts } from '@/lib/insurance/catalog'

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
  url?: string
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

const VALID_SEARCH_TYPES = new Set([
  'stock_kr', 'etf_kr', 'stock_us', 'etf_us', 'fund', 'crypto', 'insurance',
])

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
    if (!cookies) {
      console.error('[ticker-search] KRX cookie parsing failed — empty cookie set')
    }
    krxCookieCache = { cookies, ts: now }
    return cookies
  } catch (err) {
    console.error('[ticker-search] KRX cookie fetch failed:', err)
    return ''
  }
}

function krSuffix(typeCode: string): string {
  return typeCode === 'KOSDAQ' ? '.KQ' : '.KS'
}

function hasHangul(q: string): boolean {
  return /[\uAC00-\uD7AF]/.test(q)
}

const US_EXCHANGE_TYPES = new Set(['NASDAQ', 'NYSE', 'AMEX'])

async function searchNaverAc(q: string, target: 'kr' | 'us', assetType?: string): Promise<{ name: string; ticker: string }[]> {
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

    if (target === 'kr') {
      return items
        .filter((item) =>
          item.nationCode === 'KOR' &&
          /^\d{6}$/.test(item.code) &&
          (item.typeCode === 'KOSPI' || item.typeCode === 'KOSDAQ')
        )
        .map((item) => ({ name: item.name, ticker: item.code + krSuffix(item.typeCode) }))
    }

    // target === 'us'
    const isEtf = assetType === 'etf_us'
    return items
      .filter((item) =>
        item.nationCode === 'USA' &&
        US_EXCHANGE_TYPES.has(item.typeCode) &&
        (isEtf ? item.url?.includes('/etf/') : !item.url?.includes('/etf/'))
      )
      .map((item) => ({ name: item.name, ticker: item.code }))
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
    const naver = await searchNaverAc(q, 'kr')
    if (naver.length > 0) return naver
    const krx = await krxRaw(q)
    if (krx.length > 0) return krx
  } else {
    // Numeric / English: KRX first (precise code lookup), then Naver, then Yahoo
    const krx = await krxRaw(q)
    if (krx.length > 0) return krx
    const naver = await searchNaverAc(q, 'kr')
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

const FUND_SEARCH_CACHE_TTL = 5 * 60 * 1000
const FUND_SEARCH_CACHE_MAX = 200
const fundSearchCache = new Map<string, { results: { name: string; ticker: string }[]; ts: number }>()

function getCachedFundSearch(key: string): { name: string; ticker: string }[] | null {
  const hit = fundSearchCache.get(key)
  if (!hit) return null
  if (Date.now() - hit.ts > FUND_SEARCH_CACHE_TTL) {
    fundSearchCache.delete(key)
    return null
  }
  fundSearchCache.delete(key)
  fundSearchCache.set(key, hit)
  return hit.results
}

function setCachedFundSearch(key: string, results: { name: string; ticker: string }[]) {
  if (fundSearchCache.size >= FUND_SEARCH_CACHE_MAX) {
    const firstKey = fundSearchCache.keys().next().value
    if (firstKey !== undefined) fundSearchCache.delete(firstKey)
  }
  fundSearchCache.set(key, { results, ts: Date.now() })
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

const FUNETF_PAGE_CAP = 3

async function funetfQuery(schVal: string, session: { csrf: string; cookies: string }): Promise<{ name: string; ticker: string }[]> {
  const first = await funetfFetchPage(schVal, session, 1)
  if (!first) return []

  const lastPage = Math.min(first.totalPages, FUNETF_PAGE_CAP)
  const restPageNums: number[] = []
  for (let p = 2; p <= lastPage; p++) restPageNums.push(p)

  const rest = await Promise.all(restPageNums.map((p) => funetfFetchPage(schVal, session, p)))

  const seen = new Set<string>()
  const results: { name: string; ticker: string }[] = []
  for (const data of [first, ...rest]) {
    if (!data) continue
    for (const item of data.content as { fundFnm?: string; repFundNm?: string; fundCd?: string; repFundCd?: string }[]) {
      const name = item.fundFnm ?? item.repFundNm
      const ticker = item.fundCd ?? item.repFundCd
      if (!ticker || seen.has(ticker)) continue
      seen.add(ticker)
      results.push({ name: name ?? ticker, ticker })
    }
  }
  return results
}

async function searchFund(q: string): Promise<{ name: string; ticker: string }[]> {
  const cacheKey = `fund:${q}`
  const cached = getCachedFundSearch(cacheKey)
  if (cached) return cached

  try {
    const session = await getFunetfSession(q)
    if (!session) {
      setCachedFundSearch(cacheKey, [])
      return []
    }

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
          if (filtered.length > 0) {
            setCachedFundSearch(cacheKey, filtered)
            return filtered
          }
        }
        setCachedFundSearch(cacheKey, results)
        return results
      }
    }
    setCachedFundSearch(cacheKey, [])
    return []
  } catch {
    return []
  }
}

const CRYPTO_KR_MAP: { kr: string[]; en: string; ticker: string }[] = [
  { kr: ['비트코인', '비트'], en: 'Bitcoin', ticker: 'BTC-USD' },
  { kr: ['이더리움', '이더'], en: 'Ethereum', ticker: 'ETH-USD' },
  { kr: ['리플', 'XRP'], en: 'XRP', ticker: 'XRP-USD' },
  { kr: ['솔라나'], en: 'Solana', ticker: 'SOL-USD' },
  { kr: ['도지코인', '도지'], en: 'Dogecoin', ticker: 'DOGE-USD' },
  { kr: ['에이다', '카르다노'], en: 'Cardano', ticker: 'ADA-USD' },
  { kr: ['에이브', 'AAVE'], en: 'Aave', ticker: 'AAVE-USD' },
  { kr: ['아발란체'], en: 'Avalanche', ticker: 'AVAX-USD' },
  { kr: ['폴리곤', '매틱'], en: 'Polygon', ticker: 'MATIC-USD' },
  { kr: ['체인링크', '링크'], en: 'Chainlink', ticker: 'LINK-USD' },
  { kr: ['유니스왑', '유니'], en: 'Uniswap', ticker: 'UNI-USD' },
  { kr: ['스텔라루멘', '스텔라'], en: 'Stellar', ticker: 'XLM-USD' },
  { kr: ['트론'], en: 'TRON', ticker: 'TRX-USD' },
  { kr: ['라이트코인'], en: 'Litecoin', ticker: 'LTC-USD' },
  { kr: ['비트코인캐시', '비캐'], en: 'Bitcoin Cash', ticker: 'BCH-USD' },
  { kr: ['이오스'], en: 'EOS', ticker: 'EOS-USD' },
  { kr: ['코스모스', '아톰'], en: 'Cosmos', ticker: 'ATOM-USD' },
  { kr: ['폴카닷'], en: 'Polkadot', ticker: 'DOT-USD' },
  { kr: ['니어프로토콜', '니어'], en: 'NEAR Protocol', ticker: 'NEAR-USD' },
  { kr: ['아비트럼'], en: 'Arbitrum', ticker: 'ARB-USD' },
  { kr: ['수이'], en: 'Sui', ticker: 'SUI20947-USD' },
  { kr: ['앱토스'], en: 'Aptos', ticker: 'APT21794-USD' },
  { kr: ['샌드박스'], en: 'The Sandbox', ticker: 'SAND-USD' },
  { kr: ['디센트럴랜드', '마나'], en: 'Decentraland', ticker: 'MANA-USD' },
  { kr: ['클레이튼', '클레이'], en: 'Klaytn', ticker: 'KLAY-USD' },
  { kr: ['위믹스'], en: 'WEMIX', ticker: 'WEMIX-USD' },
]

function searchCryptoByKr(q: string): { name: string; ticker: string }[] {
  const lower = q.toLowerCase()
  return CRYPTO_KR_MAP
    .filter(c => c.kr.some(k => k.includes(lower) || lower.includes(k)))
    .map(c => ({ name: c.en, ticker: c.ticker }))
}

async function searchCrypto(q: string): Promise<{ name: string; ticker: string }[]> {
  if (hasHangul(q)) {
    return searchCryptoByKr(q)
  }
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
      .filter((q) => q.quoteType === 'CRYPTOCURRENCY')
      .map((q) => ({ name: q.longname ?? q.shortname ?? q.symbol, ticker: q.symbol }))
  } catch {
    return []
  }
}

async function searchUsChain(q: string, type: string): Promise<{ name: string; ticker: string }[]> {
  if (hasHangul(q)) {
    const naver = await searchNaverAc(q, 'us', type)
    if (naver.length > 0) return naver
  }
  return searchYahoo(q, type)
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


export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  const type = req.nextUrl.searchParams.get('type') ?? ''

  if (!q || q.length < 1) return NextResponse.json({ results: [] })
  if (q.length > 100) return NextResponse.json({ error: 'query too long' }, { status: 400 })
  if (!VALID_SEARCH_TYPES.has(type)) return NextResponse.json({ results: [] })

  try {
    if (type === 'stock_kr' || type === 'etf_kr') {
      return NextResponse.json({ results: await searchKoreanChain(q, type) })
    }
    if (type === 'fund') {
      return NextResponse.json({ results: await searchFund(q) })
    }
    if (type === 'insurance') {
      const products = await searchInsuranceProducts(q)
      return NextResponse.json({ results: products.map(p => ({ name: p.name, ticker: '' })) })
    }
    if (type === 'crypto') {
      return NextResponse.json({ results: await searchCrypto(q) })
    }
    return NextResponse.json({ results: await searchUsChain(q, type) })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
