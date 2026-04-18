import { describe, it, expect } from 'vitest'
import {
  computeAccruedInsuranceInterestKrw,
  generateVirtualInsurancePayments,
  computeCurrentInsuranceValueKrw,
} from '@/lib/insurance'

describe('computeAccruedInsuranceInterestKrw', () => {
  describe('단리 (simple)', () => {
    it('원금 1,000,000원, 연이율 3.5%, 365일 경과 → 이자 35,000원', () => {
      const interest = computeAccruedInsuranceInterestKrw({
        principal: 1_000_000,
        annualRateBp: 35_000,
        daysElapsed: 365,
        compoundType: 'simple',
      })
      expect(interest).toBe(35_000)
    })

    it('원금 1,000,000원, 연이율 3.5%, 180일 경과 → 이자 약 17,260원', () => {
      const interest = computeAccruedInsuranceInterestKrw({
        principal: 1_000_000,
        annualRateBp: 35_000,
        daysElapsed: 180,
        compoundType: 'simple',
      })
      // 1M × 0.035 × (180/365) = 17,260
      expect(interest).toBe(17_260)
    })

    it('경과일수 0일 → 이자 0원', () => {
      const interest = computeAccruedInsuranceInterestKrw({
        principal: 1_000_000,
        annualRateBp: 35_000,
        daysElapsed: 0,
        compoundType: 'simple',
      })
      expect(interest).toBe(0)
    })

    it('원금 0 → 이자 0원', () => {
      const interest = computeAccruedInsuranceInterestKrw({
        principal: 0,
        annualRateBp: 35_000,
        daysElapsed: 365,
        compoundType: 'simple',
      })
      expect(interest).toBe(0)
    })
  })

  describe('월복리 (monthly)', () => {
    it('원금 1,000,000원, 연이율 3.5%, 365일(약 12개월) → 약 35,600원', () => {
      const interest = computeAccruedInsuranceInterestKrw({
        principal: 1_000_000,
        annualRateBp: 35_000,
        daysElapsed: 365,
        compoundType: 'monthly',
      })
      expect(interest).toBeGreaterThanOrEqual(35_500)
      expect(interest).toBeLessThanOrEqual(35_700)
    })

    it('원금 1,000,000원, 연이율 3.5%, 180일(약 6개월) → 약 17,400원', () => {
      const interest = computeAccruedInsuranceInterestKrw({
        principal: 1_000_000,
        annualRateBp: 35_000,
        daysElapsed: 180,
        compoundType: 'monthly',
      })
      expect(interest).toBeGreaterThanOrEqual(17_300)
      expect(interest).toBeLessThanOrEqual(17_500)
    })
  })

  describe('연복리 (yearly)', () => {
    it('원금 1,000,000원, 연이율 3.5%, 365일(1년) → 약 35,000원', () => {
      const interest = computeAccruedInsuranceInterestKrw({
        principal: 1_000_000,
        annualRateBp: 35_000,
        daysElapsed: 365,
        compoundType: 'yearly',
      })
      expect(interest).toBeGreaterThanOrEqual(34_900)
      expect(interest).toBeLessThanOrEqual(35_100)
    })

    it('원금 1,000,000원, 연이율 3.5%, 730일(2년) → 약 71,225원', () => {
      const interest = computeAccruedInsuranceInterestKrw({
        principal: 1_000_000,
        annualRateBp: 35_000,
        daysElapsed: 730,
        compoundType: 'yearly',
      })
      expect(interest).toBeGreaterThanOrEqual(71_100)
      expect(interest).toBeLessThanOrEqual(71_400)
    })
  })
})

