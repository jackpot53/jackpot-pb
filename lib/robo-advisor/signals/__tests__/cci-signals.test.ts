import { describe, it, expect } from 'vitest'
import {
  detectCciSignalsFromCci,
  lastCciSignalFromCci,
  detectCciSignals,
} from '../cci-signals'
import type { OhlcPoint } from '@/lib/price/sparkline'

function makeOhlc(n: number): OhlcPoint[] {
  return Array.from({ length: n }, (_, i) => ({
    date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
    open: 1000, high: 1005, low: 995, close: 1000,
  }))
}

describe('detectCciSignalsFromCci', () => {
  it('CCI가 -100 이하 → -100 초과: buy 이벤트', () => {
    const cciArr = [null, -150, -105, -80]
    const dates  = ['d1', 'd2', 'd3', 'd4']
    const events = detectCciSignalsFromCci(cciArr, dates)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('buy')
    expect(events[0].date).toBe('d4')
    expect(events[0].value).toBeCloseTo(-80)
  })

  it('CCI가 +100 이상 → +100 미만: sell 이벤트', () => {
    const cciArr = [120, 105, 90]
    const dates  = ['d1', 'd2', 'd3']
    const events = detectCciSignalsFromCci(cciArr, dates)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('sell')
    expect(events[0].date).toBe('d3')
  })

  it('null 구간은 건너뜀', () => {
    const cciArr = [null, null, null]
    const dates  = ['d1', 'd2', 'd3']
    expect(detectCciSignalsFromCci(cciArr, dates)).toHaveLength(0)
  })

  it('-100 이하 유지 → 이벤트 없음', () => {
    const cciArr = [-120, -130, -110]
    const dates  = ['d1', 'd2', 'd3']
    expect(detectCciSignalsFromCci(cciArr, dates)).toHaveLength(0)
  })

  it('여러 이벤트 수집', () => {
    const cciArr = [-110, -90, 50, 110, 90]
    const dates  = ['d1', 'd2', 'd3', 'd4', 'd5']
    const events = detectCciSignalsFromCci(cciArr, dates)
    expect(events).toHaveLength(2)
    expect(events[0].type).toBe('buy')   // -110→-90
    expect(events[1].type).toBe('sell')  // 110→90
  })

  it('prev = -100이면 상향 돌파 조건 충족(≤-100)', () => {
    const cciArr = [-100, -90]
    const dates  = ['d1', 'd2']
    const events = detectCciSignalsFromCci(cciArr, dates)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('buy')
  })
})

describe('lastCciSignalFromCci', () => {
  it('가장 최근 이벤트 반환', () => {
    const cciArr = [-110, -90, 50, 110, 90]
    const dates  = ['d1', 'd2', 'd3', 'd4', 'd5']
    const last = lastCciSignalFromCci(cciArr, dates)
    expect(last).not.toBeNull()
    expect(last!.type).toBe('sell')
    expect(last!.daysAgo).toBe(0)
  })

  it('이벤트 없으면 null', () => {
    const cciArr = [50, 60, 70]
    const dates  = ['d1', 'd2', 'd3']
    expect(lastCciSignalFromCci(cciArr, dates)).toBeNull()
  })

  it('daysAgo 계산', () => {
    const cciArr = [-110, -90, 50, 60, 70]
    const dates  = ['d1', 'd2', 'd3', 'd4', 'd5']
    const last = lastCciSignalFromCci(cciArr, dates)
    // 이벤트 인덱스 1, 마지막 인덱스 4 → daysAgo = 3
    expect(last!.daysAgo).toBe(3)
  })
})

describe('detectCciSignals (OhlcPoint 진입점)', () => {
  it('데이터 부족(< 20)이면 빈 배열', () => {
    expect(detectCciSignals(makeOhlc(19))).toHaveLength(0)
  })

  it('충분한 데이터에서 배열 반환', () => {
    expect(Array.isArray(detectCciSignals(makeOhlc(30)))).toBe(true)
  })
})
