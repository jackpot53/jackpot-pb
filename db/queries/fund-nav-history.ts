import { db } from '@/db'
import { fundNavHistory } from '@/db/schema/fund-nav-history'
import { eq, asc, inArray } from 'drizzle-orm'

export type FundNavHistoryRow = typeof fundNavHistory.$inferSelect

/** ticker별 전체 NAV 이력 (날짜 오름차순) */
export async function getFundNavHistory(ticker: string): Promise<FundNavHistoryRow[]> {
  return db
    .select()
    .from(fundNavHistory)
    .where(eq(fundNavHistory.ticker, ticker))
    .orderBy(asc(fundNavHistory.recordedAt))
}

/** cron에서 매일 호출: (ticker, date) unique constraint으로 멱등 */
export async function upsertFundNavHistory(rows: {
  ticker: string
  navKrw: number
  recordedAt: string
  source: 'live' | 'manual'
}[]): Promise<void> {
  if (rows.length === 0) return
  await db
    .insert(fundNavHistory)
    .values(rows)
    .onConflictDoNothing()
}

/** 티커 목록의 최신 recordedAt 조회 (중복 스냅샷 방지용) */
export async function getLatestNavDates(tickers: string[]): Promise<Map<string, string>> {
  if (tickers.length === 0) return new Map()
  const rows = await db
    .selectDistinctOn([fundNavHistory.ticker], {
      ticker: fundNavHistory.ticker,
      recordedAt: fundNavHistory.recordedAt,
    })
    .from(fundNavHistory)
    .where(inArray(fundNavHistory.ticker, tickers))
    .orderBy(fundNavHistory.ticker, asc(fundNavHistory.recordedAt))
  return new Map(rows.map(r => [r.ticker, r.recordedAt]))
}
