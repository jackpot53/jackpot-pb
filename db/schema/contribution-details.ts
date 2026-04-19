import { pgTable, uuid, date, timestamp } from 'drizzle-orm/pg-core'
import { assets } from './assets'

export const contributionDetails = pgTable('contribution_details', {
  assetId: uuid('asset_id').primaryKey().references(() => assets.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  depositDate: date('deposit_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ContributionDetailsRow = typeof contributionDetails.$inferSelect
