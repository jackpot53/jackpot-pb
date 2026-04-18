import { db } from '@/db'
import { universeStocks } from '@/db/schema/universe-stocks'
import { priceHistory } from '@/db/schema/price-history'
import { signals } from '@/db/schema/signals'
import { signalBacktestStats } from '@/db/schema/signal-backtest-stats'
import { eq, desc, and, gte, inArray, sql } from 'drizzle-orm'
import { cache } from 'react'

export type UniverseStock = typeof universeStocks.$inferSelect
export type Signal = typeof signals.$inferSelect
export type BacktestStats = typeof signalBacktestStats.$inferSelect
export type OhlcRow = typeof priceHistory.$inferInsert

export type UniverseStockWithSignals = UniverseStock & {
  signals: Signal[]
  latestClose: number | null
  changePercent: number | null
  changeAmount: number | null
}

export const getUniverse = cache(async (): Promise<UniverseStock[]> => {
  return db
    .select()
    .from(universeStocks)
    .where(eq(universeStocks.isActive, true))
    .orderBy(desc(universeStocks.marketCapKrw))
})

export const getUniverseWithSignals = cache(async (): Promise<UniverseStockWithSignals[]> => {
  const stocks = await getUniverse()
  if (stocks.length === 0) return []

  const tickers = stocks.map((s) => s.ticker)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 14)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const [allSignals, recentPrices] = await Promise.all([
    db.select().from(signals).where(inArray(signals.ticker, tickers)),
    db
      .select({ ticker: priceHistory.ticker, close: priceHistory.close })
      .from(priceHistory)
      .where(and(inArray(priceHistory.ticker, tickers), gte(priceHistory.date, cutoffStr)))
      .orderBy(priceHistory.ticker, desc(priceHistory.date)),
  ])

  const signalMap = new Map<string, Signal[]>()
  for (const sig of allSignals) {
    if (!signalMap.has(sig.ticker)) signalMap.set(sig.ticker, [])
    signalMap.get(sig.ticker)!.push(sig)
  }

  const latestMap = new Map<string, number>()
  const prevMap = new Map<string, number>()
  for (const row of recentPrices) {
    if (!latestMap.has(row.ticker)) latestMap.set(row.ticker, Number(row.close))
    else if (!prevMap.has(row.ticker)) prevMap.set(row.ticker, Number(row.close))
  }

  return stocks.map((stock) => {
    const latestClose = latestMap.get(stock.ticker) ?? null
    const prevClose = prevMap.get(stock.ticker) ?? null
    const changePercent =
      latestClose !== null && prevClose !== null && prevClose > 0
        ? ((latestClose - prevClose) / prevClose) * 100
        : null
    const changeAmount = latestClose !== null && prevClose !== null ? latestClose - prevClose : null

    return {
      ...stock,
      signals: signalMap.get(stock.ticker) ?? [],
      latestClose,
      changePercent,
      changeAmount,
    }
  })
})

export const getPriceHistory = async (
  ticker: string,
  days = 120,
): Promise<typeof priceHistory.$inferSelect[]> => {
  return db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.ticker, ticker))
    .orderBy(desc(priceHistory.date))
    .limit(days)
    .then((rows) => rows.reverse())
}

export const getPriceHistoryBulk = async (
  tickers: string[],
  days = 120,
): Promise<Map<string, typeof priceHistory.$inferSelect[]>> => {
  if (tickers.length === 0) return new Map()

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days * 2)
  const cutoff = cutoffDate.toISOString().slice(0, 10)

  const rows = await db
    .select()
    .from(priceHistory)
    .where(
      and(
        inArray(priceHistory.ticker, tickers),
        gte(priceHistory.date, cutoff),
      ),
    )
    .orderBy(priceHistory.ticker, priceHistory.date)

  const map = new Map<string, typeof priceHistory.$inferSelect[]>()
  for (const row of rows) {
    if (!map.has(row.ticker)) map.set(row.ticker, [])
    map.get(row.ticker)!.push(row)
  }
  for (const [ticker, history] of map) {
    if (history.length > days) map.set(ticker, history.slice(-days))
  }
  return map
}

