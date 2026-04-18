import { describe, it, expect } from 'vitest'
import { ema, emaLast } from '../ema'

describe('ema', () => {
  it('period=3, 초기 EMA = SMA(3)', () => {
    // closes: [10, 20, 30, 40]
    // EMA3: 초기 = (10+20+30)/3 = 20, k = 2/(3+1) = 0.5
    // idx3: 40*0.5 + 20*0.5 = 30
    const result = ema([10, 20, 30, 40], 3)
    expect(result[0]).toBeNull()
    expect(result[1]).toBeNull()
    expect(result[2]).toBe(20)
    expect(result[3]).toBeCloseTo(30, 5)
  })

  it('데이터 부족 시 전부 null', () => {
    const result = ema([1, 2], 5)
    expect(result.every((v) => v === null)).toBe(true)
  })

  it('EMA 다음 스텝 수기 검증', () => {
    // [10, 20, 30, 40, 50], period=3, k=0.5
    // idx2: 20, idx3: 40*0.5 + 20*0.5 = 30, idx4: 50*0.5 + 30*0.5 = 40
    const result = ema([10, 20, 30, 40, 50], 3)
    expect(result[4]).toBeCloseTo(40, 5)
  })
})

describe('emaLast', () => {
  it('마지막 EMA 값 반환', () => {
    const result = emaLast([10, 20, 30, 40, 50], 3)
    expect(result).toBeCloseTo(40, 5)
  })

  it('데이터 부족 시 null', () => {
    expect(emaLast([1, 2], 5)).toBeNull()
  })
})
