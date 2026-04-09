import { pgTable, uuid, varchar, bigint, timestamp } from 'drizzle-orm/pg-core'

// Price cache table — used by Phase 3 API adapters (Finnhub, CoinGecko).
// cachedAt is used for TTL checks and stale fallback display.
export const priceCache = pgTable('price_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticker: varchar('ticker', { length: 20 }).notNull().unique(),
  // priceKrw: current price in KRW (BIGINT per D-04)
  priceKrw: bigint('price_krw', { mode: 'number' }).notNull(),
  // priceOriginal: price in original currency (USD cents for US stocks, KRW for KR stocks)
  priceOriginal: bigint('price_original', { mode: 'number' }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  cachedAt: timestamp('cached_at', { withTimezone: true }).notNull().defaultNow(),
})
