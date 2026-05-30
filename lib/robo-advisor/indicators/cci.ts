import { sma } from './sma'

/**
 * CCI (Commodity Channel Index).
 * TP(Typical Price) = (high + low + close) / 3
 * SMA_TP = SMA(TP, period)
 * meanDeviation = 기간 내 |TP − SMA_TP| 의 평균
 * CCI = (TP − SMA_TP) / (0.015 × meanDeviation)
 *
 * 반환 배열 길이 = 입력 길이. 앞 period-1개는 null.
 * meanDeviation = 0이면 해당 인덱스 null(0 나눗셈 방지).
 */
export function cci(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 20,
): (number | null)[] {
  const len = Math.min(highs.length, lows.length, closes.length)
  const result: (number | null)[] = new Array(len).fill(null)
  if (len < period) return result

  // TP 배열
  const tp: number[] = new Array(len)
  for (let i = 0; i < len; i++) {
    tp[i] = (highs[i] + lows[i] + closes[i]) / 3
  }

  // SMA(TP, period)
  const smaTp = sma(tp, period)

  for (let i = period - 1; i < len; i++) {
    const tpAvg = smaTp[i]
    if (tpAvg === null) continue

    // meanDeviation = 기간 내 |TP − SMA_TP| 의 평균
    let sumDev = 0
    for (let j = i - period + 1; j <= i; j++) {
      sumDev += Math.abs(tp[j] - tpAvg)
    }
    const meanDev = sumDev / period

    if (meanDev === 0) continue   // 가격 변동 없음 → 0 나눗셈 방지

    result[i] = (tp[i] - tpAvg) / (0.015 * meanDev)
  }

  return result
}

/** 마지막 CCI 값. 데이터 부족 시 null. */
export function cciLast(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 20,
): number | null {
  const arr = cci(highs, lows, closes, period)
  return arr[arr.length - 1] ?? null
}
