import { sma } from './sma'

/**
 * 지수 이동평균 (Exponential Moving Average).
 * multiplier = 2 / (period + 1), 초기값 = 첫 period개의 SMA.
 * 반환 배열 길이 = 입력 길이. 충분한 데이터가 없는 앞부분은 null.
 */
export function ema(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null)
  if (period <= 0 || closes.length < period) return result

  const k = 2 / (period + 1)

  // 첫 EMA = 첫 period 개의 SMA
  let prevEma = sma(closes.slice(0, period), period)[period - 1] as number
  result[period - 1] = prevEma

  for (let i = period; i < closes.length; i++) {
    prevEma = closes[i] * k + prevEma * (1 - k)
    result[i] = prevEma
  }

  return result
}

/** 마지막 값만 반환. 데이터 부족 시 null. */
export function emaLast(closes: number[], period: number): number | null {
  const arr = ema(closes, period)
  return arr[arr.length - 1] ?? null
}
