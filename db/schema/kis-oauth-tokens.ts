import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core'

// KIS OAuth token storage — single-row design (id = "default" for single-user app)
export const kisOauthTokens = pgTable('kis_oauth_tokens', {
  id: varchar('id', { length: 20 }).primaryKey(),
  tokenValue: varchar('token_value', { length: 2048 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
