import { getUniverse, updateUniverseMarketCap, refreshUniverseRanks } from '@/db/queries/robo-advisor'

const BATCH_SIZE = 10

/**
 * Yahoo Finance v7 quote API로 시가총액 조회.
 * symbols를 최대 BATCH_SIZE개씩 나눠 배치 요청.
 * 반환: ticker → marketCap(KRW) 맵.
 *
 * NOTE: Yahoo v7이 현재 인증을 요구하고 있어 호출 실패 시 빈 맵을 반환합니다.
 * 기존 DB 데이터가 유지됩니다.
 * 향후 KRX API 복구 또는 다른 데이터 소스로 전환할 때까지 임시 상태입니다.
 */
export async function fetchMarketCaps(tickers: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (tickers.length === 0) return result

  // BATCH_SIZE개씩 분할
  const batches: string[][] = []
  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    batches.push(tickers.slice(i, i + BATCH_SIZE))
  }

  for (const batch of batches) {
    try {
      const symbols = batch.join(',')
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=marketCap`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      })

      if (!res.ok) {
        console.warn(`[market-cap] Yahoo v7 HTTP ${res.status} for batch: ${symbols}`)
        continue
      }

      const data = await res.json()
      const quotes: Array<{ symbol?: string; marketCap?: number }> =
        data?.quoteResponse?.result ?? []

      for (const quote of quotes) {
        if (quote.symbol && typeof quote.marketCap === 'number' && quote.marketCap > 0) {
          result.set(quote.symbol, Math.round(quote.marketCap))
        }
      }
    } catch (err) {
      console.warn(`[market-cap] batch fetch error:`, err)
    }
  }

  return result
}

/**
 * universe_stocks 전 종목의 market_cap_krw 갱신 후 rank 재계산.
 * Yahoo에서 조회 실패한 종목은 기존 값 유지.
 */
export async function updateUniverseRanks(): Promise<void> {
  const universe = await getUniverse()
  if (universe.length === 0) return

  const tickers = universe.map((s) => s.ticker)
  const marketCaps = await fetchMarketCaps(tickers)

  let updated = 0
  for (const stock of universe) {
    const cap = marketCaps.get(stock.ticker)
    if (cap !== undefined) {
      await updateUniverseMarketCap(stock.ticker, cap)
      updated++
    }
  }

  // 시가총액 기준 rank 재계산
  await refreshUniverseRanks()

  console.log(`[market-cap] updated ${updated}/${universe.length} stocks, ranks refreshed`)
}
