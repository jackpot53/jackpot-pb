import { db } from '@/db'
import { transactions } from '@/db/schema/transactions'
import { assets } from '@/db/schema/assets'
import { eq, desc } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

export type Transaction = InferSelectModel<typeof transactions>

export interface TransactionWithAsset extends Transaction {
  assetName: string
  assetType: string
}

export async function getTransactionsByAsset(assetId: string): Promise<Transaction[]> {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.assetId, assetId))
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
}

export async function getAllTransactionsWithAsset(): Promise<TransactionWithAsset[]> {
  const rows = await db
    .select({
      id: transactions.id,
      assetId: transactions.assetId,
      type: transactions.type,
      quantity: transactions.quantity,
      pricePerUnit: transactions.pricePerUnit,
      fee: transactions.fee,
      currency: transactions.currency,
      exchangeRateAtTime: transactions.exchangeRateAtTime,
      transactionDate: transactions.transactionDate,
      isVoided: transactions.isVoided,
      notes: transactions.notes,
      createdAt: transactions.createdAt,
      assetName: assets.name,
      assetType: assets.assetType,
    })
    .from(transactions)
    .innerJoin(assets, eq(transactions.assetId, assets.id))
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
  return rows
}
