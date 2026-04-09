import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const assetTypeEnum = pgEnum('asset_type', [
  'stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'savings', 'real_estate'
])

export const priceTypeEnum = pgEnum('price_type', ['live', 'manual'])

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  ticker: varchar('ticker', { length: 20 }),
  assetType: assetTypeEnum('asset_type').notNull(),
  priceType: priceTypeEnum('price_type').notNull(),
  currency: varchar('currency', { length: 3 }).notNull(), // 'KRW' or 'USD'
  notes: varchar('notes', { length: 1000 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
