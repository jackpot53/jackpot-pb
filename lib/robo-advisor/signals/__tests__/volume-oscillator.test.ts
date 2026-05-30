import { describe, it, expect } from 'vitest'
import {
  detectVolumeOscillatorCrossesFromVo,
  lastVolumeOscillatorCrossFromVo,
  detectVolumeOscillatorCrosses,
} from '../volume-oscillator'
import type { OhlcPoint } from '@/lib/price/sparkline'

function makeOhlc(closes: number[], volumes: (number | null)[]): OhlcPoint[] {
  return closes.map((c, i) => ({
    date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
    open: c, high: c + 10, low: c - 10, close: c,
    volume: volumes[i] ?? null,
  }))
}

describe('detectVolumeOscillatorCrossesFromVo', () => {
  it('VO가 0 아래 → 0 위로 돌파 + 가격 상승 → buy 이벤트', () => {
    const vo: (number | null)[] = [null, null, -5, -2, 3]
    const closes = [100, 100, 100, 100, 102]
    const dates = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05']
    const events = detectVolumeOscillatorCrossesFromVo(vo, closes, dates)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('buy')
    expect(events[0].date).toBe('2024-01-05')
    expect(events[0].value).toBeCloseTo(3)
  })

  it('VO가 0 아래 → 0 위로 돌파 + 가격 하락 → sell 이벤트', () => {
    const vo: (number | null)[] = [-5, -2, 3]
    const closes = [100, 102, 98]
    const dates = ['2024-01-01', '2024-01-02', '2024-01-03']
    const events = detectVolumeOscillatorCrossesFromVo(vo, closes, dates)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('sell')
  })

  it('VO가 0 위 → 0 아래(하향 돌파)는 이벤트 없음', () => {
    const vo: (number | null)[] = [5, 2, -3]
    const closes = [100, 100, 100]
    const dates = ['2024-01-01', '2024-01-02', '2024-01-03']
    const events = detectVolumeOscillatorCrossesFromVo(vo, closes, dates)
    expect(events).toHaveLength(0)
  })

  it('null 구간은 건너뜀', () => {
    const vo: (number | null)[] = [null, null, null]
    const closes = [100, 100, 100]
    const dates = ['2024-01-01', '2024-01-02', '2024-01-03']
    const events = detectVolumeOscillatorCrossesFromVo(vo, closes, dates)
    expect(events).toHaveLength(0)
  })

  it('여러 돌파 시점 모두 수집', () => {
    // -5 → 3 (buy), 이후 음수로 내려갔다 다시 → 1 (sell)
    const vo: (number | null)[] = [-5, 3, 2, -1, 1]
    const closes = [100, 103, 104, 103, 101]
    const dates = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05']
    const events = detectVolumeOscillatorCrossesFromVo(vo, closes, dates)
    expect(events).toHaveLength(2)
    expect(events[0].type).toBe('buy')
    expect(events[1].type).toBe('sell') // closes[4](101) < closes[3](103)
  })

  it('prev = 0이면 상향 돌파 조건 충족 (prev ≤ 0)', () => {
    const vo: (number | null)[] = [0, 2]
    const closes = [100, 102]
    const dates = ['2024-01-01', '2024-01-02']
    const events = detectVolumeOscillatorCrossesFromVo(vo, closes, dates)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('buy')
  })
})

describe('lastVolumeOscillatorCrossFromVo', () => {
  it('마지막 이벤트와 daysAgo 반환', () => {
    const vo: (number | null)[] = [-5, 3, 2, -1, 1]
    const closes = [100, 103, 104, 103, 101]
    const dates = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05']
    const last = lastVolumeOscillatorCrossFromVo(vo, closes, dates)
    expect(last).not.toBeNull()
    expect(last!.date).toBe('2024-01-05')
    expect(last!.daysAgo).toBe(0)   // 마지막 인덱스 4 → 4-4 = 0
    expect(last!.type).toBe('sell')
  })

  it('이벤트 없으면 null', () => {
    const vo: (number | null)[] = [5, 4, 3]
    const closes = [100, 100, 100]
    const dates = ['2024-01-01', '2024-01-02', '2024-01-03']
    expect(lastVolumeOscillatorCrossFromVo(vo, closes, dates)).toBeNull()
  })

  it('daysAgo: 첫 번째 이벤트가 끝에서 3일 전', () => {
    const vo: (number | null)[] = [-1, 2, 1, 0.5, -0.5]
    const closes = [100, 102, 103, 104, 103]
    const dates = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05']
    const last = lastVolumeOscillatorCrossFromVo(vo, closes, dates)
    expect(last).not.toBeNull()
    // 돌파는 인덱스 1 (dates[1]) → daysAgo = 4 - 1 = 3
    expect(last!.daysAgo).toBe(3)
  })
})

describe('detectVolumeOscillatorCrosses (OhlcPoint 진입점)', () => {
  it('데이터 부족(< 20)이면 빈 배열', () => {
    const ohlc = makeOhlc(new Array(19).fill(100), new Array(19).fill(1000))
    expect(detectVolumeOscillatorCrosses(ohlc)).toHaveLength(0)
  })

  it('충분한 데이터에서 이벤트 감지', () => {
    // 처음 20개는 낮은 거래량, 이후 10개는 높은 거래량 → VO가 0선 상향 돌파 예상
    const volumes: (number | null)[] = [
      ...new Array(20).fill(500),
      ...new Array(10).fill(5000),
    ]
    const closes: number[] = [
      ...new Array(20).fill(1000),
      ...new Array(10).fill(1050), // 가격도 상승
    ]
    const ohlc = makeOhlc(closes, volumes)
    const events = detectVolumeOscillatorCrosses(ohlc)
    // 거래량 급증 구간에서 최소 1개 이상의 돌파 이벤트 발생 기대
    expect(events.length).toBeGreaterThanOrEqual(1)
  })

  it('모든 거래량이 null이면 빈 배열', () => {
    const ohlc = makeOhlc(new Array(30).fill(1000), new Array(30).fill(null))
    expect(detectVolumeOscillatorCrosses(ohlc)).toHaveLength(0)
  })
})
