import { db } from '@/db'
import { priceCache } from '@/db/schema/price-cache'
import { eq, inArray } from 'drizzle-orm'

export type PriceCacheRow = typeof priceCache.$inferSelect

export async function getPriceCacheByTicker(ticker: string): Promise<PriceCacheRow | null> {
  const rows = await db.select().from(priceCache).where(eq(priceCache.ticker, ticker)).limit(1)
  return rows[0] ?? null
}

export async function getPriceCacheByTickers(
  tickers: string[]
): Promise<Map<string, PriceCacheRow>> {
  if (tickers.length === 0) return new Map()
  const rows = await db
    .select()
    .from(priceCache)
    .where(inArray(priceCache.ticker, tickers))
  return new Map(rows.map((r) => [r.ticker, r]))
}

export async function upsertPriceCache(values: {
  ticker: string
  priceKrw: number
  priceOriginal: number
  currency: 'KRW' | 'USD'
}): Promise<void> {
  const now = new Date()
  await db
    .insert(priceCache)
    .values({ ...values, cachedAt: now })
    .onConflictDoUpdate({
      target: priceCache.ticker,
      set: {
        priceKrw: values.priceKrw,
        priceOriginal: values.priceOriginal,
        currency: values.currency,
        cachedAt: now,
      },
    })
}
