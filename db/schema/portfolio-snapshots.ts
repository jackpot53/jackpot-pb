import { pgTable, uuid, bigint, date, timestamp } from 'drizzle-orm/pg-core'

// PortfolioSnapshot — populated by Phase 4 nightly cron job (Vercel Cron, D-02).
// One row per day. Used as the data source for annual/monthly return charts.
export const portfolioSnapshots = pgTable('portfolio_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  snapshotDate: date('snapshot_date').notNull(),
  totalValueKrw: bigint('total_value_krw', { mode: 'number' }).notNull(),
  totalCostKrw: bigint('total_cost_krw', { mode: 'number' }).notNull(),
  // returnBps: return in basis points (return% × 10000), e.g. 12.34% = 12340 bps
  returnBps: bigint('return_bps', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
