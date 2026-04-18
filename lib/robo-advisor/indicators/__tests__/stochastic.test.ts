import { describe, it, expect } from 'vitest'
import { stochastic, stochasticLast } from '../stochastic'

describe('stochastic', () => {
  it('데이터 부족 시 전부 null', () => {
    const result = stochastic([1, 2], [0.5, 1], [1, 1.5], 14, 3)
    expect(result.every((p) => p.k === null)).toBe(true)
  })

  it('%K 수기 계산 검증 (period=3)', () => {
    // highs=[10,12,11], lows=[8,9,9], closes=[9,11,10]
    // highest high(3)=12, lowest low(3)=8, range=4
    // %K = (10-8)/4 * 100 = 50
    const highs = [10, 12, 11]
    const lows = [8, 9, 9]
    const closes = [9, 11, 10]
    const result = stochastic(highs, lows, closes, 3, 3)
    const last = result[result.length - 1]
    expect(last.k).toBeCloseTo(50, 5)
  })

  it('%K 범위 0~100', () => {
    const n = 20
    const highs = Array.from({ length: n }, (_, i) => 100 + i)
    const lows = Array.from({ length: n }, (_, i) => 90 + i)
    const closes = Array.from({ length: n }, (_, i) => 95 + i)
    const result = stochastic(highs, lows, closes, 14, 3)
    for (const p of result) {
      if (p.k !== null) {
        expect(p.k).toBeGreaterThanOrEqual(0)
        expect(p.k).toBeLessThanOrEqual(100)
      }
    }
  })

  it('high=low 일 때 K=50 (range=0 처리)', () => {
    const flat = new Array(15).fill(100)
    const result = stochastic(flat, flat, flat, 14, 3)
    const last = result[result.length - 1]
    expect(last.k).toBe(50)
  })
})

describe('stochasticLast', () => {
  it('데이터 부족 시 null 반환', () => {
    const result = stochasticLast([1], [1], [1], 14, 3)
    expect(result.k).toBeNull()
    expect(result.d).toBeNull()
  })
})
