import { describe, it, expect } from 'vitest'
import { buildSavingsCurvePoints } from '@/lib/savings-curve'
import type { SavingsBuy, SavingsDetails } from '@/lib/savings'

// 공통 픽스처
const BASE_DETAILS: SavingsDetails = {
  kind: 'term',
  interestRateBp: 35000, // 3.5%
  depositStartDate: '2024-01-01',
  maturityDate: '2026-01-01',
  compoundType: 'simple',
  taxType: 'taxable',
  autoRenew: false,
  monthlyContributionKrw: null,
}

const SINGLE_BUY: SavingsBuy[] = [
  { transactionDate: '2024-01-01', amountKrw: 10_000_000 },
]

describe('buildSavingsCurvePoints', () => {
  it('첫 포인트는 가입일, 마지막 실선 포인트는 today 이하', () => {
    const today = new Date('2025-06-01')
    const points = buildSavingsCurvePoints({ buys: SINGLE_BUY, details: BASE_DETAILS, today })

    const solid = points.filter(p => !p.projected)
    expect(solid[0].date).toBe('2024-01-01')
    expect(solid[solid.length - 1].date <= '2025-06-01').toBe(true)
  })

  it('미래 포인트는 projected=true', () => {
    const today = new Date('2025-06-01')
    const points = buildSavingsCurvePoints({ buys: SINGLE_BUY, details: BASE_DETAILS, today })

    const future = points.filter(p => p.projected)
    expect(future.length).toBeGreaterThan(0)
    future.forEach(p => expect(p.date > '2025-06-01').toBe(true))
  })

  it('만기일이 없으면 미래 포인트 없음', () => {
    const today = new Date('2025-06-01')
    const details: SavingsDetails = { ...BASE_DETAILS, maturityDate: null }
    const points = buildSavingsCurvePoints({ buys: SINGLE_BUY, details, today })

    expect(points.every(p => !p.projected)).toBe(true)
  })

  it('가입일이 today와 같으면 포인트 최소 1개', () => {
    const today = new Date('2024-01-01')
    const points = buildSavingsCurvePoints({ buys: SINGLE_BUY, details: BASE_DETAILS, today })

    expect(points.length).toBeGreaterThanOrEqual(1)
  })

  it('value는 시간이 갈수록 단조 증가 (단리)', () => {
    const today = new Date('2025-06-01')
    const points = buildSavingsCurvePoints({ buys: SINGLE_BUY, details: BASE_DETAILS, today })

    for (let i = 1; i < points.length; i++) {
      expect(points[i].value).toBeGreaterThanOrEqual(points[i - 1].value)
    }
  })

  it('만기 이후 포인트는 만기일 평가금으로 고정 (autoRenew=false)', () => {
    const today = new Date('2026-06-01') // 만기 2026-01-01 이후
    const points = buildSavingsCurvePoints({ buys: SINGLE_BUY, details: BASE_DETAILS, today })

    const afterMaturity = points.filter(p => p.date > '2026-01-01')
    const atMaturity = points.find(p => p.date <= '2026-01-01')!
    // 만기 후 value는 만기일 value와 동일해야 함
    afterMaturity.forEach(p => expect(p.value).toBe(atMaturity.value))
  })

  it('정기적금: 월 단위로 납입금이 추가돼 계단형 증가', () => {
    const details: SavingsDetails = {
      kind: 'recurring',
      interestRateBp: 40000, // 4.0%
      depositStartDate: '2024-01-01',
      maturityDate: '2025-01-01',
      compoundType: 'simple',
      taxType: 'taxable',
      autoRenew: false,
      monthlyContributionKrw: 500_000,
    }
    const today = new Date('2024-06-01')
    const points = buildSavingsCurvePoints({ buys: [], details, today })

    // 6개월치 포인트 이상 생성
    expect(points.filter(p => !p.projected).length).toBeGreaterThanOrEqual(5)
    // 마지막 포인트가 첫 포인트보다 큼
    expect(points[points.length - 1].value).toBeGreaterThan(points[0].value)
  })
})
