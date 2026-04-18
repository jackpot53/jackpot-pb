import type { OhlcPoint } from '@/lib/price/sparkline'
import { stochastic } from '../indicators/stochastic'

const OVERSOLD_THRESHOLD = 30

/**
 * 스토캐스틱 과매도 반등 감지.
 * - %K와 %D가 모두 30 이하인 과매도 구간
 * - 어제: %K ≤ %D (하락 또는 정체)
 * - 오늘: %K > %D (상향 교차)
 */
export function detectStochasticOversold(ohlc: OhlcPoint[]): boolean {
  if (ohlc.length < 17) return false  // kPeriod(14) + dPeriod(3)

  const highs = ohlc.map((p) => p.high)
  const lows = ohlc.map((p) => p.low)
  const closes = ohlc.map((p) => p.close)

  const stochArr = stochastic(highs, lows, closes)

  const n = stochArr.length
  const today = stochArr[n - 1]
  const yesterday = stochArr[n - 2]

  if (
    today.k === null ||
    today.d === null ||
    yesterday.k === null ||
    yesterday.d === null
  ) return false

  const crossedUp = yesterday.k <= yesterday.d && today.k > today.d
  const bothOversold = today.k <= OVERSOLD_THRESHOLD && today.d <= OVERSOLD_THRESHOLD

  return crossedUp && bothOversold
}