export const getBacktestStats = cache(async (): Promise<BacktestStats[]> => {
  return db
    .select()
    .from(signalBacktestStats)
    .orderBy(signalBacktestStats.signalType, signalBacktestStats.holdingDays)
})

export const getBacktestStatsMap = cache(
  async (): Promise<Map<string, Map<number, BacktestStats>>> => {
    const stats = await getBacktestStats()
    const map = new Map<string, Map<number, BacktestStats>>()
    for (const stat of stats) {
      if (!map.has(stat.signalType)) map.set(stat.signalType, new Map())
      map.get(stat.signalType)!.set(stat.holdingDays, stat)
    }
    return map
  },
)

type UpsertStockInput = {
  ticker: string
  code: string
  name: string
  market: 'KOSPI' | 'KOSDAQ'
  sector: string | null
  marketCapKrw?: number | null
  rank?: number | null
  isActive?: boolean
}

export async function upsertUniverseStock(data: UpsertStockInput): Promise<void> {
  await db
    .insert(universeStocks)
    .values({
      ticker: data.ticker,
      code: data.code,
      name: data.name,
      market: data.market,
      sector: data.sector,
      marketCapKrw: data.marketCapKrw ?? null,
      rank: data.rank ?? null,
      isActive: data.isActive ?? true,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: universeStocks.ticker,
      set: {
        name: data.name,
        sector: data.sector,
        ...(data.marketCapKrw !== undefined ? { marketCapKrw: data.marketCapKrw } : {}),
        ...(data.rank !== undefined ? { rank: data.rank } : {}),
        isActive: data.isActive ?? true,
        updatedAt: new Date(),
      },
    })
}

export async function updateUniverseMarketCap(ticker: string, marketCapKrw: number): Promise<void> {
  await db
    .update(universeStocks)
    .set({ marketCapKrw, updatedAt: new Date() })
    .where(eq(universeStocks.ticker, ticker))
}

// 시가총액 기준으로 rank 재계산 (NULL 시가총액은 마지막)
export async function refreshUniverseRanks(): Promise<void> {
  await db.execute(sql`
    UPDATE universe_stocks
    SET rank = sub.rn
    FROM (
      SELECT ticker,
             ROW_NUMBER() OVER (ORDER BY market_cap_krw DESC NULLS LAST) AS rn
      FROM universe_stocks
      WHERE is_active = true
    ) sub
    WHERE universe_stocks.ticker = sub.ticker
  `)
}

export async function upsertPriceHistory(rows: OhlcRow[]): Promise<void> {
  if (rows.length === 0) return
  await db
    .insert(priceHistory)
    .values(rows)
    .onConflictDoNothing()
}

export async function upsertSignal(
  data: typeof signals.$inferInsert,
): Promise<void> {
  await db
    .insert(signals)
    .values(data)
    .onConflictDoUpdate({
      target: [signals.ticker, signals.signalType],
      set: {
        triggered: data.triggered,
        triggeredAt: data.triggeredAt,
        confidence: data.confidence,
        detail: data.detail,
      },
    })
}

export async function upsertBacktestStats(
  data: typeof signalBacktestStats.$inferInsert,
): Promise<void> {
  await db
    .insert(signalBacktestStats)
    .values(data)
    .onConflictDoUpdate({
      target: [signalBacktestStats.signalType, signalBacktestStats.holdingDays],
      set: {
        sampleCount: data.sampleCount,
        winRate: data.winRate,
        avgReturn: data.avgReturn,
        medianReturn: data.medianReturn,
        maxDrawdown: data.maxDrawdown,
        updatedAt: new Date(),
      },
    })
}
