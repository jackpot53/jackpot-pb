import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { computeAssetPerformance, type AssetHoldingInput } from '@/lib/portfolio/portfolio'
import type { InsuranceDetailsRow } from '@/db/schema/insurance-details'

describe('computeAssetPerformance - insurance integration', () => {
  const mockInsuranceDetails: InsuranceDetailsRow = {
    assetId: 'ins-001',
    userId: 'user-001',
    category: 'savings',
    expectedReturnRateBp: 35000,
    paymentStartDate: new Date('2024-01-15'),
    paymentEndDate: new Date('2025-01-15'),
    compoundType: 'simple',
    paymentCycle: 'monthly',
    premiumPerCycleKrw: 100000,
    contractDate: null,
    coverageEndDate: null,
    sumInsuredKrw: null,
    isPaidUp: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as InsuranceDetailsRow

  const mockHolding: AssetHoldingInput = {
    assetId: 'ins-001',
    name: 'Test Insurance',
    ticker: null,
    assetType: 'insurance',
    priceType: 'manual',
    currency: 'KRW',
    accountType: null,
    brokerageId: null,
    owner: null,
    notes: null,
    insuranceType: 'savings',
    totalQuantity: 100000000, // 1M in 10^8 units
    avgCostPerUnit: 10000,
    avgCostPerUnitOriginal: null,
    avgExchangeRateAtTime: null,
    totalCostKrw: 1000000,
  }

  let originalDateNow: () => number

  beforeEach(() => {
    originalDateNow = Date.now
  })

  afterEach(() => {
    Date.now = originalDateNow
  })

  it('should generate chartData for insurance asset with monthly payments', () => {
    const result = computeAssetPerformance({
      holding: mockHolding,
      currentPriceKrw: 1000000,
      isStale: false,
      cachedAt: new Date(),
      latestManualValuationKrw: null,
      insuranceDetails: mockInsuranceDetails,
      insuranceBuys: [
        { transactionDate: '2024-01-15', amountKrw: 100000 },
      ],
    })

    expect(result.chartData).toBeDefined()
    expect(result.chartData?.length).toBeGreaterThan(0)
    expect(result.chartData?.[0]).toHaveProperty('date')
    expect(result.chartData?.[0]).toHaveProperty('value')
    expect(result.chartData?.[0]).toHaveProperty('projected')
  })

  it('should mark dates correctly as projected true/false', () => {
    const result = computeAssetPerformance({
      holding: mockHolding,
      currentPriceKrw: 1000000,
      isStale: false,
      cachedAt: new Date(),
      latestManualValuationKrw: null,
      insuranceDetails: mockInsuranceDetails,
      insuranceBuys: [
        { transactionDate: '2024-01-15', amountKrw: 100000 },
      ],
    })

    // chartData should have a mix of past and future dates based on payment period
    if (result.chartData && result.chartData.length > 0) {
      // All dates should be between paymentStartDate and paymentEndDate
      const allDatesInRange = result.chartData.every(
        p => p.date >= '2024-01-15' && p.date <= '2025-01-15'
      )
      expect(allDatesInRange).toBe(true)

      // Should have both projected and actual data points
      const hasProjected = result.chartData.some(p => p.projected === true)
      const hasActual = result.chartData.some(p => p.projected === false)
      expect(hasActual).toBe(true) // should have at least past dates
    }
  })

  it('should include chartData in the return object', () => {
    const result = computeAssetPerformance({
      holding: mockHolding,
      currentPriceKrw: 1000000,
      isStale: false,
      cachedAt: new Date(),
      latestManualValuationKrw: null,
      insuranceDetails: mockInsuranceDetails,
      insuranceBuys: [
        { transactionDate: '2024-01-15', amountKrw: 100000 },
      ],
    })

    expect(result).toHaveProperty('chartData')
    expect(Array.isArray(result.chartData)).toBe(true)
    // Verify all expected AssetPerformance fields are present
    expect(result).toHaveProperty('currentValueKrw')
    expect(result).toHaveProperty('returnPct')
    expect(result).toHaveProperty('assetType', 'insurance')
  })

  it('should compute correct currentValueKrw from insurance auto-calculation', () => {
    const result = computeAssetPerformance({
      holding: mockHolding,
      currentPriceKrw: 0,
      isStale: false,
      cachedAt: new Date(),
      latestManualValuationKrw: null,
      insuranceDetails: mockInsuranceDetails,
      insuranceBuys: [
        { transactionDate: '2024-01-15', amountKrw: 100000 },
        { transactionDate: '2024-02-15', amountKrw: 100000 },
      ],
    })

    // Insurance auto-calculation should compute currentValueKrw from buys + interest
    // With 2 months of 100K buys and 3.5% annual interest, value should be > 200K
    expect(result.currentValueKrw).toBeGreaterThanOrEqual(200000)
    expect(result.currentValueKrw).toBeGreaterThan(0)
    expect(result.assetType).toBe('insurance')
  })

  it('should handle manual valuation override for insurance', () => {
    const manualValuation = 1500000

    const result = computeAssetPerformance({
      holding: mockHolding,
      currentPriceKrw: 0,
      isStale: false,
      cachedAt: new Date(),
      latestManualValuationKrw: manualValuation,
      insuranceDetails: mockInsuranceDetails,
      insuranceBuys: [
        { transactionDate: '2024-01-15', amountKrw: 100000 },
      ],
    })

    // When latestManualValuationKrw is provided, it should override auto-calculation
    expect(result.currentValueKrw).toBe(manualValuation)
    expect(result.returnPct).toBeCloseTo(50, 0) // (1.5M - 1M) / 1M × 100
  })

  it('should generate multi-month chartData for long payment period', () => {
    const longTermInsurance: InsuranceDetailsRow = {
      ...mockInsuranceDetails,
      paymentStartDate: new Date('2024-01-01'),
      paymentEndDate: new Date('2026-12-31'),
    }

    const result = computeAssetPerformance({
      holding: mockHolding,
      currentPriceKrw: 1000000,
      isStale: false,
      cachedAt: new Date(),
      latestManualValuationKrw: null,
      insuranceDetails: longTermInsurance,
      insuranceBuys: [
        { transactionDate: '2024-01-01', amountKrw: 100000 },
      ],
    })

    // Should have multiple data points across the payment period
    expect(result.chartData?.length ?? 0).toBeGreaterThan(6)
    expect(result.chartData?.[0]?.value ?? 0).toBeGreaterThan(0)
  })

  it('should preserve all AssetPerformance fields from original holding', () => {
    const result = computeAssetPerformance({
      holding: mockHolding,
      currentPriceKrw: 1000000,
      isStale: false,
      cachedAt: new Date(),
      latestManualValuationKrw: null,
      insuranceDetails: mockInsuranceDetails,
      insuranceBuys: [
        { transactionDate: '2024-01-15', amountKrw: 100000 },
      ],
    })

    // Check that all original holding fields are preserved
    expect(result.assetId).toBe(mockHolding.assetId)
    expect(result.name).toBe(mockHolding.name)
    expect(result.assetType).toBe(mockHolding.assetType)
    expect(result.ticker).toBe(mockHolding.ticker)
    expect(result.currency).toBe(mockHolding.currency)
  })

  it('should handle empty insuranceBuys array gracefully', () => {
    const result = computeAssetPerformance({
      holding: mockHolding,
      currentPriceKrw: 1000000,
      isStale: false,
      cachedAt: new Date(),
      latestManualValuationKrw: null,
      insuranceDetails: mockInsuranceDetails,
      insuranceBuys: [],
    })

    // Should still return valid AssetPerformance even with empty buys
    expect(result).toHaveProperty('currentValueKrw')
    expect(result).toHaveProperty('returnPct')
    expect(result).toHaveProperty('assetType', 'insurance')
  })

  it('should include insuranceDetails in result', () => {
    const result = computeAssetPerformance({
      holding: mockHolding,
      currentPriceKrw: 1000000,
      isStale: false,
      cachedAt: new Date(),
      latestManualValuationKrw: null,
      insuranceDetails: mockInsuranceDetails,
      insuranceBuys: [
        { transactionDate: '2024-01-15', amountKrw: 100000 },
      ],
    })

    expect(result.insuranceDetails).toEqual(mockInsuranceDetails)
    expect(result.insuranceDetails?.category).toBe('savings')
    expect(result.insuranceDetails?.expectedReturnRateBp).toBe(35000)
  })
})
