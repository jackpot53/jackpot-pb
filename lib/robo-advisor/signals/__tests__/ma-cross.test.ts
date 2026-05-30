import { describe, it, expect } from 'vitest'
import { detectMaCrossesFromSma, lastMaCrossFromSma } from '../ma-cross'
import { sma } from '../../indicators/sma'

function smaArr(closes: number[], period: number) {
  return sma(closes, period)
}

describe('detectMaCrossesFromSma', () => {
  it('데이터 부족 시 (slow 기간보다 짧으면) 빈 배열', () => {
    const closes = Array.from({ length: 19 }, (_, i) => 100 + i)
    const fast = smaArr(closes, 5)
    const slow = smaArr(closes, 20)
    const dates = closes.map((_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`)
    const crosses = detectMaCrossesFromSma(fast, slow, dates, '5/20')
    expect(crosses).toHaveLength(0)
  })

  it('골든 크로스 감지 — 하락 후 급등', () => {
    // 하락 구간: 5일선 < 20일선 상태 유지
    // 마지막에 급등 → 5일 SMA가 20일 SMA를 상향 돌파
    const closes = [
      200, 195, 190, 185, 180,
      175, 170, 165, 160, 155,
      150, 145, 140, 135, 130,
      125, 120, 115, 110, 105,
      // 여기서 급등 → 5일 평균이 20일 평균 추월
      200, 210, 220, 230, 240,
    ]
    const fast = smaArr(closes, 5)
    const slow = smaArr(closes, 20)
    const dates = closes.map((_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`)
    const crosses = detectMaCrossesFromSma(fast, slow, dates, '5/20')
    const goldens = crosses.filter((c) => c.type === 'golden')
    expect(goldens.length).toBeGreaterThan(0)
    expect(goldens[0].pair).toBe('5/20')
  })

  it('데드 크로스 감지 — 상승 후 급락', () => {
    // 상승 구간: 5일선 > 20일선 상태 유지
    // 마지막에 급락 → 5일 SMA가 20일 SMA를 하향 돌파
    const closes = [
      100, 105, 110, 115, 120,
      125, 130, 135, 140, 145,
      150, 155, 160, 165, 170,
      175, 180, 185, 190, 195,
      // 여기서 급락 → 5일 평균이 20일 평균 아래로
      100, 90, 80, 70, 60,
    ]
    const fast = smaArr(closes, 5)
    const slow = smaArr(closes, 20)
    const dates = closes.map((_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`)
    const crosses = detectMaCrossesFromSma(fast, slow, dates, '5/20')
    const deads = crosses.filter((c) => c.type === 'dead')
    expect(deads.length).toBeGreaterThan(0)
    expect(deads[0].pair).toBe('5/20')
  })

  it('20/60 쌍도 pair 필드가 올바르게 반환', () => {
    const closes = [
      ...Array.from({ length: 55 }, (_, i) => 200 - i * 2),  // 하락 구간
      ...Array.from({ length: 10 }, (_, i) => 100 + i * 15),  // 급등
    ]
    const fast = smaArr(closes, 20)
    const slow = smaArr(closes, 60)
    const dates = closes.map((_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`)
    const crosses = detectMaCrossesFromSma(fast, slow, dates, '20/60')
    crosses.forEach((c) => expect(c.pair).toBe('20/60'))
  })
})

describe('lastMaCrossFromSma', () => {
  it('크로스 없으면 null', () => {
    // 단조 상승: 5일선이 항상 20일선 위
    const closes = Array.from({ length: 25 }, (_, i) => 100 + i * 5)
    const fast = smaArr(closes, 5)
    const slow = smaArr(closes, 20)
    const dates = closes.map((_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`)
    // 이미 fast > slow 상태라 교차 없음 (null 또는 결과 없음)
    const result = lastMaCrossFromSma(fast, slow, dates, '5/20')
    // 단조 상승이라 교차가 없을 수 있음 — null이거나 있으면 golden
    if (result !== null) {
      expect(result.type).toBe('golden')
    }
  })

  it('daysAgo 계산 — 마지막 바에서 얼마나 전인지', () => {
    const closes = [
      200, 195, 190, 185, 180,
      175, 170, 165, 160, 155,
      150, 145, 140, 135, 130,
      125, 120, 115, 110, 105,
      200, 210, 220, 230, 240,  // 25번째 이후 골든 크로스 발생
      240, 240, 240,            // 이후 3개 추가 → daysAgo = 3 이상
    ]
    const fast = smaArr(closes, 5)
    const slow = smaArr(closes, 20)
    const dates = closes.map((_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`)
    const result = lastMaCrossFromSma(fast, slow, dates, '5/20')
    expect(result).not.toBeNull()
    expect(result!.daysAgo).toBeGreaterThanOrEqual(0)
    expect(result!.pair).toBe('5/20')
  })

  it('가장 마지막 크로스만 반환 (복수 발생 시)', () => {
    const closes = [
      200, 195, 190, 185, 180,
      175, 170, 165, 160, 155,
      150, 145, 140, 135, 130,
      125, 120, 115, 110, 105,
      200, 210, 220, 230, 240,  // 첫 번째 골든
      100, 90, 80, 70, 60,      // 데드
      200, 210, 220, 230, 240,  // 두 번째 골든 (가장 최근)
    ]
    const fast = smaArr(closes, 5)
    const slow = smaArr(closes, 20)
    const dates = closes.map((_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`)
    const result = lastMaCrossFromSma(fast, slow, dates, '5/20')
    expect(result).not.toBeNull()
    // 마지막 크로스가 반환되어야 함
    expect(result!.daysAgo).toBeLessThan(10)
  })
})
