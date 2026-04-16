import { pgTable, uuid, integer, bigint, varchar, date, boolean, timestamp } from 'drizzle-orm/pg-core'
import { assets } from './assets'

/**
 * 예적금 전용 메타데이터 (1:1 FK on assets.id)
 * 이자율·만기·복리·세금 등 고정수익 상품 속성 저장.
 * 원금·납입액은 transactions 테이블에 저장 (insurance 패턴과 동일).
 */
export const savingsDetails = pgTable('savings_details', {
  assetId: uuid('asset_id').primaryKey().references(() => assets.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  // 'term'(정기예금) | 'recurring'(정기적금) | 'free'(자유적금)
  kind: varchar('kind', { length: 20 }).notNull(),
  // 연이자율 basis point ×100 (e.g. 5.25% → 52500). NULL이면 자동계산 불가.
  interestRateBp: integer('interest_rate_bp'),
  // 가입일. term은 이자 기산일. recurring/free는 각 buy tx의 transactionDate 사용.
  depositStartDate: date('deposit_start_date'),
  // 만기일. NULL = 만기 미정 (자유적금 등)
  maturityDate: date('maturity_date'),
  // 계획 월납입액 KRW (recurring/free). 원클릭 납입 버튼의 기본값.
  monthlyContributionKrw: bigint('monthly_contribution_krw', { mode: 'number' }),
  // 'simple'(단리) | 'monthly'(월복리)
  compoundType: varchar('compound_type', { length: 10 }).notNull().default('simple'),
  // 'taxable'(15.4%) | 'tax_free'(0%) | 'preferential'(9.5%)
  taxType: varchar('tax_type', { length: 10 }).notNull().default('taxable'),
  // 만기 자동갱신
  autoRenew: boolean('auto_renew').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type SavingsDetailsRow = typeof savingsDetails.$inferSelect
export type SavingsDetailsInsert = typeof savingsDetails.$inferInsert
