import { describe, it, expect } from 'vitest'
import { buildInsuranceCurvePoints } from '@/lib/insurance-curve'

describe('buildInsuranceCurvePoints', () => {
  it('should return empty array when expectedReturnRateBp is null or 0', () => {
    const result = buildInsuranceCurvePoints({
      buys: [],
      expectedReturnRateBp: null,
      paymentStartDate: '2024-01-15',
      paymentEndDate: '2025-01-15',
      compoundType: 'simple',
      paymentCycle: 'monthly',
      premiumPerCycleKrw: 100000,
    })
    expect(result).toEqual([])
  })

  it('should return empty array when no startDate available', () => {
    const result = buildInsuranceCurvePoints({
      buys: [],
      expectedReturnRateBp: 35000,
      paymentStartDate: null,
      paymentEndDate: '2025-01-15',
      compoundType: 'simple',
      paymentCycle: 'lump_sum',
      premiumPerCycleKrw: null,
    })
    expect(result).toEqual([])
  })

  it('should generate weekly samples from start to end', () => {
    const today = new Date('2024-06-15')
    const result = buildInsuranceCurvePoints({
      buys: [
        { transactionDate: '2024-01-15', amountKrw: 1000000 },
      ],
      expectedReturnRateBp: 35000, // 3.5%
      paymentStartDate: '2024-01-15',
      paymentEndDate: '2024-03-15',
      compoundType: 'simple',
      paymentCycle: 'lump_sum',
      premiumPerCycleKrw: null,
      today,
    })

    expect(result.length).toBeGreaterThanOrEqual(2) // start, end, + weeks between
    expect(result[0].date).toBe('2024-01-15')
    expect(result[result.length - 1].date).toBe('2024-03-15')
  })

  it('should mark dates before/equal today as projected=false, after as projected=true', () => {
    const today = new Date('2024-06-15')
    const result = buildInsuranceCurvePoints({
      buys: [
        { transactionDate: '2024-01-15', amountKrw: 1000000 },
      ],
      expectedReturnRateBp: 35000,
      paymentStartDate: '2024-01-15',
      paymentEndDate: '2024-12-31',
      compoundType: 'simple',
      paymentCycle: 'lump_sum',
      premiumPerCycleKrw: null,
      today,
    })

    const pastPoint = result.find(p => p.date < '2024-06-15')
    expect(pastPoint?.projected).toBe(false)

    const futurePoint = result.find(p => p.date > '2024-06-15')
    expect(futurePoint?.projected).toBe(true)
  })

  it('should handle recurring monthly payments', () => {
    const today = new Date('2024-06-15')
    const result = buildInsuranceCurvePoints({
      buys: [
        { transactionDate: '2024-01-15', amountKrw: 100000 },
      ],
      expectedReturnRateBp: 35000,
      paymentStartDate: '2024-01-15',
      paymentEndDate: '2024-06-15',
      compoundType: 'simple',
      paymentCycle: 'monthly',
      premiumPerCycleKrw: 100000,
      today,
    })

    expect(result.length).toBeGreaterThan(0)
    expect(result[result.length - 1].value).toBeGreaterThan(result[0].value)
  })
})
