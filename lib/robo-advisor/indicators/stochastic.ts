import { sma } from './sma'

export interface StochasticPoint {
  k: number | null
  d: number | null  // 3일 SMA of %K
}

/**
 * Stochastic Oscillator.
 * %K = (Close - Lowest Low(kPeriod)) / (Highest High(kPeriod) - Lowest Low(kPeriod)) × 100
 * %D = SMA(%K, dPeriod)
 */
export function stochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod = 14,
  dPeriod = 3,
): StochasticPoint[] {
  const len = Math.min(highs.length, lows.length, closes.length)
  const result: StochasticPoint[] = Array.from({ length: len }, () => ({ k: null, d: null }))

  if (len < kPeriod) return result

  // %K 계산
  const kValues: (number | null)[] = new Array(len).fill(null)
  for (let i = kPeriod - 1; i < len; i++) {
    const sliceHighs = highs.slice(i - kPeriod + 1, i + 1)
    const sliceLows = lows.slice(i - kPeriod + 1, i + 1)
    const highestHigh = Math.max(...sliceHighs)
    const lowestLow = Math.min(...sliceLows)
    const range = highestHigh - lowestLow
    // range = 0이면 50으로 처리 (가격 변동 없음)
    kValues[i] = range === 0 ? 50 : ((closes[i] - lowestLow) / range) * 100
  }

  // %D = SMA(%K, dPeriod) — null 제외하고 계산
  const kNonNull = kValues as number[]
  const dFromK = sma(kNonNull, dPeriod)

  for (let i = 0; i < len; i++) {
    result[i] = { k: kValues[i], d: kValues[i] !== null ? dFromK[i] : null }
  }

  return result
}

/** 마지막 Stochastic 포인트. */
export function stochasticLast(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod = 14,
  dPeriod = 3,
): StochasticPoint {
  const arr = stochastic(highs, lows, closes, kPeriod, dPeriod)
  return arr[arr.length - 1] ?? { k: null, d: null }
}
