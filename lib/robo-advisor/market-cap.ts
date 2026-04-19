import { getUniverse, updateUniverseMarketCap, refreshUniverseRanks } from '@/db/queries/robo-advisor'
import { fetchKisMarketCap } from '@/lib/price/kis'
import { runKisBatched } from '@/lib/price/kis-bulk'

const KIS_CONCURRENCY = 6

/**
 * KIS 주식현재가 시세 (FHKST01010100)의 hts_avls (HTS 시가총액, 억원 단위)로
 * universe 종목별 시가총액을 조회. KIS 개인계정 20 req/sec 한도를 고려해 동시성 6.
 *
 * 호출 실패한 종목은 결과 맵에서 제외 → 기존 DB 값 보존 (project_market_cap_api.md 보존 모드).
 * 반환: ticker → marketCap(KRW) 맵.
 */
export async function fetchMarketCaps(tickers: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (tickers.length === 0) return result

  const settled = await runKisBatched(
    tickers,
    async (ticker) => {
      const cap = await fetchKisMarketCap(ticker)
      return { ticker, cap }
    },
    { concurrency: KIS_CONCURRENCY },
  )

  for (const r of settled) {
    if (r.status === 'fulfilled' && r.value.cap !== null && r.value.cap > 0) {
      result.set(r.value.ticker, r.value.cap)
    }
  }

  return result
}

/**
 * universe_stocks 전 종목의 market_cap_krw 갱신 후 rank 재계산.
 * KIS 조회 실패한 종목은 기존 값 유지.
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
