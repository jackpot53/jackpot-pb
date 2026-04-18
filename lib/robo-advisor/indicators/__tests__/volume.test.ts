import { describe, it, expect } from 'vitest'
import { avgVolume, avgVolumeLast, volumeRatio } from '../volume'

describe('avgVolume', () => {
  it('3일 평균 수기 계산 검증', () => {
    const volumes = [100, 200, 300, 400, 500]
    const result = avgVolume(volumes, 3)
    expect(result[2]).toBeCloseTo(200, 5)
    expect(result[3]).toBeCloseTo(300, 5)
    expect(result[4]).toBeCloseTo(400, 5)
  })

  it('데이터 부족 시 전부 null', () => {
    const result = avgVolume([100, 200], 5)
    expect(result.every((v) => v === null)).toBe(true)
  })

  it('null 포함 시 유효 값만으로 평균', () => {
    // [100, null, 300] → valid 2개, period=3이지만 ceil(3/2)=2이므로 계산 가능
    const result = avgVolume([100, null, 300], 3)
    expect(result[2]).toBeCloseTo(200, 5)
  })

  it('null이 절반 초과면 null', () => {
    // [null, null, 300] → valid 1개 < ceil(3/2)=2 → null
    const result = avgVolume([null, null, 300], 3)
    expect(result[2]).toBeNull()
  })
})

describe('avgVolumeLast', () => {
  it('마지막 평균 거래량 반환', () => {
    expect(avgVolumeLast([100, 200, 300, 400, 500], 3)).toBeCloseTo(400, 5)
  })

  it('데이터 부족 시 null', () => {
    expect(avgVolumeLast([100], 3)).toBeNull()
  })
})

describe('volumeRatio', () => {
  it('거래량 배수 계산', () => {
    // 이전 20개 평균 = 100, 오늘 = 200 → ratio = 2
    const volumes: number[] = [...new Array(20).fill(100), 200]
    expect(volumeRatio(volumes, 20)).toBeCloseTo(2, 1)
  })

  it('오늘 거래량 null이면 null', () => {
    const volumes: (number | null)[] = [...new Array(20).fill(100), null]
    expect(volumeRatio(volumes, 20)).toBeNull()
  })

  it('빈 배열이면 null', () => {
    expect(volumeRatio([], 20)).toBeNull()
  })
})
