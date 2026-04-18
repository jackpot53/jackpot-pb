import { pgTable, uuid, bigint, varchar, date, timestamp, unique } from 'drizzle-orm/pg-core'

// Append-only: cron이 매일 live NAV를 INSERT, 수동 NAV 동기화도 INSERT.
// per D-06 원칙: UPDATE/DELETE 없음.
export const fundNavHistory = pgTable('fund_nav_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticker: varchar('ticker', { length: 32 }).notNull(),
  navKrw: bigint('nav_krw', { mode: 'number' }).notNull(),  // priceCache와 동일 단위 (KRW × 100)
  recordedAt: date('recorded_at').notNull(),
  source: varchar('source', { length: 16 }).notNull(),       // 'live' | 'manual'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('fund_nav_history_ticker_date').on(t.ticker, t.recordedAt),
])
