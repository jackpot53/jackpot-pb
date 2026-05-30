import { describe, it, expect } from 'vitest'
import {
  detectStochasticSignalsFromStoch,
  lastStochasticSignalFromStoch,
  detectStochasticSignals,
} from '../stochastic-signals'
import type { StochasticPoint } from '@/lib/robo-advisor/indicators/stochastic'
import type { OhlcPoint } from '@/lib/price/sparkline'

function pt(k: number | null, d: number | null): StochasticPoint {
  return { k, d }
}

function makeOhlc(n: number): OhlcPoint[] {
  return Array.from({ length: n }, (_, i) => ({
    date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
    open: 1000, high: 1005, low: 995, close: 1000,
  }))
}

describe('detectStochasticSignalsFromStoch', () => {
  it('과매도(≤20)에서 %K 상향 교차 → buy', () => {
    const stoch = [pt(10, 15), pt(18, 12)]  // prev: k≤d; curr: k>d, both ≤20
    const dates = ['d1', 'd2']
    const events = detectStochasticSignalsFromStoch(stoch, dates)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('buy')
    expect(events[0].k).toBeCloseTo(18)
    expect(events[0].d).toBeCloseTo(12)
  })

  it('과매수(≥80)에서 %K 하향 교차 → sell', () => {
    const stoch = [pt(90, 85), pt(82, 88)]  // prev: k≥d; curr: k<d, both ≥80
    const dates = ['d1', 'd2']
    const events = detectStochasticSignalsFromStoch(stoch, dates)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('sell')
  })

  it('과매도 교차이지만 %D > 20이면 이벤트 없음', () => {
    const stoch = [pt(10, 25), pt(22, 18)]  // curr.d < 20 but prev.d > 20
    const dates = ['d1', 'd2']
    // curr.k(22) > OVERSOLD(20) → 매수 조건 불충족
    expect(detectStochasticSignalsFromStoch(stoch, dates)).toHaveLength(0)
  })

  it('중립 구간 교차 → 이벤트 없음', () => {
    const stoch = [pt(50, 55), pt(60, 50)]  // 교차하지만 중립 구간
    const dates = ['d1', 'd2']
    expect(detectStochasticSignalsFromStoch(stoch, dates)).toHaveLength(0)
  })

  it('null 포인트는 건너뜀', () => {
    const stoch = [pt(null, null), pt(null, null)]
    const dates = ['d1', 'd2']
    expect(detectStochasticSignalsFromStoch(stoch, dates)).toHaveLength(0)
  })

  it('여러 이벤트 수집', () => {
    const stoch = [
      pt(10, 15), pt(18, 12),   // buy (인덱스 1)
      pt(85, 80), pt(82, 88),   // sell (인덱스 3)
    ]
    const dates = ['d1', 'd2', 'd3', 'd4']
    const events = detectStochasticSignalsFromStoch(stoch, dates)
    expect(events).toHaveLength(2)
    expect(events[0].type).toBe('buy')
    expect(events[1].type).toBe('sell')
  })
})

describe('lastStochasticSignalFromStoch', () => {
  it('가장 최근 이벤트와 daysAgo 반환', () => {
    const stoch = [pt(10, 15), pt(18, 12), pt(50, 50), pt(85, 80), pt(82, 88)]
    const dates = ['d1', 'd2', 'd3', 'd4', 'd5']
    const last = lastStochasticSignalFromStoch(stoch, dates)
    expect(last).not.toBeNull()
    expect(last!.type).toBe('sell')
    expect(last!.daysAgo).toBe(0)  // 이벤트 인덱스 4, 마지막 4 → 0
  })

  it('이벤트 없으면 null', () => {
    const stoch = [pt(50, 55), pt(55, 50), pt(60, 58)]
    const dates = ['d1', 'd2', 'd3']
    expect(lastStochasticSignalFromStoch(stoch, dates)).toBeNull()
  })

  it('daysAgo 계산', () => {
    const stoch = [pt(10, 15), pt(18, 12), pt(50, 50), pt(55, 52), pt(60, 58)]
    const dates = ['d1', 'd2', 'd3', 'd4', 'd5']
    const last = lastStochasticSignalFromStoch(stoch, dates)
    expect(last).not.toBeNull()
    // 이벤트 인덱스 1, 마지막 인덱스 4 → daysAgo = 3
    expect(last!.daysAgo).toBe(3)
  })
})

describe('detectStochasticSignals (OhlcPoint 진입점)', () => {
  it('데이터 부족(< 17)이면 빈 배열', () => {
    expect(detectStochasticSignals(makeOhlc(16))).toHaveLength(0)
  })

  it('충분한 데이터에서 배열 반환', () => {
    expect(Array.isArray(detectStochasticSignals(makeOhlc(30)))).toBe(true)
  })
})
