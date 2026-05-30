import { describe, it, expect } from 'vitest'
import { detectShortSellingRisks, lastShortRiskFromEvents } from '../short-selling-risk'
import type { ShortSellingPoint } from '@/lib/kis/short-selling'

function makePoints(ratios: number[]): ShortSellingPoint[] {
  return ratios.map((r, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    shortVolume: Math.round(r * 1000),
    shortValue: Math.round(r * 1_000_000),
    totalVolume: 100_000,
    totalValue: 100_000_000,
    shortRatio: r,
  }))
}

describe('detectShortSellingRisks', () => {
  it('데이터 부족 시 빈 배열 (20일 미만)', () => {
    const points = makePoints(new Array(15).fill(10))
    expect(detectShortSellingRisks(points)).toEqual([])
  })

  it('정상 비중(평균 미만, 절대값 낮음) → 이벤트 없음', () => {
    // 21일, 비중 10% 유지 → 급증 없음
    const points = makePoints(new Array(21).fill(10))
    expect(detectShortSellingRisks(points)).toHaveLength(0)
  })

  it('spike: 당일 비중이 20일 평균의 2배 이상 + FLOOR 초과 → 이벤트 발생', () => {
    // 처음 20일은 비중 15%, 21번째는 31% (2× + floor 조건 충족)
    const ratios = [...new Array(20).fill(15), 31]
    const points = makePoints(ratios)
    const events = detectShortSellingRisks(points)
    expect(events).toHaveLength(1)
    expect(events[0].reason).toBe('spike')
    expect(events[0].ratio).toBe(31)
    expect(events[0].avgRatio).toBe(15)
  })

  it('extreme: 비중 ≥ 40% → 평균 무관 이벤트 발생', () => {
    // 처음 20일은 비중 5%, 21번째는 42%
    const ratios = [...new Array(20).fill(5), 42]
    const points = makePoints(ratios)
    const events = detectShortSellingRisks(points)
    expect(events).toHaveLength(1)
    expect(events[0].reason).toBe('extreme')
    expect(events[0].ratio).toBe(42)
  })

  it('spike 미달: 비중이 FLOOR(20%) 미만이면 급증 배율 충족해도 무시', () => {
    // 처음 20일 비중 5%, 21번째 12% (2.4배이지만 FLOOR 미만)
    const ratios = [...new Array(20).fill(5), 12]
    const points = makePoints(ratios)
    expect(detectShortSellingRisks(points)).toHaveLength(0)
  })

  it('여러 이벤트: 복수 급증 포착', () => {
    const ratios = [
      ...new Array(20).fill(10), // 기준 평균 10%
      25,                         // 2.5× 급증
      10, 10, 10, 10, 10, 10, 10, 10, 10, 10,
      10, 10, 10, 10, 10, 10, 10, 10, 10, 10, // 20일 이후 평균 재형성
      25,                         // 두 번째 급증
    ]
    const points = makePoints(ratios)
    const events = detectShortSellingRisks(points)
    // 두 급증 모두 포착돼야 한다
    expect(events.length).toBeGreaterThanOrEqual(2)
    expect(events.every(e => e.reason === 'spike')).toBe(true)
  })
})

describe('lastShortRiskFromEvents', () => {
  it('이벤트 없으면 null', () => {
    const points = makePoints(new Array(21).fill(10))
    expect(lastShortRiskFromEvents([], points)).toBeNull()
  })

  it('가장 최근 이벤트 반환 + daysAgo 계산', () => {
    const ratios = [...new Array(20).fill(10), 25, 10, 10]  // 21번째가 급증, 이후 2일 더
    const points = makePoints(ratios)
    const events = detectShortSellingRisks(points)
    const result = lastShortRiskFromEvents(events, points)
    expect(result).not.toBeNull()
    expect(result!.daysAgo).toBe(2)  // 23개 중 21번째(idx=20), daysAgo = 23-1-20 = 2
    expect(result!.ratio).toBe(25)
  })
})
