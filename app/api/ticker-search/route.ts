import { NextRequest, NextResponse } from 'next/server'

interface YahooQuote {
  symbol: string
  shortname?: string
  longname?: string
  quoteType: string
  exchDisp?: string
}

function filterByAssetType(quotes: YahooQuote[], assetType: string): YahooQuote[] {
  return quotes.filter((q) => {
    const sym = q.symbol
    switch (assetType) {
      case 'stock_kr':
        return q.quoteType === 'EQUITY' && (sym.endsWith('.KS') || sym.endsWith('.KQ'))
      case 'etf_kr':
        return q.quoteType === 'ETF' && (sym.endsWith('.KS') || sym.endsWith('.KQ'))
      case 'stock_us':
        return q.quoteType === 'EQUITY' && !sym.includes('.')
      case 'etf_us':
        return q.quoteType === 'ETF' && !sym.includes('.')
      default:
        return false
    }
  })
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  const type = req.nextUrl.searchParams.get('type') ?? ''

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] })
  }

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&enableFuzzyQuery=true`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    })

    if (!res.ok) return NextResponse.json({ results: [] })

    const data = await res.json()
    const quotes: YahooQuote[] = data?.finance?.result?.[0]?.quotes ?? []

    const filtered = filterByAssetType(quotes, type).slice(0, 6)
    const results = filtered.map((q) => ({
      name: q.longname ?? q.shortname ?? q.symbol,
      ticker: q.symbol,
    }))

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
