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

async function searchKrxStocks(q: string): Promise<{ name: string; ticker: string }[]> {
  const res = await fetch('https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'Mozilla/5.0',
      'Referer': 'https://data.krx.co.kr/contents/MDC/MAIN/main/MDCMAIN001',
    },
    body: new URLSearchParams({
      bld: 'dbms/comm/finder/finder_stkisu',
      mktsel: 'ALL',
      typeNo: '0',
      searchText: q,
    }),
    signal: AbortSignal.timeout(4000),
    cache: 'no-store',
  })

  if (!res.ok) return []
  const data = await res.json()
  const items: KrxStockResult[] = data?.block1 ?? []

  return items.slice(0, 6).map((item) => {
    const suffix = item.marketName === '코스닥' ? '.KQ' : '.KS'
    return { name: item.codeName, ticker: item.short_code + suffix }
  })
}

async function searchKrxEtfs(q: string): Promise<{ name: string; ticker: string }[]> {
  const res = await fetch('https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'Mozilla/5.0',
      'Referer': 'https://data.krx.co.kr/contents/MDC/MAIN/main/MDCMAIN001',
    },
    body: new URLSearchParams({
      bld: 'dbms/comm/finder/finder_secuprodisu',
      searchText: q,
    }),
    signal: AbortSignal.timeout(4000),
    cache: 'no-store',
  })

  if (!res.ok) return []
  const data = await res.json()
  const items: KrxProductResult[] = data?.block1 ?? []

  return items
    .filter((item) => /^\d{6}$/.test(item.short_code))
    .slice(0, 6)
    .map((item) => ({ name: item.codeName, ticker: item.short_code + '.KS' }))
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
    if (type === 'stock_kr') {
      return NextResponse.json({ results: await searchKrxStocks(q) })
    }
    if (type === 'etf_kr') {
      return NextResponse.json({ results: await searchKrxEtfs(q) })
    }
    return NextResponse.json({ results: await searchYahoo(q, type) })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
