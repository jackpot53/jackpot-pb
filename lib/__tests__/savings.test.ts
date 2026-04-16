import { describe, it, expect } from 'vitest'
import {
  computeAccruedInterestKrw,
  applyTax,
  computeCurrentSavingsValueKrw,
  computeExpectedMaturityValueKrw,
  remainingDays,
  annualizedReturnPct,
} from '../savings'

// 5% 연이자율 = 50000 bp
const RATE_5PCT = 50000
// 3.5% = 35000 bp
const RATE_3_5PCT = 35000

// ─── computeAccruedInterestKrw ──────────────────────────────────────────────

describe('computeAccruedInterestKrw', () => {
  it('0일이면 이자 0', () => {
    expect(computeAccruedInterestKrw({ principal: 10_000_000, annualRateBp: RATE_5PCT, daysElapsed: 0, compoundType: 'simple' })).toBe(0)
  })

  it('원금 0이면 이자 0', () => {
    expect(computeAccruedInterestKrw({ principal: 0, annualRateBp: RATE_5PCT, daysElapsed: 365, compoundType: 'simple' })).toBe(0)
  })

  it('단리 365일 = 원금의 5%', () => {
    const interest = computeAccruedInterestKrw({ principal: 10_000_000, annualRateBp: RATE_5PCT, daysElapsed: 365, compoundType: 'simple' })
    expect(interest).toBe(500_000)
  })

  it('단리 182일 ≈ 원금의 2.49%', () => {
    const interest = computeAccruedInterestKrw({ principal: 10_000_000, annualRateBp: RATE_5PCT, daysElapsed: 182, compoundType: 'simple' })
    // 10_000_000 × 0.05 × 182/365 = 249_315.06... → floor = 249_315
    expect(interest).toBe(249_315)
  })

  it('월복리 12개월은 단리보다 이자가 많다', () => {
    const simple = computeAccruedInterestKrw({ principal: 10_000_000, annualRateBp: RATE_5PCT, daysElapsed: 365, compoundType: 'simple' })
    // 월복리: (1+0.05/12)^12 - 1 ≈ 5.116%
    const monthly = computeAccruedInterestKrw({ principal: 10_000_000, annualRateBp: RATE_5PCT, daysElapsed: 365, compoundType: 'monthly' })
    expect(monthly).toBeGreaterThan(simple)
  })

  it('월복리 12개월 ≈ 511,618원 (세전)', () => {
    const interest = computeAccruedInterestKrw({ principal: 10_000_000, annualRateBp: RATE_5PCT, daysElapsed: 365, compoundType: 'monthly' })
    // (1+0.05/12)^12 = 1.051162... → interest = 511_162... (approximate)
    expect(interest).toBeGreaterThan(500_000)
    expect(interest).toBeLessThan(520_000)
  })
})

// ─── applyTax ───────────────────────────────────────────────────────────────

describe('applyTax', () => {
  it('taxable: 15.4% 차감', () => {
    const net = applyTax(500_000, 'taxable')
    expect(net).toBe(Math.floor(500_000 * 0.846))  // 423_000
  })

  it('tax_free: 세금 없음', () => {
    expect(applyTax(500_000, 'tax_free')).toBe(500_000)
  })

  it('preferential: 9.5% 차감', () => {
    const net = applyTax(500_000, 'preferential')
    expect(net).toBe(Math.floor(500_000 * 0.905))
  })
})

// ─── computeCurrentSavingsValueKrw ─────────────────────────────────────────

