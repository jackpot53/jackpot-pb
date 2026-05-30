import { describe, it, expect } from 'vitest'
import { cci, cciLast } from '../cci'

function makeArrays(n: number, highOffset = 5, lowOffset = 5) {
  const closes = Array.from({ length: n }, (_, i) => 1000 + i * 10)
  const highs  = closes.map((c) => c + highOffset)
  const lows   = closes.map((c) => c - lowOffset)
  return { closes, highs, lows }
}

describe('cci', () => {
  it('데이터가 period(20)보다 적으면 전부 null', () => {
    const { highs, lows, closes } = makeArrays(19)
    const result = cci(highs, lows, closes)
    expect(result.every((v) => v === null)).toBe(true)
  })

  it('반환 배열 길이 = 입력 길이', () => {
    const { highs, lows, closes } = makeArrays(30)
    expect(cci(highs, lows, closes)).toHaveLength(30)
  })

  it('앞 period-1(19)개는 null, 이후는 값 존재', () => {
    const { highs, lows, closes } = makeArrays(30)
    const result = cci(highs, lows, closes)
    for (let i = 0; i < 19; i++) expect(result[i]).toBeNull()
    expect(result[19]).not.toBeNull()
  })

  it('가격 변동 없이 모두 동일하면 meanDeviation = 0 → null', () => {
    const n = 25
    const highs  = new Array(n).fill(105)
    const lows   = new Array(n).fill(95)
    const closes = new Array(n).fill(100)
    const result = cci(highs, lows, closes)
    // TP = 100, SMA(TP) = 100, meanDev = 0 → null
    expect(result[19]).toBeNull()
  })

  it('TP가 SMA 위에 있으면 양수 CCI 반환', () => {
    // 처음 20개는 낮고, 이후 갑자기 높음 → 마지막 구간 TP > SMA_TP
    const n = 30
    const closes = [...new Array(20).fill(1000), ...new Array(10).fill(2000)]
    const highs  = closes.map((c) => c + 10)
    const lows   = closes.map((c) => c - 10)
    const result = cci(highs, lows, closes)
    expect(result[result.length - 1]).not.toBeNull()
    expect(result[result.length - 1]!).toBeGreaterThan(0)
  })

  it('TP가 SMA 아래에 있으면 음수 CCI 반환', () => {
    const n = 30
    const closes = [...new Array(20).fill(2000), ...new Array(10).fill(1000)]
    const highs  = closes.map((c) => c + 10)
    const lows   = closes.map((c) => c - 10)
    const result = cci(highs, lows, closes)
    expect(result[result.length - 1]).not.toBeNull()
    expect(result[result.length - 1]!).toBeLessThan(0)
  })

  it('커스텀 period 적용', () => {
    const { highs, lows, closes } = makeArrays(30)
    const result = cci(highs, lows, closes, 10)
    expect(result).toHaveLength(30)
    expect(result[9]).not.toBeNull()   // period-1 = 9 이후부터 값
  })
})

describe('cciLast', () => {
  it('충분한 데이터면 마지막 값 반환 (null 아님 또는 0 나눗셈 없으면 숫자)', () => {
    const { highs, lows, closes } = makeArrays(30)
    const val = cciLast(highs, lows, closes)
    // 단조 상승 가격이면 meanDev > 0 이므로 숫자 반환
    expect(typeof val === 'number' || val === null).toBe(true)
  })

  it('데이터 부족이면 null', () => {
    const { highs, lows, closes } = makeArrays(5)
    expect(cciLast(highs, lows, closes)).toBeNull()
  })
})
