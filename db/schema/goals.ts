import { pgTable, uuid, varchar, bigint, date, timestamp } from 'drizzle-orm/pg-core'

// Goals — Phase 5 feature. Defined in Phase 1 schema to avoid future migration cost.
export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  targetAmountKrw: bigint('target_amount_krw', { mode: 'number' }).notNull(),
  targetDate: date('target_date'), // nullable — open-ended goals have no deadline
  notes: varchar('notes', { length: 1000 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
})