describe('computeCurrentSavingsValueKrw', () => {
  const TODAY = new Date('2025-07-01')
  const buy1 = { transactionDate: '2025-01-01', amountKrw: 10_000_000 }  // 181일 경과

  it('납입 없으면 0 반환', () => {
    const result = computeCurrentSavingsValueKrw({
      buys: [], interestRateBp: RATE_5PCT, maturityDate: '2026-01-01',
      compoundType: 'simple', taxType: 'taxable', autoRenew: false, asOf: TODAY,
    })
    expect(result).toBe(0)
  })

  it('정기예금: 원금 + 세후 이자', () => {
    const result = computeCurrentSavingsValueKrw({
      buys: [buy1], interestRateBp: RATE_5PCT, maturityDate: '2026-01-01',
      compoundType: 'simple', taxType: 'taxable', autoRenew: false, asOf: TODAY,
    })
    expect(result).toBeGreaterThan(10_000_000)
    // 181일 단리 세전 이자: 10_000_000 × 0.05 × 181/365 = 247_945
    // 세후: floor(247_945 × 0.846) = 209,761
    expect(result).toBeGreaterThan(10_200_000)
  })

  it('만기 후 autoRenew=false: 만기일까지만 이자', () => {
    const afterMaturity = new Date('2026-06-01')
    const result = computeCurrentSavingsValueKrw({
      buys: [{ transactionDate: '2025-01-01', amountKrw: 10_000_000 }],
      interestRateBp: RATE_5PCT, maturityDate: '2026-01-01',
      compoundType: 'simple', taxType: 'taxable', autoRenew: false, asOf: afterMaturity,
    })
    // 만기일(2026-01-01)까지 365일 이자만 계산 → 고정
    const atMaturity = computeCurrentSavingsValueKrw({
      buys: [{ transactionDate: '2025-01-01', amountKrw: 10_000_000 }],
      interestRateBp: RATE_5PCT, maturityDate: '2026-01-01',
      compoundType: 'simple', taxType: 'taxable', autoRenew: false, asOf: new Date('2026-01-01'),
    })
    expect(result).toBe(atMaturity)
  })

  it('만기 후 autoRenew=true: 계속 이자 발생', () => {
    const afterMaturity = new Date('2026-06-01')
    const atMaturity = computeCurrentSavingsValueKrw({
      buys: [{ transactionDate: '2025-01-01', amountKrw: 10_000_000 }],
      interestRateBp: RATE_5PCT, maturityDate: '2026-01-01',
      compoundType: 'simple', taxType: 'taxable', autoRenew: true, asOf: afterMaturity,
    })
    const fixedAtMaturity = computeCurrentSavingsValueKrw({
      buys: [{ transactionDate: '2025-01-01', amountKrw: 10_000_000 }],
      interestRateBp: RATE_5PCT, maturityDate: '2026-01-01',
      compoundType: 'simple', taxType: 'taxable', autoRenew: false, asOf: afterMaturity,
    })
    expect(atMaturity).toBeGreaterThan(fixedAtMaturity)
  })

  it('정기적금 3건 납입: 각 건별 경과일 다름', () => {
    const buys = [
      { transactionDate: '2025-01-01', amountKrw: 500_000 },
      { transactionDate: '2025-02-01', amountKrw: 500_000 },
      { transactionDate: '2025-03-01', amountKrw: 500_000 },
    ]
    const result = computeCurrentSavingsValueKrw({
      buys, interestRateBp: RATE_3_5PCT, maturityDate: '2026-01-01',
      compoundType: 'simple', taxType: 'taxable', autoRenew: false, asOf: TODAY,
    })
    expect(result).toBeGreaterThan(1_500_000)  // 원금 합산 이상
  })
})

// ─── computeExpectedMaturityValueKrw ───────────────────────────────────────

describe('computeExpectedMaturityValueKrw', () => {
  it('만기일 없으면 null', () => {
    const result = computeExpectedMaturityValueKrw({
      buys: [{ transactionDate: '2025-01-01', amountKrw: 10_000_000 }],
      interestRateBp: RATE_5PCT, maturityDate: null,
      compoundType: 'simple', taxType: 'taxable',
    })
    expect(result).toBeNull()
  })

  it('정기예금 1년: 원금 + 세후이자', () => {
    const result = computeExpectedMaturityValueKrw({
      buys: [{ transactionDate: '2025-01-01', amountKrw: 10_000_000 }],
      interestRateBp: RATE_5PCT, maturityDate: '2026-01-01',
      compoundType: 'simple', taxType: 'taxable',
    })
    expect(result).not.toBeNull()
    // 세전 이자 500,000원, 세후 ≈ 423,000원 → 합계 10,423,000원
    expect(result!).toBeGreaterThan(10_400_000)
    expect(result!).toBeLessThan(10_450_000)
  })

  it('미래 납입 건은 제외 (asOf 이후)', () => {
    const asOf = new Date('2025-06-01')
    const result = computeExpectedMaturityValueKrw({
      buys: [
        { transactionDate: '2025-01-01', amountKrw: 10_000_000 },
        { transactionDate: '2025-08-01', amountKrw: 5_000_000 },  // 미래
      ],
      interestRateBp: RATE_5PCT, maturityDate: '2026-01-01',
      compoundType: 'simple', taxType: 'taxable', asOf,
    })
    // 두 번째 납입(8월)은 asOf(6월) 이후라 제외
    const resultSingle = computeExpectedMaturityValueKrw({
      buys: [{ transactionDate: '2025-01-01', amountKrw: 10_000_000 }],
      interestRateBp: RATE_5PCT, maturityDate: '2026-01-01',
      compoundType: 'simple', taxType: 'taxable', asOf,
    })
    expect(result).toBe(resultSingle)
  })
})

// ─── remainingDays ──────────────────────────────────────────────────────────

describe('remainingDays', () => {
  it('오늘이 만기일이면 0', () => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    expect(remainingDays(`${yyyy}-${mm}-${dd}`, today)).toBe(0)
  })

  it('만기일이 지났으면 음수', () => {
    expect(remainingDays('2020-01-01', new Date('2025-01-01'))).toBeLessThan(0)
  })

  it('만기 30일 전이면 30', () => {
    expect(remainingDays('2025-07-31', new Date('2025-07-01'))).toBe(30)
  })
})

// ─── annualizedReturnPct ────────────────────────────────────────────────────

describe('annualizedReturnPct', () => {
  it('0일이면 0', () => {
    expect(annualizedReturnPct(5, 0)).toBe(0)
  })

  it('365일 5% 수익률 → 연환산 5%', () => {
    expect(annualizedReturnPct(5, 365)).toBeCloseTo(5, 1)
  })

  it('182일 2.5% 수익률 → 연환산 ≈ 5%', () => {
    expect(annualizedReturnPct(2.5, 182)).toBeCloseTo(5.01, 0)
  })
})
