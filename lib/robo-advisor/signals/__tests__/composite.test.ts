import { describe, it, expect } from 'vitest'
import { computeComposite } from '../composite'
import type { OhlcPoint } from '@/lib/price/sparkline'

function makeOhlc(n: number, baseClose = 1000): OhlcPoint[] {
  return Array.from({ length: n }, (_, i) => ({
    date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
    open: baseClose + i,
    high: baseClose + i + 5,
    low: baseClose + i - 5,
    close: baseClose + i,
  }))
}

describe('computeComposite', () => {
  it('결과 구조 검증', () => {
    const ohlc = makeOhlc(60)
    const result = computeComposite(ohlc)
    expect(typeof result.triggered).toBe('boolean')
    expect(typeof result.confidence).toBe('number')
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(100)
    expect(result.signals).toHaveProperty('golden_cross')
    expect(result.signals).toHaveProperty('rsi_oversold_bounce')
    expect(result.signals).toHaveProperty('macd_cross')
    expect(result.signals).toHaveProperty('volume_breakout')
    expect(result.signals).toHaveProperty('bollinger_breakout')
    expect(result.signals).toHaveProperty('stochastic_oversold')
    expect(result.signals).toHaveProperty('adx_trend')
  })

  it('데이터 부족 시 모든 시그널 false, confidence=0', () => {
    const ohlc = makeOhlc(10)
    const result = computeComposite(ohlc)
    expect(result.confidence).toBe(0)
    expect(result.triggered).toBe(false)
    expect(Object.values(result.signals).every((v) => v === false)).toBe(true)
  })

  it('triggered = confidence ≥ 40', () => {
    const ohlc = makeOhlc(60)
    const result = computeComposite(ohlc)
    if (result.confidence >= 40) {
      expect(result.triggered).toBe(true)
    } else {
      expect(result.triggered).toBe(false)
    }
  })

  it('가중치 합산이 signals 결과와 일치', () => {
    const WEIGHTS: Record<string, number> = {
      golden_cross: 20,
      rsi_oversold_bounce: 18,
      macd_cross: 15,
      volume_breakout: 15,
      bollinger_breakout: 12,
      stochastic_oversold: 12,
      adx_trend: 8,
    }
    const ohlc = makeOhlc(60)
    const result = computeComposite(ohlc)
    const expected = Object.entries(result.signals).reduce(
      (sum, [type, fired]) => sum + (fired ? WEIGHTS[type] : 0),
      0,
    )
    expect(result.confidence).toBe(expected)
  })
})
