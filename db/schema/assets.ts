import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const assetTypeEnum = pgEnum('asset_type', [
  'stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'savings', 'real_estate', 'fund', 'insurance', 'precious_metal', 'cma'
])

export const priceTypeEnum = pgEnum('price_type', ['live', 'manual'])

export const currencyEnum = pgEnum('currency', ['KRW', 'USD'])

export const accountTypeEnum = pgEnum('account_type', [
  'isa', 'irp', 'pension', 'dc', 'brokerage', 'spot', 'cma', 'insurance',
  'upbit', 'bithumb', 'coinone', 'korbit', 'binance', 'coinbase', 'kraken', 'okx',
  'fund_mirae', 'fund_samsung', 'fund_kb', 'fund_shinhan', 'fund_hanwha',
  'fund_nh', 'fund_korea', 'fund_kiwoom', 'fund_hana', 'fund_woori',
  'fund_ibk', 'fund_daishin', 'fund_timefolio', 'fund_truston',
  'bank_kb', 'bank_shinhan', 'bank_woori', 'bank_hana', 'bank_nh',
  'bank_kakao', 'bank_toss', 'bank_k', 'bank_ibk', 'bank_kdb',
  'bank_busan', 'bank_daegu', 'bank_gwangju', 'bank_jeonbuk', 'bank_jeju',
  'bank_sbi', 'bank_ok', 'bank_welcome', 'bank_pepper',
  'bank_shincom', 'bank_saemaul',
  'ins_samsung_life', 'ins_hanwha_life', 'ins_kyobo', 'ins_shinhan_life', 'ins_nh_life', 'ins_kb_life',
  'ins_aia', 'ins_metlife', 'ins_prudential',
  'ins_samsung_fire', 'ins_hyundai', 'ins_db_fire', 'ins_kb_fire', 'ins_meritz', 'ins_hanwha_fire', 'ins_lotte_fire',
])

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  ticker: varchar('ticker', { length: 20 }),
  assetType: assetTypeEnum('asset_type').notNull(),
  priceType: priceTypeEnum('price_type').notNull(),
  currency: currencyEnum('currency').notNull(),
  accountType: accountTypeEnum('account_type'),
  brokerageId: varchar('brokerage_id', { length: 50 }),
  withdrawalBankId: varchar('withdrawal_bank_id', { length: 50 }),
  owner: varchar('owner', { length: 20 }),
  notes: varchar('notes', { length: 1000 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
