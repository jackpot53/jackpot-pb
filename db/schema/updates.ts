import { pgTable, serial, varchar, date, timestamp, text, pgEnum } from 'drizzle-orm/pg-core'

export const updateCategoryEnum = pgEnum('update_category', ['신기능', '개선', '버그수정', '보안'])

export const updates = pgTable('updates', {
  id: serial('id').primaryKey(),
  version: varchar('version', { length: 20 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  date: date('date').notNull(),
  category: updateCategoryEnum('category').notNull(),
  items: text('items').array().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
