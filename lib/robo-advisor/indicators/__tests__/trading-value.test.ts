import { describe, it, expect } from 'vitest'
import { tradingValue, avgTradingValue, avgTradingValueLast, tradingValueRatio } from '../trading-value'

describe('tradingValue', () => {
  it('close × volume 계산', () => {
    const result = tradingValue([100, 200, 300], [10, 20, 30])
    expect(result).toEqual([1000, 4000, 9000])
  })

  it('close 또는 volume이 null이면 null', () => {
    const result = tradingValue([100, null, 300], [10, 20, null])
    expect(result[0]).toBe(1000)
    expect(result[1]).toBeNull()
    expect(result[2]).toBeNull()
  })

  it('빈 배열이면 빈 배열', () => {
    expect(tradingValue([], [])).toEqual([])
  })
})

describe('avgTradingValue', () => {
  it('3일 평균 수기 계산 검증', () => {
    const values = [1000, 2000, 3000, 4000, 5000]
    const result = avgTradingValue(values, 3)
    expect(result[2]).toBeCloseTo(2000, 5)
    expect(result[3]).toBeCloseTo(3000, 5)
    expect(result[4]).toBeCloseTo(4000, 5)
  })

  it('데이터 부족 시 전부 null', () => {
    const result = avgTradingValue([1000, 2000], 5)
    expect(result.every((v) => v === null)).toBe(true)
  })

  it('null 포함 시 유효 값만으로 평균', () => {
    const result = avgTradingValue([1000, null, 3000], 3)
    expect(result[2]).toBeCloseTo(2000, 5)
  })

  it('null이 절반 초과면 null', () => {
    const result = avgTradingValue([null, null, 3000], 3)
    expect(result[2]).toBeNull()
  })
})

describe('avgTradingValueLast', () => {
  it('마지막 평균 거래대금 반환', () => {
    expect(avgTradingValueLast([1000, 2000, 3000, 4000, 5000], 3)).toBeCloseTo(4000, 5)
  })

  it('데이터 부족 시 null', () => {
    expect(avgTradingValueLast([1000], 3)).toBeNull()
  })
})

describe('tradingValueRatio', () => {
  it('거래대금 배수 계산', () => {
    const values: number[] = [...new Array(20).fill(100_000_000), 200_000_000]
    expect(tradingValueRatio(values, 20)).toBeCloseTo(2, 1)
  })

  it('오늘 거래대금 null이면 null', () => {
    const values: (number | null)[] = [...new Array(20).fill(100_000_000), null]
    expect(tradingValueRatio(values, 20)).toBeNull()
  })

  it('빈 배열이면 null', () => {
    expect(tradingValueRatio([], 20)).toBeNull()
  })
})
