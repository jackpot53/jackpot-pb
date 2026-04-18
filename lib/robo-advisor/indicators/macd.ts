import { ema } from './ema'

export interface MacdPoint {
  macd: number | null
  signal: number | null
  histogram: number | null
}

/**
 * MACD (Moving Average Convergence Divergence).
 * macd = EMA(fast) - EMA(slow)
 * signal = EMA(macd, signalPeriod)
 * histogram = macd - signal
 */
export function macd(
  closes: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): MacdPoint[] {
  const result: MacdPoint[] = closes.map(() => ({ macd: null, signal: null, histogram: null }))

  const fastEma = ema(closes, fast)
  const slowEma = ema(closes, slow)

  // MACD 라인: slow EMA가 준비되는 시점부터 계산 가능
  const macdLine: (number | null)[] = closes.map((_, i) => {
    const f = fastEma[i]
    const s = slowEma[i]
    return f !== null && s !== null ? f - s : null
  })

  // MACD 라인에서 null이 아닌 값만 모아 EMA 계산
  // signal은 MACD 라인의 EMA(signalPeriod)
  const firstMacdIdx = macdLine.findIndex((v) => v !== null)
  if (firstMacdIdx === -1) return result

  const macdValues = macdLine.slice(firstMacdIdx) as (number | null)[]
  // null 없는 시점부터이므로 전부 number
  const macdNumbers = macdValues as number[]

  const signalEma = ema(macdNumbers, signalPeriod)

  for (let i = firstMacdIdx; i < closes.length; i++) {
    const macdVal = macdLine[i]
    const sigVal = signalEma[i - firstMacdIdx]
    result[i] = {
      macd: macdVal,
      signal: sigVal,
      histogram: macdVal !== null && sigVal !== null ? macdVal - sigVal : null,
    }
  }

  return result
}

/** 마지막 MACD 포인트. */
export function macdLast(
  closes: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): MacdPoint {
  const arr = macd(closes, fast, slow, signalPeriod)
  return arr[arr.length - 1] ?? { macd: null, signal: null, histogram: null }
}
