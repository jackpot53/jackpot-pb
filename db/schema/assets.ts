import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const assetTypeEnum = pgEnum('asset_type', [
  'stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'savings', 'real_estate', 'fund'
])

export const priceTypeEnum = pgEnum('price_type', ['live', 'manual'])

export const currencyEnum = pgEnum('currency', ['KRW', 'USD'])

export const accountTypeEnum = pgEnum('account_type', ['isa', 'irp', 'pension', 'dc', 'brokerage', 'spot'])

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  ticker: varchar('ticker', { length: 20 }),
  assetType: assetTypeEnum('asset_type').notNull(),
  priceType: priceTypeEnum('price_type').notNull(),
  currency: currencyEnum('currency').notNull(),
  accountType: accountTypeEnum('account_type'),
  notes: varchar('notes', { length: 1000 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
