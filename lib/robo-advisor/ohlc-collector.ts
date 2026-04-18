import path from 'path'
import fs from 'fs/promises'
import { upsertPriceHistory, upsertUniverseStock, getUniverse, type OhlcRow } from '@/db/queries/robo-advisor'
import { fetchKisOhlc } from '@/lib/price/kis'

// KIS API가 반환하는 개별 OHLCV 포인트 (volume은 KIS에서 제공하지 않아 null)
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

/** KST 기준 어제 날짜를 'YYYY-MM-DD' 형식으로 반환 */
function yesterdayKst(): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('sv-SE')
}

/** KST 기준 N일 전 날짜를 'YYYY-MM-DD' 형식으로 반환 */
function daysAgoKst(days: number): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  d.setDate(d.getDate() - days)
  return d.toLocaleDateString('sv-SE')
}

/** data/kospi200-seed.json에서 유니버스 종목 로드 */
export async function loadUniverseSeed(): Promise<SeedEntry[]> {
  const seedPath = path.resolve(process.cwd(), 'data/kospi200-seed.json')
  const raw = await fs.readFile(seedPath, 'utf-8')
  return JSON.parse(raw) as SeedEntry[]
}

/** KIS API에서 특정 ticker의 OHLC를 가져온다. ticker는 '005930.KS' 형식. */
async function fetchOhlcFromKis(
  ticker: string,
  startDate: string,
  endDate: string,
): Promise<OhlcPoint[]> {
  const result = await fetchKisOhlc(ticker, 'stock_kr', startDate, endDate)
  if (result === null) return []

  return result.map((p) => ({
    date: p.date,
    open: p.open,
    high: p.high,
    low: p.low,
    close: p.close,
    volume: null,
  }))
}

/**
 * 특정 ticker의 OHLC를 KIS에서 수집해 price_history에 upsert.
 * inserted count (upserted row 수) 반환.
 */
export async function collectOhlcForTicker(
  ticker: string,
  startDate: string,
  endDate: string,
): Promise<number> {
  const points = await fetchOhlcFromKis(ticker, startDate, endDate)
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
 * 유니버스 전 종목 OHLC 병렬 수집 (동시성 3 — KIS rate limit 안전).
 * 실패한 종목은 에러 로그 후 계속 진행.
 */
export async function collectAllOhlc(
  range: '3y' | '5d',
): Promise<{ success: number; failed: number }> {
  const endDate = yesterdayKst()
  // '3y' → 3년 전, '5d' → 7일 전 (5 거래일 커버)
  const startDate = range === '3y' ? daysAgoKst(365 * 3) : daysAgoKst(7)

  const universe = await getUniverse()

  let success = 0
  let failed = 0

  const tasks = universe.map((stock) => async () => {
    try {
      const count = await collectOhlcForTicker(stock.ticker, startDate, endDate)
      console.log(`[ohlc] ${stock.ticker} — ${count} rows (range=${range})`)
      success++
    } catch (err) {
      console.error(`[ohlc] ${stock.ticker} FAILED:`, err)
      failed++
    }
  })

  await withConcurrency(tasks, 3)

  return { success, failed }
}

/**
 * 초기 3년치 백필.
 * 유니버스가 비어있으면 seed에서 로드해 upsert 후 진행.
 * universe_stocks의 ticker는 '005930.KS' 형식으로 저장됨.
 */
export async function backfillUniverseHistory(): Promise<void> {
  const existing = await getUniverse()

  if (existing.length === 0) {
    const seeds = await loadUniverseSeed()
    for (const s of seeds) {
      await upsertUniverseStock({
        ticker: `${s.code}.KS`,
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
 * 일일 증분 갱신 (최근 5 거래일 커버).
 * 이미 저장된 데이터와 중복은 upsert로 처리됨.
 */
export async function updateDailyHistory(): Promise<void> {
  const { success, failed } = await collectAllOhlc('5d')
  console.log(`[ohlc] daily update done — success=${success}, failed=${failed}`)
}
