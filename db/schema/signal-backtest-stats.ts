import { pgTable, varchar, integer, timestamp, primaryKey } from 'drizzle-orm/pg-core'

// Aggregate backtest statistics per signal type and holding period.
// Recalculated weekly from 3-year OHLC history.
// All return/drawdown values stored in basis points (bps): 1% = 100 bps.
export const signalBacktestStats = pgTable('signal_backtest_stats', {
  signalType: varchar('signal_type', { length: 40 }).notNull(),
  holdingDays: integer('holding_days').notNull(),   // 5, 10, 20, 60
  sampleCount: integer('sample_count').notNull(),
  winRate: integer('win_rate_bps').notNull(),        // bps, e.g. 6200 = 62%
  avgReturn: integer('avg_return_bps').notNull(),    // bps, e.g. 340 = +3.4%
  medianReturn: integer('median_return_bps').notNull(),
  maxDrawdown: integer('max_drawdown_bps').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.signalType, t.holdingDays] }),
])
