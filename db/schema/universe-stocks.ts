import { pgTable, uuid, varchar, bigint, integer, boolean, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core'

export const krMarketEnum = pgEnum('kr_market', ['KOSPI', 'KOSDAQ'])

export const universeStocks = pgTable('universe_stocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticker: varchar('ticker', { length: 20 }).notNull(),   // '005930.KS'
  code: varchar('code', { length: 6 }).notNull(),         // '005930'
  name: varchar('name', { length: 100 }).notNull(),
  market: krMarketEnum('market').notNull(),
  sector: varchar('sector', { length: 50 }),
  // marketCapKrw: KRX 시가총액 (원화), daily refresh
  marketCapKrw: bigint('market_cap_krw', { mode: 'number' }),
  rank: integer('rank'),
  isActive: boolean('is_active').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('universe_stocks_ticker').on(t.ticker),
])
