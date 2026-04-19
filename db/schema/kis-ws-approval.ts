import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core'

// KIS WebSocket approval key — separate credential from REST OAuth token.
// Single-row design (id = "default" for single-user app).
export const kisWsApproval = pgTable('kis_ws_approval', {
  id: varchar('id', { length: 20 }).primaryKey(),
  approvalKey: varchar('approval_key', { length: 512 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
