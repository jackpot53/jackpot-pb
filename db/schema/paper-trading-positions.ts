import {
  pgTable,
  uuid,
  varchar,
  bigint,
  integer,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core'

export const paperTradingStatusEnum = pgEnum('paper_trading_status', [
  'open',
  'closed',
])

export const paperTradingPositions = pgTable('paper_trading_positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  ticker: varchar('ticker', { length: 20 }).notNull(),
  stockName: varchar('stock_name', { length: 100 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  entryPrice: bigint('entry_price', { mode: 'number' }).notNull(),
  entryDate: varchar('entry_date', { length: 10 }).notNull(),
  status: paperTradingStatusEnum('status').notNull().default('open'),
  exitPrice: bigint('exit_price', { mode: 'number' }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
