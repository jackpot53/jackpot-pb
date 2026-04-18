import { describe, it, expect } from 'vitest'
import { detectVolumeBreakout } from '../volume-breakout'
import type { OhlcPoint } from '@/lib/price/sparkline'

interface OhlcWithVolume extends OhlcPoint {
  volume: number | null
}

function makeOhlcWithVolume(closes: number[], volumes: (number | null)[]): OhlcWithVolume[] {
  return closes.map((c, i) => ({
    date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
    open: c, high: c + 5, low: c - 5, close: c,
    volume: volumes[i] ?? null,
  }))
}

describe('detectVolumeBreakout', () => {
  it('데이터 부족 시 false', () => {
    const ohlc = makeOhlcWithVolume([100, 102], [1000, 3000])
    expect(detectVolumeBreakout(ohlc)).toBe(false)
  })

  it('거래량 2배 이상 + 2% 상승 → true', () => {
    // 이전 20일 평균 거래량 = 1000, 오늘 = 2500 (2.5배), 오늘 가격 2% 상승
    const closes = [...new Array(21).fill(1000), 1020.1]
    const volumes: (number | null)[] = [...new Array(21).fill(1000), 2500]
    const ohlc = makeOhlcWithVolume(closes, volumes)
    expect(detectVolumeBreakout(ohlc)).toBe(true)
  })

  it('거래량 2배지만 가격 상승 미달 → false', () => {
    const closes = [...new Array(21).fill(1000), 1010]  // 1% 상승
    const volumes: (number | null)[] = [...new Array(21).fill(1000), 2500]
    const ohlc = makeOhlcWithVolume(closes, volumes)
    expect(detectVolumeBreakout(ohlc)).toBe(false)
  })

  it('가격 2% 상승이지만 거래량 미달 → false', () => {
    const closes = [...new Array(21).fill(1000), 1021]
    const volumes: (number | null)[] = [...new Array(21).fill(1000), 1500]  // 1.5배
    const ohlc = makeOhlcWithVolume(closes, volumes)
    expect(detectVolumeBreakout(ohlc)).toBe(false)
  })

  it('오늘 거래량 null → false', () => {
    const closes = [...new Array(21).fill(1000), 1021]
    const volumes: (number | null)[] = [...new Array(21).fill(1000), null]
    const ohlc = makeOhlcWithVolume(closes, volumes)
    expect(detectVolumeBreakout(ohlc)).toBe(false)
  })
})
