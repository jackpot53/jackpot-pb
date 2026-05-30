import { describe, it, expect } from 'vitest'
import { volumeOscillator, volumeOscillatorLast } from '../volume-oscillator'

function vols(arr: (number | null)[]) { return arr }

describe('volumeOscillator', () => {
  it('데이터가 longPeriod(20)보다 적으면 전부 null', () => {
    const result = volumeOscillator(vols(new Array(19).fill(1000)))
    expect(result.every((v) => v === null)).toBe(true)
  })

  it('반환 배열 길이 = 입력 길이', () => {
    const input = new Array(30).fill(1000)
    expect(volumeOscillator(input)).toHaveLength(30)
  })

  it('단기 > 장기 구간은 양수 VO 반환', () => {
    // 처음 20개는 낮은 거래량, 이후 10개는 높은 거래량 → 단기 EMA가 장기 EMA 추월
    const volumes: number[] = [...new Array(20).fill(1000), ...new Array(10).fill(3000)]
    const result = volumeOscillator(volumes, 5, 20)
    const lastVal = result[result.length - 1]
    expect(lastVal).not.toBeNull()
    expect(lastVal!).toBeGreaterThan(0)
  })

  it('단기 < 장기 구간은 음수 VO 반환', () => {
    // 처음 20개 높은 거래량, 이후 10개 낮은 거래량 → 단기 EMA가 장기 EMA 하회
    const volumes: number[] = [...new Array(20).fill(3000), ...new Array(10).fill(500)]
    const result = volumeOscillator(volumes, 5, 20)
    const lastVal = result[result.length - 1]
    expect(lastVal).not.toBeNull()
    expect(lastVal!).toBeLessThan(0)
  })

  it('거래량이 균일하면 VO ≈ 0', () => {
    const volumes = new Array(30).fill(1000)
    const result = volumeOscillator(volumes, 5, 20)
    const lastVal = result[result.length - 1]
    expect(lastVal).not.toBeNull()
    expect(Math.abs(lastVal!)).toBeLessThan(0.001)
  })

  it('null 거래량 forward-fill 후 정상 계산', () => {
    // null이 섞여 있어도 결과가 나와야 함
    const volumes: (number | null)[] = [
      ...new Array(10).fill(1000),
      null, null,
      ...new Array(18).fill(1000),
    ]
    const result = volumeOscillator(volumes, 5, 20)
    // longPeriod(20) 이후 인덱스에는 유효한 값이 있어야 함
    expect(result[result.length - 1]).not.toBeNull()
  })

  it('선행 null 구간(첫 유효값 이전)은 null 반환', () => {
    const volumes: (number | null)[] = [
      null, null, null,
      ...new Array(30).fill(1000),
    ]
    const result = volumeOscillator(volumes, 5, 20)
    // 첫 3개는 null
    expect(result[0]).toBeNull()
    expect(result[1]).toBeNull()
    expect(result[2]).toBeNull()
  })

  it('커스텀 기간 적용', () => {
    const volumes = new Array(30).fill(1000)
    const result = volumeOscillator(volumes, 3, 10)
    expect(result).toHaveLength(30)
    // longPeriod(10) 이상 구간은 값 존재
    expect(result[29]).not.toBeNull()
  })
})

describe('volumeOscillatorLast', () => {
  it('충분한 데이터면 마지막 값 반환', () => {
    const volumes = new Array(30).fill(1000)
    expect(volumeOscillatorLast(volumes)).not.toBeNull()
  })

  it('데이터 부족이면 null', () => {
    const volumes = new Array(5).fill(1000)
    expect(volumeOscillatorLast(volumes)).toBeNull()
  })
})
