import { describe, it, expect } from 'vitest'
import { atr, atrLast } from '../atr'

describe('atr', () => {
  it('데이터 부족 시 전부 null (period=14, 15개 미만)', () => {
    const data = Array.from({ length: 14 }, (_, i) => 100 + i)
    const result = atr(data, data, data, 14)
    expect(result.every((v) => v === null)).toBe(true)
  })

  it('ATR 수기 계산 검증 (period=3)', () => {
    // TR[i] = High-Low (이전 종가 == 현재 High/Low 근처일 때)
    // 단순화: high=low+10, close=high-5, prev_close=이전 close
    const highs = [110, 120, 130, 140, 150]
    const lows =  [100, 110, 120, 130, 140]
    const closes = [105, 115, 125, 135, 145]
    // TR[1]: max(120-110, |120-105|, |110-105|) = max(10,15,5) = 15
    // TR[2]: max(130-120, |130-115|, |120-115|) = max(10,15,5) = 15
    // TR[3]: max(140-130, |140-125|, |130-125|) = max(10,15,5) = 15
    // 초기 ATR(period=3) = (TR[1]+TR[2]+TR[3])/3 = 15
    const result = atr(highs, lows, closes, 3)
    expect(result[3]).toBeCloseTo(15, 5)
  })

  it('ATR는 항상 양수', () => {
    const n = 20
    const highs = Array.from({ length: n }, (_, i) => 100 + i + 5)
    const lows = Array.from({ length: n }, (_, i) => 100 + i)
    const closes = Array.from({ length: n }, (_, i) => 100 + i + 2)
    const result = atr(highs, lows, closes, 14)
    for (const v of result) {
      if (v !== null) expect(v).toBeGreaterThan(0)
    }
  })
})

describe('atrLast', () => {
  it('데이터 부족 시 null', () => {
    expect(atrLast([1], [1], [1], 14)).toBeNull()
  })
})
