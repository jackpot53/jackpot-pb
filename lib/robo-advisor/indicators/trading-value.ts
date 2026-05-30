import type { OhlcPoint } from '@/lib/price/sparkline'

/**
 * 거래대금(close × volume, KRW) 관련 지표.
 * volume이 shares 단위이므로 close를 곱하면 실제 유동 자금을 반영한다.
 */

/**
 * OhlcPoint 배열에서 거래대금 배열을 반환한다.
 * KIS 데이터는 tradingValue(acml_tr_pbmn)를 직접 사용하고,
 * 없는 경우 close × volume으로 계산한다.
 */
export function tradingValueFromData(data: OhlcPoint[]): (number | null)[] {
  return data.map((p) => {
    if (p.tradingValue !== undefined) return p.tradingValue
    const v = p.volume ?? null
    return v !== null ? p.close * v : null
  })
}

/** 인덱스 단위 거래대금. close 또는 volume이 null이면 null. */
export function tradingValue(
  closes: (number | null)[],
  volumes: (number | null)[],
): (number | null)[] {
  const len = Math.min(closes.length, volumes.length)
  const result: (number | null)[] = new Array(len).fill(null)
  for (let i = 0; i < len; i++) {
    const c = closes[i]
    const v = volumes[i]
    result[i] = c !== null && v !== null ? c * v : null
  }
  return result
}

/** N일 평균 거래대금. null이 포함된 구간은 건너뜀. */
export function avgTradingValue(
  values: (number | null)[],
  period = 20,
): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null)
  if (values.length < period) return result

  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1)
    const valid = slice.filter((v): v is number => v !== null)
    if (valid.length < Math.ceil(period / 2)) continue
    result[i] = valid.reduce((a, b) => a + b, 0) / valid.length
  }

  return result
}

/** 마지막 N일 평균 거래대금. */
export function avgTradingValueLast(
  values: (number | null)[],
  period = 20,
): number | null {
  const arr = avgTradingValue(values, period)
  return arr[arr.length - 1] ?? null
}

/**
 * 거래대금 급증 배수: 오늘 거래대금 / N일 평균.
 * 오늘 거래대금이 null이거나 평균이 0이면 null.
 * 평균은 오늘을 제외한 이전 period 일로 계산.
 */
export function tradingValueRatio(
  values: (number | null)[],
  period = 20,
): number | null {
  if (values.length === 0) return null
  const today = values[values.length - 1]
  if (today === null || today === 0) return null

  const prevValues = values.slice(0, -1)
  const prevAvg = avgTradingValueLast(prevValues, period)
  if (prevAvg === null || prevAvg === 0) return null

  return today / prevAvg
}
