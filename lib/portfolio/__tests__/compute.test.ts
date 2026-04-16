import { describe, it, expect } from 'vitest'
import {
  computeAssetPerformance,
  computePortfolio,
  aggregateByType,
  formatKrw,
  formatReturn,
  formatQty,
} from '../portfolio'

describe('computeAssetPerformance', () => {
  const baseLiveHolding = {
    assetId: 'asset-1',
    name: 'Apple Inc.',
    ticker: 'AAPL',
    assetType: 'stock_us' as const,
    priceType: 'live' as const,
    currency: 'USD' as const,
    accountType: null,
    brokerageId: null,
    owner: null,
    notes: null,
    totalQuantity: 200_00000000, // 200.00000000 units (×10^8)
    avgCostPerUnit: 1_000_000,   // ₩1,000,000 per unit
    avgCostPerUnitOriginal: null,
    avgExchangeRateAtTime: null,
    totalCostKrw: 200_000_000,   // ₩200,000,000 total invested
  }

  it('computes currentValueKrw and returnPct for LIVE asset', () => {
    const result = computeAssetPerformance({
      holding: baseLiveHolding,
      currentPriceKrw: 1_200_000,
      isStale: false,
      cachedAt: new Date(),
      latestManualValuationKrw: null,
    })
    expect(result.currentValueKrw).toBe(240_000_000) // 200 × 1,200,000
    expect(result.returnPct).toBeCloseTo(20.0)
    expect(result.isStale).toBe(false)
  })

  it('uses latestManualValuationKrw for MANUAL assets (D-16)', () => {
    const manualHolding = {
      ...baseLiveHolding,
      assetType: 'savings' as const,
      priceType: 'manual' as const,
      totalCostKrw: 45_000_000,
    }
    const result = computeAssetPerformance({
      holding: manualHolding,
      currentPriceKrw: 0,
      isStale: false,
      cachedAt: null,
      latestManualValuationKrw: 50_000_000,
    })
    expect(result.currentValueKrw).toBe(50_000_000)
    expect(result.returnPct).toBeCloseTo(11.11, 1)
  })

  it('returns returnPct=0 when totalCostKrw is zero (avoid divide-by-zero)', () => {
    const result = computeAssetPerformance({
      holding: { ...baseLiveHolding, totalCostKrw: 0 },
      currentPriceKrw: 1_200_000,
      isStale: false,
      cachedAt: null,
      latestManualValuationKrw: null,
    })
    expect(result.returnPct).toBe(0)
    expect(isFinite(result.returnPct)).toBe(true)
  })
})

describe('computePortfolio', () => {
  const assets = [
    { currentValueKrw: 240_000_000, totalCostKrw: 200_000_000, assetType: 'stock_us' as const },
    { currentValueKrw: 50_000_000, totalCostKrw: 45_000_000, assetType: 'savings' as const },
  ]

  it('computes totalValueKrw as sum of all currentValueKrw', () => {
    const summary = computePortfolio(assets as any, 13_500_000)
    expect(summary.totalValueKrw).toBe(290_000_000)
  })

  it('computes totalValueUsd using fxRateInt (D-17)', () => {
    // fxRateInt = 13_500_000 (1350.0 KRW/USD)
    const summary = computePortfolio(assets as any, 13_500_000)
    const expectedUsd = 290_000_000 / (13_500_000 / 10000) // = 290_000_000 / 1350.0
    expect(summary.totalValueUsd).toBeCloseTo(expectedUsd, 0)
  })

  it('computes gainLossKrw and overall returnPct', () => {
    const summary = computePortfolio(assets as any, 13_500_000)
    expect(summary.gainLossKrw).toBe(45_000_000)  // 290M - 245M
    expect(summary.returnPct).toBeCloseTo(18.37, 1)  // 45M/245M × 100
  })
})

describe('aggregateByType', () => {
  it('groups by assetType and computes sharePct', () => {
    const assets = [
      { assetType: 'stock_us' as const, currentValueKrw: 200_000_000 },
      { assetType: 'stock_us' as const, currentValueKrw: 40_000_000 },
      { assetType: 'savings' as const, currentValueKrw: 60_000_000 },
    ]
    const result = aggregateByType(assets as any)
    const stockEntry = result.find(r => r.assetType === 'stock_us')!
    const savingsEntry = result.find(r => r.assetType === 'savings')!
    expect(stockEntry.totalValueKrw).toBe(240_000_000)
    expect(savingsEntry.totalValueKrw).toBe(60_000_000)
    expect(stockEntry.sharePct).toBeCloseTo(80.0, 1)
    expect(savingsEntry.sharePct).toBeCloseTo(20.0, 1)
  })
})

describe('formatKrw', () => {
  it('formats with Korean locale and won sign', () => {
    expect(formatKrw(1_234_567)).toMatch(/₩/)
    expect(formatKrw(1_234_567)).toMatch(/1,234,567/)
  })
  it('formats zero', () => {
    expect(formatKrw(0)).toMatch(/₩/)
  })
})

describe('formatReturn', () => {
  it('prefixes positive with +', () => {
    expect(formatReturn(20.0)).toBe('+20.0%')
  })
  it('formats negative with - sign', () => {
    expect(formatReturn(-3.2)).toBe('-3.2%')
  })
  it('formats zero without sign', () => {
    expect(formatReturn(0)).toBe('0.0%')
  })
})

describe('formatQty', () => {
  it('formats integer quantity for non-crypto', () => {
    expect(formatQty(200_00000000, false)).toBe('200')
  })
  it('formats crypto with up to 8 decimals, no trailing zeros', () => {
    expect(formatQty(5_12345678, true)).toBe('5.12345678')
    expect(formatQty(1_00000000, true)).toBe('1')  // trailing zeros stripped
  })
})
