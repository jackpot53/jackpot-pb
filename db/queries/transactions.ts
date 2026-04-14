import { db } from '@/db'
import { transactions } from '@/db/schema/transactions'
import { eq, desc } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

export type Transaction = InferSelectModel<typeof transactions>

export async function getTransactionsByAsset(assetId: string): Promise<Transaction[]> {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.assetId, assetId))
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
}
