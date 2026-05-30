import { describe, it, expect } from 'vitest'
import {
  detectRsiSignalsFromRsi,
  lastRsiSignalFromRsi,
  detectRsiSignals,
} from '../rsi-signals'
import type { OhlcPoint } from '@/lib/price/sparkline'

function makeOhlc(closes: number[]): OhlcPoint[] {
  return closes.map((c, i) => ({
    date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
    open: c, high: c + 5, low: c - 5, close: c,
  }))
}

describe('detectRsiSignalsFromRsi', () => {
  it('RSI가 30 이하 → 30 초과: buy 이벤트', () => {
    const rsi = [null, null, 25, 28, 31]
    const dates = ['d1', 'd2', 'd3', 'd4', 'd5']
    const events = detectRsiSignalsFromRsi(rsi, dates)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('buy')
    expect(events[0].date).toBe('d5')
    expect(events[0].value).toBeCloseTo(31)
  })

  it('RSI가 70 이상 → 70 미만: sell 이벤트', () => {
    const rsi = [75, 72, 68]
    const dates = ['d1', 'd2', 'd3']
    const events = detectRsiSignalsFromRsi(rsi, dates)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('sell')
    expect(events[0].date).toBe('d3')
  })

  it('null 구간은 건너뜀', () => {
    const rsi = [null, null, null]
    const dates = ['d1', 'd2', 'd3']
    expect(detectRsiSignalsFromRsi(rsi, dates)).toHaveLength(0)
  })

  it('70 이상에서 유지 → 이벤트 없음', () => {
    const rsi = [72, 75, 78]
    const dates = ['d1', 'd2', 'd3']
    expect(detectRsiSignalsFromRsi(rsi, dates)).toHaveLength(0)
  })

  it('여러 이벤트 수집', () => {
    const rsi = [28, 32, 50, 72, 68]
    const dates = ['d1', 'd2', 'd3', 'd4', 'd5']
    const events = detectRsiSignalsFromRsi(rsi, dates)
    expect(events).toHaveLength(2)
    expect(events[0].type).toBe('buy')   // 28→32
    expect(events[1].type).toBe('sell')  // 72→68
  })

  it('prev = 30 이면 상향 돌파 조건 충족(≤30)', () => {
    const rsi = [30, 31]
    const dates = ['d1', 'd2']
    const events = detectRsiSignalsFromRsi(rsi, dates)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('buy')
  })
})

describe('lastRsiSignalFromRsi', () => {
  it('가장 최근 이벤트와 daysAgo 반환', () => {
    const rsi = [28, 32, 50, 72, 68]
    const dates = ['d1', 'd2', 'd3', 'd4', 'd5']
    const last = lastRsiSignalFromRsi(rsi, dates)
    expect(last).not.toBeNull()
    expect(last!.type).toBe('sell')  // 72→68 (인덱스 4)
    expect(last!.daysAgo).toBe(0)    // 마지막 인덱스 4, 이벤트 인덱스 4 → 4-4=0
  })

  it('이벤트 없으면 null', () => {
    const rsi = [50, 55, 60]
    const dates = ['d1', 'd2', 'd3']
    expect(lastRsiSignalFromRsi(rsi, dates)).toBeNull()
  })

  it('daysAgo: 이벤트가 마지막에서 2일 전', () => {
    const rsi = [28, 32, 50, 55, 60]
    const dates = ['d1', 'd2', 'd3', 'd4', 'd5']
    const last = lastRsiSignalFromRsi(rsi, dates)
    expect(last).not.toBeNull()
    // 이벤트 인덱스 1 (d2), 마지막 인덱스 4 → daysAgo = 3
    expect(last!.daysAgo).toBe(3)
  })
})

describe('detectRsiSignals (OhlcPoint 진입점)', () => {
  it('데이터 부족(< 15)이면 빈 배열', () => {
    const ohlc = makeOhlc(new Array(14).fill(100))
    expect(detectRsiSignals(ohlc)).toHaveLength(0)
  })

  it('충분한 데이터에서 함수가 배열을 반환', () => {
    const ohlc = makeOhlc(new Array(30).fill(100))
    // 가격 일정 → RSI ≈ 50 → 이벤트 없음, 빈 배열
    expect(Array.isArray(detectRsiSignals(ohlc))).toBe(true)
  })
})
