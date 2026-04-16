import type { FlowEntry } from './types'

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'application/json',
}

interface YahooQuoteResult {
  symbol: string
  shortName?: string
  longName?: string
  regularMarketChangePercent?: number
  quoteType?: string
}

function detectUsAssetType(symbol: string, quoteType?: string): 'stock_us' | 'crypto' {
  if (quoteType === 'CRYPTOCURRENCY' || symbol.endsWith('-USD')) return 'crypto'
  return 'stock_us'
}

export async function fetchYahooTrending(): Promise<FlowEntry[]> {
  try {
    // 1. 트렌딩 심볼 목록 조회
    const trendRes = await fetch(
      'https://query1.finance.yahoo.com/v1/finance/trending/US?count=10',
      {
        headers: YAHOO_HEADERS,
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      },
    )
    if (!trendRes.ok) return []

    const trendData = await trendRes.json()
    const symbols: string[] =
      trendData?.finance?.result?.[0]?.quotes?.map(
        (q: { symbol: string }) => q.symbol,
      ) ?? []

    if (symbols.length === 0) return []

    // 2. 심볼별 이름 + 등락률 일괄 조회
    const quotesUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}&fields=shortName,regularMarketChangePercent,quoteType`
    try {
      const quoteRes = await fetch(quotesUrl, {
        headers: YAHOO_HEADERS,
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      })

      if (quoteRes.ok) {
        const quoteData = await quoteRes.json()
        const results: YahooQuoteResult[] =
          quoteData?.quoteResponse?.result ?? []

        const quoteMap = new Map(results.map((r) => [r.symbol, r]))

        return symbols.slice(0, 8).map((symbol) => {
          const q = quoteMap.get(symbol)
          return {
            code: symbol,
            ticker: symbol,
            name: q?.shortName ?? q?.longName ?? symbol,
            netAmount: 0,
            changePercent: q?.regularMarketChangePercent,
            assetType: detectUsAssetType(symbol, q?.quoteType),
          }
        })
      }
    } catch {
      // quote 실패 시 심볼만으로 fallback
    }

    // Fallback: 심볼만 반환
    return symbols.slice(0, 8).map((symbol) => ({
      code: symbol,
      ticker: symbol,
      name: symbol,
      netAmount: 0,
      assetType: detectUsAssetType(symbol),
    }))
  } catch {
    return []
  }
}
