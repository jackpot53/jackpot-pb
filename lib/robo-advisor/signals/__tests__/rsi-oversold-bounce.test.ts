import { describe, it, expect } from 'vitest'
import { detectRsiOversoldBounce } from '../rsi-oversold-bounce'
import type { OhlcPoint } from '@/lib/price/sparkline'

function makeOhlc(closes: number[]): OhlcPoint[] {
  return closes.map((c, i) => ({
    date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
    open: c, high: c + 5, low: c - 5, close: c,
  }))
}

describe('detectRsiOversoldBounce', () => {
  it('데이터 부족 시 false', () => {
    expect(detectRsiOversoldBounce(makeOhlc([100, 90, 80]))).toBe(false)
  })

  it('단조 상승 시 RSI 과매도 구간 없음 → false', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i * 10)
    expect(detectRsiOversoldBounce(makeOhlc(closes))).toBe(false)
  })

  it('단조 하락 → RSI 과매도지만 반등 없음 → false', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 1000 - i * 20)
    expect(detectRsiOversoldBounce(makeOhlc(closes))).toBe(false)
  })

  it('boolean 반환 보장', () => {
    const closes = Array.from({ length: 25 }, (_, i) => 100 + (i % 5) * 3)
    const result = detectRsiOversoldBounce(makeOhlc(closes))
    expect(typeof result).toBe('boolean')
  })
})
