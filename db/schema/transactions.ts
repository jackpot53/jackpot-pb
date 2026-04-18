import { pgTable, uuid, bigint, boolean, varchar, date, timestamp, pgEnum, index } from 'drizzle-orm/pg-core'
import { assets, currencyEnum } from './assets'

export const transactionTypeEnum = pgEnum('transaction_type', ['buy', 'sell'])

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id),
  userId: uuid('user_id').notNull(),
  type: transactionTypeEnum('type').notNull(),
  // quantity: units × 10^8 to support fractional shares and crypto (e.g. 0.5 BTC = 50_000_000)
  quantity: bigint('quantity', { mode: 'number' }).notNull(),
  // pricePerUnit: stored in KRW. For USD assets, convert using exchangeRateAtTime.
  pricePerUnit: bigint('price_per_unit', { mode: 'number' }).notNull(),
  fee: bigint('fee', { mode: 'number' }).notNull().default(0),
  currency: currencyEnum('currency').notNull(),
  // exchangeRateAtTime: KRW per 1 USD × 10000 (e.g. 1300.5678 KRW/USD stored as 13005678)
  exchangeRateAtTime: bigint('exchange_rate_at_time', { mode: 'number' }),
  transactionDate: date('transaction_date').notNull(),
  // D-05: Soft delete / void pattern (append-only ledger). Never DELETE transactions.
  isVoided: boolean('is_voided').notNull().default(false),
  notes: varchar('notes', { length: 1000 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('transactions_asset_id_idx').on(table.assetId),
  index('transactions_user_id_idx').on(table.userId),
])
