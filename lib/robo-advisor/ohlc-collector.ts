import path from 'path'
import fs from 'fs/promises'
import { upsertPriceHistory, upsertUniverseStock, getUniverse, type OhlcRow } from '@/db/queries/robo-advisor'

// Yahoo Finance v8 chart API가 반환하는 개별 OHLCV 포인트
export type OhlcPoint = {
  date: string   // 'YYYY-MM-DD'
  open: number
  high: number
  low: number
  close: number
  volume: number | null
}

type SeedEntry = {
  code: string
  name: string
  market: 'KOSPI' | 'KOSDAQ'
  sector?: string
}

/** KRX 6자리 코드를 Yahoo Finance ticker로 변환 ('005930' → '005930.KS') */
function toYahooTicker(code: string): string {
  return `${code}.KS`
}

/** Simple concurrency limiter — p-limit 없이 동시성 제어 */
async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let idx = 0
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++
      results[i] = await tasks[i]()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}

/** data/kospi200-seed.json에서 유니버스 종목 로드 */
export async function loadUniverseSeed(): Promise<SeedEntry[]> {
  const seedPath = path.resolve(process.cwd(), 'data/kospi200-seed.json')
  const raw = await fs.readFile(seedPath, 'utf-8')
  return JSON.parse(raw) as SeedEntry[]
}

/**
 * Yahoo Finance v8 chart API에서 특정 ticker의 OHLCV를 가져온다.
 * range='5y'로 요청해 3년치 이내 날짜만 필터링 (Yahoo API는 '3y'를 지원하지 않음).
 * range='5d'로 최근 5 거래일 증분 수집.
 */
async function fetchOhlcFromYahoo(
  ticker: string,
  range: string,
): Promise<OhlcPoint[]> {
  // '5y' 요청 후 3년 이내 날짜만 반환하기 위한 cutoff 계산
  const cutoffMs = range === '5y'
    ? Date.now() - 3 * 365 * 24 * 60 * 60 * 1000
    : 0

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=${range}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(15_000),
    // 배치 수집이므로 캐시 불필요
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Yahoo Finance HTTP ${res.status} for ${ticker}`)
  }

  const data = await res.json()
  const result = data?.chart?.result?.[0]
  if (!result) return []

  const timestamps: number[] = result.timestamp ?? []
  const quotes = result.indicators?.quote?.[0]
  if (!quotes || timestamps.length === 0) return []

  const points: OhlcPoint[] = []
  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i]
    // 3년치 backfill 시 cutoff 이전 날짜 제외
    if (cutoffMs > 0 && ts * 1000 < cutoffMs) continue

    const open = quotes.open?.[i]
    const high = quotes.high?.[i]
    const low = quotes.low?.[i]
    const close = quotes.close?.[i]

    // OHLC 중 하나라도 null이면 해당 날짜 제외
    if (open == null || high == null || low == null || close == null) continue

    const date = new Date(ts * 1000).toISOString().slice(0, 10)
    points.push({
      date,
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
      // volume은 없을 수 있음
      volume: typeof quotes.volume?.[i] === 'number' ? quotes.volume[i] : null,
    })
  }

  return points
}

/**
 * 특정 ticker의 OHLC를 Yahoo에서 수집해 price_history에 upsert.
 * inserted count (upserted row 수) 반환.
 */
export async function collectOhlcForTicker(ticker: string, range: string): Promise<number> {
  // 백필 시 '3y'는 '5y'로 변환해 날짜 필터링
  const yahooRange = range === '3y' ? '5y' : range

  const points = await fetchOhlcFromYahoo(ticker, yahooRange)
  if (points.length === 0) return 0

  const rows: OhlcRow[] = points.map((p) => ({
    ticker,
    date: p.date,
    open: p.open,
    high: p.high,
    low: p.low,
    close: p.close,
    volume: p.volume,
  }))

  await upsertPriceHistory(rows)
  return rows.length
}

/**
 * 유니버스 전 종목 OHLC 병렬 수집 (동시성 5).
 * 실패한 종목은 에러 로그 후 계속 진행.
 */
export async function collectAllOhlc(
  range: string,
): Promise<{ success: number; failed: number }> {
  const universe = await getUniverse()

  let success = 0
  let failed = 0

  const tasks = universe.map((stock) => async () => {
    try {
      const count = await collectOhlcForTicker(stock.ticker, range)
      console.log(`[ohlc] ${stock.ticker} — ${count} rows (range=${range})`)
      success++
    } catch (err) {
      console.error(`[ohlc] ${stock.ticker} FAILED:`, err)
      failed++
    }
  })

  await withConcurrency(tasks, 5)

  return { success, failed }
}

/**
 * 초기 3년치 백필 (range='3y' → 내부에서 '5y'로 요청 후 3년 이내만 저장).
 * 처음 universe_stocks에 종목이 없을 때 seed에서 로드해 upsert 후 진행.
 */
export async function backfillUniverseHistory(): Promise<void> {
  const existing = await getUniverse()

  // 유니버스가 비어있으면 seed에서 초기화
  if (existing.length === 0) {
    const seeds = await loadUniverseSeed()
    for (const s of seeds) {
      await upsertUniverseStock({
        ticker: toYahooTicker(s.code),
        code: s.code,
        name: s.name,
        market: s.market,
        sector: s.sector ?? null,
      })
    }
    console.log(`[ohlc] universe seeded with ${seeds.length} stocks`)
  }

  const { success, failed } = await collectAllOhlc('3y')
  console.log(`[ohlc] backfill done — success=${success}, failed=${failed}`)
}

/**
 * 일일 증분 갱신 (range='5d', 최근 5 거래일).
 * 이미 저장된 데이터와 중복은 upsert로 처리됨.
 */
export async function updateDailyHistory(): Promise<void> {
  const { success, failed } = await collectAllOhlc('5d')
  console.log(`[ohlc] daily update done — success=${success}, failed=${failed}`)
}
