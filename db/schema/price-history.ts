import { pgTable, varchar, bigint, date, primaryKey } from 'drizzle-orm/pg-core'

// Daily OHLC price history for universe stocks.
// close, open, high, low stored as integer KRW (원화 정수, no decimal).
// volume stored as share count.
export const priceHistory = pgTable('price_history', {
  ticker: varchar('ticker', { length: 20 }).notNull(),
  date: date('date').notNull(),                       // 'YYYY-MM-DD' (KST 거래일)
  open: bigint('open', { mode: 'number' }).notNull(),
  high: bigint('high', { mode: 'number' }).notNull(),
  low: bigint('low', { mode: 'number' }).notNull(),
  close: bigint('close', { mode: 'number' }).notNull(),
  volume: bigint('volume', { mode: 'number' }),
}, (t) => [
  primaryKey({ columns: [t.ticker, t.date] }),
])
