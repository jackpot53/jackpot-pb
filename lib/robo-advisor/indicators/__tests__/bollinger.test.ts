import { describe, it, expect } from 'vitest'
import { bollinger, bollingerLast } from '../bollinger'

describe('bollinger', () => {
  it('데이터 부족 시 전부 null', () => {
    const result = bollinger([1, 2, 3], 20)
    expect(result.every((p) => p.middle === null)).toBe(true)
  })

  it('period=3, 수기 검증', () => {
    // [10, 20, 30] → middle=20, σ=sqrt(((10-20)²+(20-20)²+(30-20)²)/3)=sqrt(200/3)
    const closes = [10, 20, 30]
    const result = bollinger(closes, 3, 2)
    const last = result[result.length - 1]
    expect(last.middle).toBeCloseTo(20, 5)

    const sigma = Math.sqrt(200 / 3)
    expect(last.upper).toBeCloseTo(20 + 2 * sigma, 5)
    expect(last.lower).toBeCloseTo(20 - 2 * sigma, 5)
  })

  it('upper > middle > lower', () => {
    const closes = Array.from({ length: 25 }, (_, i) => 100 + (i % 7) * 3)
    const result = bollinger(closes, 20)
    for (const p of result) {
      if (p.upper !== null) {
        expect(p.upper).toBeGreaterThan(p.middle!)
        expect(p.middle!).toBeGreaterThan(p.lower!)
      }
    }
  })

  it('bandwidth = (upper - lower) / middle', () => {
    const closes = Array.from({ length: 25 }, (_, i) => 100 + i * 2)
    const result = bollinger(closes, 20)
    for (const p of result) {
      if (p.bandwidth !== null && p.middle !== null) {
        expect(p.bandwidth).toBeCloseTo((p.upper! - p.lower!) / p.middle, 8)
      }
    }
  })

  it('가격 변동 없으면 upper = lower = middle, bandwidth = 0', () => {
    const closes = new Array(25).fill(1000)
    const result = bollinger(closes, 20)
    const last = result[result.length - 1]
    expect(last.upper).toBeCloseTo(1000, 5)
    expect(last.lower).toBeCloseTo(1000, 5)
    expect(last.bandwidth).toBeCloseTo(0, 5)
  })
})

describe('bollingerLast', () => {
  it('데이터 부족 시 전부 null 반환', () => {
    const result = bollingerLast([1, 2, 3])
    expect(result.upper).toBeNull()
    expect(result.middle).toBeNull()
  })
})
