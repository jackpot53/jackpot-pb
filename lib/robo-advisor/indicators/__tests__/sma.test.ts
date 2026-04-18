import { describe, it, expect } from 'vitest'
import { sma, smaLast } from '../sma'

describe('sma', () => {
  it('3일 SMA 수기 계산 검증', () => {
    // [1, 2, 3, 4, 5] → SMA3: [null, null, 2, 3, 4]
    const result = sma([1, 2, 3, 4, 5], 3)
    expect(result).toEqual([null, null, 2, 3, 4])
  })

  it('데이터가 period와 정확히 같을 때 마지막 값만 유효', () => {
    const result = sma([10, 20, 30], 3)
    expect(result[0]).toBeNull()
    expect(result[1]).toBeNull()
    expect(result[2]).toBe(20)
  })

  it('데이터 부족 시 전부 null', () => {
    const result = sma([1, 2], 5)
    expect(result.every((v) => v === null)).toBe(true)
  })

  it('period=1이면 자기 자신', () => {
    const closes = [5, 10, 15]
    const result = sma(closes, 1)
    expect(result).toEqual([5, 10, 15])
  })

  it('슬라이딩 윈도우 정확성 — 소수점', () => {
    // [10, 20, 30, 40] SMA2: [null, 15, 25, 35]
    const result = sma([10, 20, 30, 40], 2)
    expect(result).toEqual([null, 15, 25, 35])
  })
})

describe('smaLast', () => {
  it('마지막 SMA 값 반환', () => {
    expect(smaLast([1, 2, 3, 4, 5], 3)).toBe(4)
  })

  it('데이터 부족 시 null', () => {
    expect(smaLast([1, 2], 5)).toBeNull()
  })

  it('period=0 이면 null', () => {
    expect(smaLast([1, 2, 3], 0)).toBeNull()
  })
})
