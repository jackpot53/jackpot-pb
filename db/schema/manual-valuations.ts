import { pgTable, uuid, bigint, varchar, date, timestamp, index } from 'drizzle-orm/pg-core'
import { assets, currencyEnum } from './assets'

// D-06: Append-only table — INSERT only. No UPDATE or DELETE operations allowed.
// No updatedAt column intentionally (would imply mutability).
export const manualValuations = pgTable('manual_valuations', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id),
  userId: uuid('user_id').notNull(),
  valueKrw: bigint('value_krw', { mode: 'number' }).notNull(),
  currency: currencyEnum('currency').notNull(),
  exchangeRateAtTime: bigint('exchange_rate_at_time', { mode: 'number' }),
  valuedAt: date('valued_at').notNull(),
  notes: varchar('notes', { length: 1000 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('manual_valuations_asset_id_idx').on(table.assetId),
])
