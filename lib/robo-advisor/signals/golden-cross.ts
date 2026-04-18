import type { OhlcPoint } from '@/lib/price/sparkline'
import { sma } from '../indicators/sma'

/**
 * 골든 크로스 감지: 5일 SMA가 20일 SMA를 오늘 상향 돌파.
 * - 어제: 5일선 ≤ 20일선
 * - 오늘: 5일선 > 20일선
 *
 * 최소 데이터 요구: 25개.
 */
export function detectGoldenCross(ohlc: OhlcPoint[]): boolean {
  if (ohlc.length < 25) return false

  const closes = ohlc.map((p) => p.close)
  const sma5 = sma(closes, 5)
  const sma20 = sma(closes, 20)

  const n = closes.length
  const todaySma5 = sma5[n - 1]
  const todaySma20 = sma20[n - 1]
  const yesterdaySma5 = sma5[n - 2]
  const yesterdaySma20 = sma20[n - 2]

  if (
    todaySma5 === null ||
    todaySma20 === null ||
    yesterdaySma5 === null ||
    yesterdaySma20 === null
  ) return false

  return yesterdaySma5 <= yesterdaySma20 && todaySma5 > todaySma20
}
