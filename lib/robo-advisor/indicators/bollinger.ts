import { sma } from './sma'

export interface BollingerPoint {
  upper: number | null
  middle: number | null   // 20일 SMA
  lower: number | null
  /** (upper - lower) / middle — 스퀴즈 감지용 */
  bandwidth: number | null
}

/**
 * 볼린저 밴드.
 * middle = SMA(period)
 * upper = middle + stdDev × σ
 * lower = middle - stdDev × σ
 * bandwidth = (upper - lower) / middle
 */
export function bollinger(
  closes: number[],
  period = 20,
  stdDevMultiplier = 2,
): BollingerPoint[] {
  const result: BollingerPoint[] = closes.map(() => ({
    upper: null, middle: null, lower: null, bandwidth: null,
  }))

  if (closes.length < period) return result

  const smaValues = sma(closes, period)

  for (let i = period - 1; i < closes.length; i++) {
    const mid = smaValues[i]!
    // 표본 표준편차 (population std dev, 금융에서 통상 사용)
    const slice = closes.slice(i - period + 1, i + 1)
    const variance = slice.reduce((sum, v) => sum + (v - mid) ** 2, 0) / period
    const sigma = Math.sqrt(variance)

    const upper = mid + stdDevMultiplier * sigma
    const lower = mid - stdDevMultiplier * sigma
    result[i] = {
      upper,
      middle: mid,
      lower,
      bandwidth: mid !== 0 ? (upper - lower) / mid : null,
    }
  }

  return result
}

/** 마지막 볼린저 밴드 포인트. */
export function bollingerLast(
  closes: number[],
  period = 20,
  stdDevMultiplier = 2,
): BollingerPoint {
  const arr = bollinger(closes, period, stdDevMultiplier)
  return arr[arr.length - 1] ?? { upper: null, middle: null, lower: null, bandwidth: null }
}
