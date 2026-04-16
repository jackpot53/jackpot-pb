import { pgTable, uuid, bigint, timestamp } from 'drizzle-orm/pg-core'
import { assets } from './assets'

// Holdings aggregate table — maintained by application layer (Phase 2).
// Stores the current aggregate position per asset to avoid recomputing from full transaction log.
export const holdings = pgTable('holdings', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().unique().references(() => assets.id),
  userId: uuid('user_id').notNull(),
  // totalQuantity: units × 10^8 (matches transactions.quantity scale)
  totalQuantity: bigint('total_quantity', { mode: 'number' }).notNull().default(0),
  // avgCostPerUnit: weighted average cost in KRW × 10^8 (per-unit, KRW)
  avgCostPerUnit: bigint('avg_cost_per_unit', { mode: 'number' }).notNull().default(0),
  // totalCostKrw: total amount invested in KRW (sum of buy transactions)
  totalCostKrw: bigint('total_cost_krw', { mode: 'number' }).notNull().default(0),
  // avgCostPerUnitOriginal: weighted average purchase price in original currency (USD cents for USD assets, null for KRW)
  avgCostPerUnitOriginal: bigint('avg_cost_per_unit_original', { mode: 'number' }),
  // avgExchangeRateAtTime: weighted average FX rate at purchase time (KRW per USD × 10000, null for KRW assets)
  avgExchangeRateAtTime: bigint('avg_exchange_rate_at_time', { mode: 'number' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
