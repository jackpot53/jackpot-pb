import { pgTable, uuid, integer, bigint, varchar, date, boolean, timestamp } from 'drizzle-orm/pg-core'
import { assets } from './assets'

/**
 * 보험 전용 메타데이터 (1:1 FK on assets.id)
 * 납입주기·만기·보험가입금액 등 계약 속성 저장.
 * 납입액(원금)은 transactions 테이블에 저장 (savings_details 패턴과 동일).
 */
export const insuranceDetails = pgTable('insurance_details', {
  assetId: uuid('asset_id').primaryKey().references(() => assets.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  // 'protection'(보장성: 종신/정기/실손/건강) | 'savings'(저축성: 연금/변액/저축보험)
  category: varchar('category', { length: 20 }).notNull(),
  // 납입 주기: 'monthly' | 'quarterly' | 'yearly' | 'lump_sum'
  paymentCycle: varchar('payment_cycle', { length: 10 }).notNull().default('monthly'),
  // 주기당 납입액 KRW (월납이면 월납액, 연납이면 연납액). 원클릭 납입 버튼 기본값.
  premiumPerCycleKrw: bigint('premium_per_cycle_krw', { mode: 'number' }),
  // 계약일 (nullable; null이면 첫 buy tx의 transactionDate 사용)
  contractDate: date('contract_date'),
  // 납입 시작일
  paymentStartDate: date('payment_start_date'),
  // 납입 만료일 (예: 20년납). NULL = 종신납
  paymentEndDate: date('payment_end_date'),
  // 보장 만료일 / 만기일. NULL = 종신보장
  coverageEndDate: date('coverage_end_date'),
  // 보험가입금액 (사망보험금 / 만기수령 기준액) — 보장성 중심
  sumInsuredKrw: bigint('sum_insured_krw', { mode: 'number' }),
  // 예상 공시이율 bp ×100 (e.g. 3.5% → 35000) — 저축성(연금/변액/저축)용
  expectedReturnRateBp: integer('expected_return_rate_bp'),
  // 납입 완료 여부 (감액완납 등으로 더 이상 납입하지 않는 상태)
  isPaidUp: boolean('is_paid_up').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type InsuranceDetailsRow = typeof insuranceDetails.$inferSelect
export type InsuranceDetailsInsert = typeof insuranceDetails.$inferInsert
