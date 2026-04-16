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
  currency?: 'KRW' | 'USD'
  exchangeRateAtTime?: number | null  // KRW per USD × 10000
}

export interface HoldingsResult {
  totalQuantity: number   // ×10^8
  avgCostPerUnit: number  // KRW per unit
  totalCostKrw: number    // total invested KRW (cost basis)
  avgCostPerUnitOriginal: number | null  // USD cents for USD assets, null for KRW
  avgExchangeRateAtTime: number | null   // KRW per USD × 10000, null for KRW assets
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
  let avgCostPerUnitOriginal: number | null = null
  let avgExchangeRateAtTime: number | null = null
  let totalCostKrw = 0
  let isUsd = false

  for (const tx of active) {
    if (tx.type === 'buy') {
      // WAVG: divide by 1e8 first to keep intermediates within safe integer range
      // (avgCostPerUnit * totalQuantity can exceed MAX_SAFE_INTEGER for large fund quantities)
      const prevUnits = totalQuantity / 1e8
      const addUnits = tx.quantity / 1e8
      const newQty = totalQuantity + tx.quantity
      if (newQty > 0) {
        avgCostPerUnit = Math.round(
          (avgCostPerUnit * prevUnits + tx.pricePerUnit * addUnits) / (prevUnits + addUnits)
        )
        // Compute parallel WAVG in original USD cents (pricePerUnit KRW / FX rate → USD × 100)
        // 원화매수(currency='KRW')도 exchangeRateAtTime이 있으면 USD 원가 추적 가능
        if (tx.exchangeRateAtTime && tx.exchangeRateAtTime > 0) {
          isUsd = true
          const txUsdCents = Math.round(tx.pricePerUnit * 1000000 / tx.exchangeRateAtTime)
          const prevOriginal = avgCostPerUnitOriginal ?? 0
          avgCostPerUnitOriginal = Math.round(
            (prevOriginal * prevUnits + txUsdCents * addUnits) / (prevUnits + addUnits)
          )
          // WAVG of exchange rates (quantity-weighted)
          const prevFx = avgExchangeRateAtTime ?? 0
          avgExchangeRateAtTime = Math.round(
            (prevFx * prevUnits + tx.exchangeRateAtTime * addUnits) / (prevUnits + addUnits)
          )
        }
      }
      totalQuantity = newQty
      // Cost = (qty / 1e8) * price + fee — use integer-safe multiply then divide
      const txCost = Math.round((tx.quantity / 1e8) * tx.pricePerUnit) + tx.fee
      totalCostKrw += txCost
    } else if (tx.type === 'sell') {
      // avgCostPerUnit does NOT change on sell (Korean brokerage WAVG convention)
      // Guard: cannot sell more than currently held — skip to prevent negative holdings
      if (tx.quantity > totalQuantity) {
        console.warn(`computeHoldings: sell quantity (${tx.quantity}) exceeds held quantity (${totalQuantity}); skipping transaction`)
        continue
      }
      const soldCostBasis = Math.round((tx.quantity / 1e8) * avgCostPerUnit)
      totalQuantity -= tx.quantity
      totalCostKrw -= soldCostBasis
    }
  }

  return {
    totalQuantity,
    avgCostPerUnit,
    totalCostKrw,
    avgCostPerUnitOriginal: isUsd ? avgCostPerUnitOriginal : null,
    avgExchangeRateAtTime: isUsd ? avgExchangeRateAtTime : null,
  }
}

/**
 * DB write helper: reads all transactions for assetId, computes holdings,
 * and upserts the holdings row. Called after every transaction mutation.
 * NOT pure — reads DB and writes DB.
 */
export async function upsertHoldings(assetId: string, userId: string): Promise<void> {
  const txns = await db
    .select({
      type: transactions.type,
      quantity: transactions.quantity,
      pricePerUnit: transactions.pricePerUnit,
      fee: transactions.fee,
      isVoided: transactions.isVoided,
      currency: transactions.currency,
      exchangeRateAtTime: transactions.exchangeRateAtTime,
    })
    .from(transactions)
    .where(eq(transactions.assetId, assetId))

  const result = computeHoldings(txns)

  await db
    .insert(holdings)
    .values({
      assetId,
      userId,
      totalQuantity: result.totalQuantity,
      avgCostPerUnit: result.avgCostPerUnit,
      totalCostKrw: result.totalCostKrw,
      avgCostPerUnitOriginal: result.avgCostPerUnitOriginal,
      avgExchangeRateAtTime: result.avgExchangeRateAtTime,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: holdings.assetId,
      set: {
        // userId는 업데이트 대상이 아님 — 자산 소유자는 변경되지 않음
        totalQuantity: result.totalQuantity,
        avgCostPerUnit: result.avgCostPerUnit,
        totalCostKrw: result.totalCostKrw,
        avgCostPerUnitOriginal: result.avgCostPerUnitOriginal,
        avgExchangeRateAtTime: result.avgExchangeRateAtTime,
        updatedAt: new Date(),
      },
    })
}
