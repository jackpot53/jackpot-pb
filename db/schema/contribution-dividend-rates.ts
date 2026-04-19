import { pgTable, uuid, integer, timestamp, unique } from 'drizzle-orm/pg-core'
import { assets } from './assets'

export const contributionDividendRates = pgTable('contribution_dividend_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  year: integer('year').notNull(),
  rateBp: integer('rate_bp').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique().on(table.assetId, table.year),
])

export type ContributionDividendRateRow = typeof contributionDividendRates.$inferSelect
