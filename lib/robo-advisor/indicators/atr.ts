/**
 * Average True Range (Wilder smoothing).
 * True Range = max(High - Low, |High - PrevClose|, |Low - PrevClose|)
 * ATR = Wilder smoothed average of TR over period.
 */
export function atr(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): (number | null)[] {
  const len = Math.min(highs.length, lows.length, closes.length)
  const result: (number | null)[] = new Array(len).fill(null)

  if (len < period + 1) return result

  // True Range 계산 (인덱스 1부터 시작, 전일 종가 필요)
  const tr: number[] = new Array(len).fill(0)
  for (let i = 1; i < len; i++) {
    const hl = highs[i] - lows[i]
    const hc = Math.abs(highs[i] - closes[i - 1])
    const lc = Math.abs(lows[i] - closes[i - 1])
    tr[i] = Math.max(hl, hc, lc)
  }

  // 초기 ATR = 첫 period개 TR의 단순 평균 (인덱스 1~period)
  let avgTr = 0
  for (let i = 1; i <= period; i++) avgTr += tr[i]
  avgTr /= period
  result[period] = avgTr

  // Wilder 스무딩
  for (let i = period + 1; i < len; i++) {
    avgTr = (avgTr * (period - 1) + tr[i]) / period
    result[i] = avgTr
  }

  return result
}

/** 마지막 ATR 값. 데이터 부족 시 null. */
export function atrLast(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): number | null {
  const arr = atr(highs, lows, closes, period)
  return arr[arr.length - 1] ?? null
}
