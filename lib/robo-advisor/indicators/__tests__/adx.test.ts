import { describe, it, expect } from 'vitest'
import { adx, adxLast } from '../adx'

describe('adx', () => {
  it('데이터 부족 시 전부 null (2*period+1 미만)', () => {
    const data = Array.from({ length: 27 }, (_, i) => 100 + i)
    // period=14 → 최소 29개 필요
    const result = adx(data, data, data, 14)
    expect(result.every((p) => p.adx === null)).toBe(true)
  })

  it('충분한 데이터(30+) 시 ADX 값 유효', () => {
    const n = 50
    const highs = Array.from({ length: n }, (_, i) => 100 + i * 2 + 5)
    const lows = Array.from({ length: n }, (_, i) => 100 + i * 2)
    const closes = Array.from({ length: n }, (_, i) => 100 + i * 2 + 2)
    const result = adx(highs, lows, closes, 14)
    const last = result[result.length - 1]
    expect(last.adx).not.toBeNull()
    expect(last.diPlus).not.toBeNull()
    expect(last.diMinus).not.toBeNull()
  })

  it('ADX 값 범위 0~100', () => {
    const n = 60
    const highs = Array.from({ length: n }, (_, i) => 100 + (i % 10) + 5)
    const lows = Array.from({ length: n }, (_, i) => 100 + (i % 10))
    const closes = Array.from({ length: n }, (_, i) => 100 + (i % 10) + 2)
    const result = adx(highs, lows, closes, 14)
    for (const p of result) {
      if (p.adx !== null) {
        expect(p.adx).toBeGreaterThanOrEqual(0)
        expect(p.adx).toBeLessThanOrEqual(100)
      }
    }
  })

  it('단조 상승 시 +DI > -DI', () => {
    const n = 50
    const highs = Array.from({ length: n }, (_, i) => 100 + i + 5)
    const lows = Array.from({ length: n }, (_, i) => 100 + i)
    const closes = Array.from({ length: n }, (_, i) => 100 + i + 3)
    const result = adx(highs, lows, closes, 14)
    const last = result[result.length - 1]
    if (last.diPlus !== null && last.diMinus !== null) {
      expect(last.diPlus).toBeGreaterThan(last.diMinus)
    }
  })
})

describe('adxLast', () => {
  it('데이터 부족 시 null 반환', () => {
    const result = adxLast([1, 2], [1, 2], [1, 2], 14)
    expect(result.adx).toBeNull()
  })
})
