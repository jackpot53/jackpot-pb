import { db } from '@/db'
import { kisOauthTokens } from '@/db/schema/kis-oauth-tokens'
import { eq } from 'drizzle-orm'

export type KisTokenRow = typeof kisOauthTokens.$inferSelect

export async function getKisToken(): Promise<{ tokenValue: string; expiresAt: Date } | null> {
  const rows = await db
    .select()
    .from(kisOauthTokens)
    .where(eq(kisOauthTokens.id, 'default'))
    .limit(1)
  return rows[0] ? { tokenValue: rows[0].tokenValue, expiresAt: rows[0].expiresAt } : null
}

export async function upsertKisToken(tokenValue: string, expiresAt: Date): Promise<void> {
  const now = new Date()
  await db
    .insert(kisOauthTokens)
    .values({ id: 'default', tokenValue, expiresAt, createdAt: now })
    .onConflictDoUpdate({
      target: kisOauthTokens.id,
      set: {
        tokenValue,
        expiresAt,
      },
    })
}
