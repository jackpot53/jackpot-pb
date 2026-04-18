import type { OhlcPoint } from '@/lib/price/sparkline'
import { macd } from '../indicators/macd'

/**
 * MACD 골든 크로스 감지.
 * - 어제: MACD ≤ Signal
 * - 오늘: MACD > Signal (상향 돌파)
 * - 오늘 히스토그램 ≥ 0 (0 이상으로 전환)
 *
 * 최소 데이터 요구: 40개 (EMA26 + signal9 = 35 + 여유).
 */
export function detectMacdCross(ohlc: OhlcPoint[]): boolean {
  if (ohlc.length < 40) return false

  const closes = ohlc.map((p) => p.close)
  const macdArr = macd(closes)

  const n = macdArr.length
  const today = macdArr[n - 1]
  const yesterday = macdArr[n - 2]

  if (
    today.macd === null ||
    today.signal === null ||
    today.histogram === null ||
    yesterday.macd === null ||
    yesterday.signal === null
  ) return false

  const crossedUp = yesterday.macd <= yesterday.signal && today.macd > today.signal
  const histogramPositive = today.histogram >= 0

  return crossedUp && histogramPositive
}
