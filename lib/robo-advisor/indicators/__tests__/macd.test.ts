import { describe, it, expect } from 'vitest'
import { macd, macdLast } from '../macd'

// 충분한 데이터 생성 헬퍼 (slow=26 + signal=9 최소 35개 이상)
function makeCloses(n: number, base = 100, step = 1): number[] {
  return Array.from({ length: n }, (_, i) => base + i * step)
}

describe('macd', () => {
  it('데이터 부족 시 전부 null', () => {
    const result = macd(makeCloses(20))
    expect(result.every((p) => p.macd === null)).toBe(true)
  })

  it('충분한 데이터(35+) 시 마지막 MACD 값 유효', () => {
    const result = macd(makeCloses(40))
    const last = result[result.length - 1]
    expect(last.macd).not.toBeNull()
    expect(last.signal).not.toBeNull()
    expect(last.histogram).not.toBeNull()
  })

  it('histogram = macd - signal', () => {
    const result = macd(makeCloses(50))
    for (const p of result) {
      if (p.macd !== null && p.signal !== null && p.histogram !== null) {
        expect(p.histogram).toBeCloseTo(p.macd - p.signal, 8)
      }
    }
  })

  it('단조 상승 시 fast EMA > slow EMA → macd > 0', () => {
    const result = macd(makeCloses(50, 100, 2))
    const last = result[result.length - 1]
    // 단조 상승 시 fast > slow이므로 MACD > 0
    expect(last.macd).not.toBeNull()
    expect(last.macd!).toBeGreaterThan(0)
  })
})

describe('macdLast', () => {
  it('데이터 부족 시 전부 null 반환', () => {
    const result = macdLast([1, 2, 3])
    expect(result.macd).toBeNull()
    expect(result.signal).toBeNull()
    expect(result.histogram).toBeNull()
  })
})