describe('generateVirtualInsurancePayments', () => {
  it('월납입, 2024-01-15 시작, 2024-03-15까지 → 3개월 납입', () => {
    const payments = generateVirtualInsurancePayments({
      paymentStartDate: '2024-01-15',
      paymentCycle: 'monthly',
      premiumPerCycleKrw: 1_000_000,
      asOf: new Date('2024-03-15'),
    })
    expect(payments).toEqual([
      { transactionDate: '2024-01-15', amountKrw: 1_000_000 },
      { transactionDate: '2024-02-15', amountKrw: 1_000_000 },
      { transactionDate: '2024-03-15', amountKrw: 1_000_000 },
    ])
  })

  it('분기납입, 2024-01-15 시작, 2024-09-15까지 → 3번 납입', () => {
    const payments = generateVirtualInsurancePayments({
      paymentStartDate: '2024-01-15',
      paymentCycle: 'quarterly',
      premiumPerCycleKrw: 3_000_000,
      asOf: new Date('2024-09-15'),
    })
    expect(payments.length).toBe(3)
    expect(payments[0].transactionDate).toBe('2024-01-15')
    expect(payments[1].transactionDate).toBe('2024-04-15')
    expect(payments[2].transactionDate).toBe('2024-07-15')
  })

  it('연납입, 2024-01-15 시작, 2025-06-15까지 → 2번 납입', () => {
    const payments = generateVirtualInsurancePayments({
      paymentStartDate: '2024-01-15',
      paymentCycle: 'yearly',
      premiumPerCycleKrw: 12_000_000,
      asOf: new Date('2025-06-15'),
    })
    expect(payments.length).toBe(2)
    expect(payments[0].transactionDate).toBe('2024-01-15')
    expect(payments[1].transactionDate).toBe('2025-01-15')
  })

  it('paymentEndDate 이후 납입은 제외', () => {
    const payments = generateVirtualInsurancePayments({
      paymentStartDate: '2024-01-15',
      paymentCycle: 'monthly',
      premiumPerCycleKrw: 1_000_000,
      paymentEndDate: '2024-06-15',
      asOf: new Date('2024-12-15'),
    })
    expect(payments.length).toBe(6)  // Jan ~ Jun
    expect(payments[payments.length - 1].transactionDate).toBe('2024-06-15')
  })

  it('lump_sum → 빈 배열', () => {
    const payments = generateVirtualInsurancePayments({
      paymentStartDate: '2024-01-15',
      paymentCycle: 'lump_sum',
      premiumPerCycleKrw: 1_000_000,
      asOf: new Date('2024-12-15'),
    })
    expect(payments).toEqual([])
  })

  it('월 말일 31일인 경우 → 다음 월 마지막 날에 맞춤', () => {
    const payments = generateVirtualInsurancePayments({
      paymentStartDate: '2024-01-31',
      paymentCycle: 'monthly',
      premiumPerCycleKrw: 1_000_000,
      asOf: new Date('2024-04-15'),
    })
    expect(payments[0].transactionDate).toBe('2024-01-31')
    expect(payments[1].transactionDate).toBe('2024-02-29')  // 2024년은 윤년
    expect(payments[2].transactionDate).toBe('2024-03-31')
  })
})

describe('computeCurrentInsuranceValueKrw', () => {
  it('일시납, 단리, 원금 1M, 이율 3.5%, 365일 경과 → 약 1,035,095원', () => {
    const value = computeCurrentInsuranceValueKrw({
      buys: [{ transactionDate: '2023-04-18', amountKrw: 1_000_000 }],
      expectedReturnRateBp: 35_000,
      paymentStartDate: null,
      paymentEndDate: null,
      compoundType: 'simple',
      paymentCycle: 'lump_sum',
      premiumPerCycleKrw: null,
      asOf: new Date('2024-04-18'),
    })
    // 2023-04-18 ~ 2024-04-18: 윤년이므로 366일
    expect(value).toBe(1_035_095)
  })

  it('정기납입(월), 단리, 4개월 → 약 4,017,000원', () => {
    const value = computeCurrentInsuranceValueKrw({
      buys: [],
      expectedReturnRateBp: 35_000,
      paymentStartDate: '2024-01-15',
      paymentEndDate: null,
      compoundType: 'simple',
      paymentCycle: 'monthly',
      premiumPerCycleKrw: 1_000_000,
      asOf: new Date('2024-04-15'),
    })
    // 2024-01-15: 1M + (1M × 0.035 × 91/365)
    // 2024-02-15: 1M + (1M × 0.035 × 60/365)
    // 2024-03-15: 1M + (1M × 0.035 × 31/365)
    // 2024-04-15: 1M + (1M × 0.035 × 0/365) ≈ 1M
    // 합: 약 4,017,451
    expect(value).toBeGreaterThan(4_010_000)
    expect(value).toBeLessThan(4_020_000)
  })

  it('이자율 없음 → 원금만 반환', () => {
    const value = computeCurrentInsuranceValueKrw({
      buys: [{ transactionDate: '2023-04-18', amountKrw: 1_000_000 }],
      expectedReturnRateBp: null,
      paymentStartDate: null,
      paymentEndDate: null,
      compoundType: 'simple',
      paymentCycle: 'lump_sum',
      premiumPerCycleKrw: null,
    })
    expect(value).toBe(1_000_000)
  })

  it('납입 내역 없음 → 0원', () => {
    const value = computeCurrentInsuranceValueKrw({
      buys: [],
      expectedReturnRateBp: 35_000,
      paymentStartDate: null,
      paymentEndDate: null,
      compoundType: 'simple',
      paymentCycle: 'lump_sum',
      premiumPerCycleKrw: null,
    })
    expect(value).toBe(0)
  })

  it('미래 거래 → 현재까지만 계산', () => {
    const value = computeCurrentInsuranceValueKrw({
      buys: [
        { transactionDate: '2024-01-15', amountKrw: 1_000_000 },
        { transactionDate: '2025-01-15', amountKrw: 1_000_000 },  // 미래
      ],
      expectedReturnRateBp: 35_000,
      paymentStartDate: null,
      paymentEndDate: null,
      compoundType: 'simple',
      paymentCycle: 'lump_sum',
      premiumPerCycleKrw: null,
      asOf: new Date('2024-12-31'),
    })
    // 2024-01-15 거래만 계산 (약 350일 경과 → 약 33,972원 이자)
    expect(value).toBeGreaterThan(1_033_000)
    expect(value).toBeLessThan(1_034_500)
  })
})
