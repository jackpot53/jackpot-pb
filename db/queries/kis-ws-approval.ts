import { db } from '@/db'
import { kisWsApproval } from '@/db/schema/kis-ws-approval'
import { eq } from 'drizzle-orm'

export async function getKisApproval(): Promise<{ approvalKey: string; expiresAt: Date } | null> {
  const rows = await db
    .select()
    .from(kisWsApproval)
    .where(eq(kisWsApproval.id, 'default'))
    .limit(1)
  return rows[0] ? { approvalKey: rows[0].approvalKey, expiresAt: rows[0].expiresAt } : null
}

export async function upsertKisApproval(approvalKey: string, expiresAt: Date): Promise<void> {
  await db
    .insert(kisWsApproval)
    .values({ id: 'default', approvalKey, expiresAt })
    .onConflictDoUpdate({
      target: kisWsApproval.id,
      set: { approvalKey, expiresAt },
    })
}
