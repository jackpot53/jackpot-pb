import { describe, it, expect } from 'vitest'
import { rsi, rsiLast } from '../rsi'

describe('rsi', () => {
  it('데이터 부족 시 전부 null (period=14, 데이터 14개)', () => {
    const closes = Array.from({ length: 14 }, (_, i) => i + 1)
    const result = rsi(closes, 14)
    expect(result.every((v) => v === null)).toBe(true)
  })

  it('연속 상승 시 RSI → 100에 수렴', () => {
    const closes = Array.from({ length: 50 }, (_, i) => 1000 + i * 10)
    const result = rsi(closes, 14)
    const lastRsi = result[result.length - 1]!
    expect(lastRsi).toBeGreaterThan(90)
  })

  it('연속 하락 시 RSI → 0에 수렴', () => {
    const closes = Array.from({ length: 50 }, (_, i) => 1000 - i * 10)
    const result = rsi(closes, 14)
    const lastRsi = result[result.length - 1]!
    expect(lastRsi).toBeLessThan(10)
  })

  it('RSI 값 범위 0~100', () => {
    const closes = [100, 102, 98, 103, 97, 105, 95, 108, 92, 110, 90, 112, 88, 115, 85, 118]
    const result = rsi(closes, 14)
    for (const v of result) {
      if (v !== null) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(100)
      }
    }
  })

  it('변동 없는 가격 → RSI는 50 또는 극단값', () => {
    // 변동 없으면 gain=0, loss=0 → loss===0이므로 100 반환
    const closes = new Array(20).fill(100)
    const result = rsi(closes, 14)
    const nonNull = result.filter((v) => v !== null)
    expect(nonNull.length).toBeGreaterThan(0)
    expect(nonNull[0]).toBe(100)  // loss=0 → RSI=100
  })
})

describe('rsiLast', () => {
  it('데이터 부족 시 null', () => {
    expect(rsiLast([1, 2, 3], 14)).toBeNull()
  })

  it('충분한 데이터 시 숫자 반환', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + (i % 5))
    expect(rsiLast(closes, 14)).not.toBeNull()
  })
})
