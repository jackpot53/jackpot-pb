import type { OhlcPoint } from '@/lib/price/sparkline'
import { adxLast } from '../indicators/adx'

const ADX_STRONG_TREND = 25

/**
 * ADX 강한 상승 추세 감지.
 * - ADX ≥ 25 (강한 추세 존재)
 * - +DI > -DI (상승 방향)
 */
export function detectAdxTrend(ohlc: OhlcPoint[]): boolean {
  if (ohlc.length < 29) return false  // 2*period(14) + 1

  const highs = ohlc.map((p) => p.high)
  const lows = ohlc.map((p) => p.low)
  const closes = ohlc.map((p) => p.close)

  const { adx, diPlus, diMinus } = adxLast(highs, lows, closes)

  if (adx === null || diPlus === null || diMinus === null) return false

  return adx >= ADX_STRONG_TREND && diPlus > diMinus
}
