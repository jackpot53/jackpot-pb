import { describe, it, expect } from 'vitest'
import { computeHoldings } from '@/lib/holdings'

// Helper to create a buy transaction
function buy(qty: number, price: number, fee = 0) {
  return { type: 'buy' as const, quantity: qty, pricePerUnit: price, fee, isVoided: false }
}
function sell(qty: number, price: number, fee = 0) {
  return { type: 'sell' as const, quantity: qty, pricePerUnit: price, fee, isVoided: false }
}
function voided(tx: ReturnType<typeof buy> | ReturnType<typeof sell>) {
  return { ...tx, isVoided: true }
}

describe('computeHoldings', () => {
  it('returns zeros for empty array', () => {
    expect(computeHoldings([])).toEqual({ totalQuantity: 0, avgCostPerUnit: 0, totalCostKrw: 0 })
  })

  it('single buy no fee', () => {
    const result = computeHoldings([buy(1_00000000, 50000)])
    expect(result).toEqual({ totalQuantity: 1_00000000, avgCostPerUnit: 50000, totalCostKrw: 50000 })
  })

  it('single buy with fee adds fee to totalCostKrw', () => {
    const result = computeHoldings([buy(1_00000000, 50000, 500)])
    expect(result).toEqual({ totalQuantity: 1_00000000, avgCostPerUnit: 50000, totalCostKrw: 50500 })
  })

  it('two buys: WAVG recalculates', () => {
    const result = computeHoldings([buy(1_00000000, 50000), buy(1_00000000, 60000)])
    expect(result).toEqual({ totalQuantity: 2_00000000, avgCostPerUnit: 55000, totalCostKrw: 110000 })
  })

  it('partial sell: avgCostPerUnit unchanged, quantity and cost decrease', () => {
    const txns = [buy(1_00000000, 50000), buy(1_00000000, 60000), sell(50_000_000, 60000)]
    const result = computeHoldings(txns)
    expect(result.totalQuantity).toBe(1_50000000)
    expect(result.avgCostPerUnit).toBe(55000) // unchanged on sell
    // soldCostBasis = Math.round(50_000_000 / 1e8 * 55000) = Math.round(0.5 * 55000) = 27500
    expect(result.totalCostKrw).toBe(110000 - 27500) // = 82500
  })

  it('buy after sell: WAVG computed from remaining position', () => {
    // buy 1 @ 100k, sell 0.5, buy 0.5 @ 120k
    const txns = [buy(1_00000000, 100000), sell(50_000_000, 100000), buy(50_000_000, 120000)]
    const result = computeHoldings(txns)
    // After sell: qty=50_000_000, avg=100000, cost=50000
    // After second buy: new avg = Math.round((100000*50_000_000 + 120000*50_000_000) / 100_000_000) = 110000
    expect(result.totalQuantity).toBe(1_00000000)
    expect(result.avgCostPerUnit).toBe(110000)
    // cost after sell = 50000; second buy adds 60000 → total 110000
    expect(result.totalCostKrw).toBe(110000)
  })

  it('all voided returns zeros', () => {
    const txns = [voided(buy(1_00000000, 50000)), voided(buy(1_00000000, 60000))]
    expect(computeHoldings(txns)).toEqual({ totalQuantity: 0, avgCostPerUnit: 0, totalCostKrw: 0 })
  })

  it('mixed void: voided txns excluded', () => {
    const txns = [voided(buy(1_00000000, 50000)), buy(1_00000000, 60000)]
    const result = computeHoldings(txns)
    expect(result).toEqual({ totalQuantity: 1_00000000, avgCostPerUnit: 60000, totalCostKrw: 60000 })
  })
})
