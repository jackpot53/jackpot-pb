import { db } from '@/db'
import { holdings } from '@/db/schema/holdings'
import { transactions } from '@/db/schema/transactions'
import { eq } from 'drizzle-orm'

export interface TransactionInput {
  type: 'buy' | 'sell'
  quantity: number      // ×10^8 integer
  pricePerUnit: number  // KRW BIGINT
  fee: number           // KRW BIGINT (0 if not set)
  isVoided: boolean
}

export interface HoldingsResult {
  totalQuantity: number   // ×10^8
  avgCostPerUnit: number  // KRW per unit
  totalCostKrw: number    // total invested KRW (cost basis)
}

/**
 * Pure function: computes holdings state from a transaction log.
 * All arithmetic is integer-safe. Math.round() applied only at final division.
 * Side-effect free — does not read or write DB.
 */
export function computeHoldings(txns: TransactionInput[]): HoldingsResult {
  const active = txns.filter((t) => !t.isVoided)

  let totalQuantity = 0
  let avgCostPerUnit = 0
  let totalCostKrw = 0

  for (const tx of active) {
    if (tx.type === 'buy') {
      // WAVG formula: keep integer precision by using Math.round only at final division
      const newQty = totalQuantity + tx.quantity
      if (newQty > 0) {
        avgCostPerUnit = Math.round(
          (avgCostPerUnit * totalQuantity + tx.pricePerUnit * tx.quantity) / newQty
        )
      }
      totalQuantity = newQty
      // Cost = (qty / 1e8) * price + fee — use integer-safe multiply then divide
      const txCost = Math.round((tx.quantity / 1e8) * tx.pricePerUnit) + tx.fee
      totalCostKrw += txCost
    } else if (tx.type === 'sell') {
      // avgCostPerUnit does NOT change on sell (Korean brokerage WAVG convention)
      const soldCostBasis = Math.round((tx.quantity / 1e8) * avgCostPerUnit)
      totalQuantity -= tx.quantity
      totalCostKrw -= soldCostBasis
    }
  }

  return { totalQuantity, avgCostPerUnit, totalCostKrw }
}

/**
 * DB write helper: reads all transactions for assetId, computes holdings,
 * and upserts the holdings row. Called after every transaction mutation.
 * NOT pure — reads DB and writes DB.
 */
export async function upsertHoldings(assetId: string): Promise<void> {
  const txns = await db
    .select({
      type: transactions.type,
      quantity: transactions.quantity,
      pricePerUnit: transactions.pricePerUnit,
      fee: transactions.fee,
      isVoided: transactions.isVoided,
    })
    .from(transactions)
    .where(eq(transactions.assetId, assetId))

  const result = computeHoldings(txns)

  await db
    .insert(holdings)
    .values({
      assetId,
      totalQuantity: result.totalQuantity,
      avgCostPerUnit: result.avgCostPerUnit,
      totalCostKrw: result.totalCostKrw,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: holdings.assetId,
      set: {
        totalQuantity: result.totalQuantity,
        avgCostPerUnit: result.avgCostPerUnit,
        totalCostKrw: result.totalCostKrw,
        updatedAt: new Date(),
      },
    })
}
