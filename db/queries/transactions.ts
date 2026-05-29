import { cache } from 'react'
import { db } from '@/db'
import { transactions } from '@/db/schema/transactions'
import { assets } from '@/db/schema/assets'
import { savingsDetails } from '@/db/schema/savings-details'
import { eq, desc, and, asc } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

export type Transaction = InferSelectModel<typeof transactions>

export interface TransactionWithAsset extends Transaction {
  assetName: string
  assetType: string
  ticker: string | null
  depositStartDate: string | null
}

/**
 * 유저의 모든 매도 거래에서 확정손익(실현손익)을 KRW 합계로 반환한다.
 * 각 매도 시점의 평균매입단가는 자산별 거래 순서대로 WAVG를 재계산해 구한다.
 * pricePerUnit은 항상 KRW로 저장되므로 별도 환율 처리 불필요.
 */
export const getRealizedProfitKrw = cache(async (userId: string): Promise<number> => {
  const rows = await db
    .select({
      assetId: transactions.assetId,
      type: transactions.type,
      quantity: transactions.quantity,
      pricePerUnit: transactions.pricePerUnit,
      fee: transactions.fee,
      isVoided: transactions.isVoided,
      transactionDate: transactions.transactionDate,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .innerJoin(assets, and(eq(transactions.assetId, assets.id), eq(assets.userId, userId)))
    .orderBy(transactions.assetId, asc(transactions.transactionDate), asc(transactions.createdAt))

  const byAsset = new Map<string, typeof rows>()
  for (const row of rows) {
    if (!byAsset.has(row.assetId)) byAsset.set(row.assetId, [])
    byAsset.get(row.assetId)!.push(row)
  }

  let total = 0
  for (const txns of byAsset.values()) {
    let avgCost = 0
    let qty = 0
    for (const tx of txns) {
      if (tx.isVoided) continue
      const q = Number(tx.quantity)
      const p = Number(tx.pricePerUnit)
      const f = Number(tx.fee)
      if (tx.type === 'buy') {
        const prevUnits = qty / 1e8
        const addUnits = q / 1e8
        if (qty + q > 0) {
          avgCost = Math.round((avgCost * prevUnits + p * addUnits) / (prevUnits + addUnits))
        }
        qty += q
      } else if (tx.type === 'sell' && q <= qty) {
        const units = q / 1e8
        total += Math.round(units * p) - f - Math.round(units * avgCost)
        qty -= q
      }
    }
  }
  return total
})

export async function getTransactionsByAsset(assetId: string): Promise<Transaction[]> {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.assetId, assetId))
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
}

export const getAllTransactionsWithAsset = cache(async (userId: string): Promise<TransactionWithAsset[]> => {
  const rows = await db
    .select({
      id: transactions.id,
      assetId: transactions.assetId,
      userId: transactions.userId,
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
      ticker: assets.ticker,
      depositStartDate: savingsDetails.depositStartDate,
    })
    .from(transactions)
    .innerJoin(assets, and(eq(transactions.assetId, assets.id), eq(assets.userId, userId)))
    .leftJoin(savingsDetails, eq(transactions.assetId, savingsDetails.assetId))
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
  return rows
})
