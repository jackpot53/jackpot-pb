/**
 * Wilder's Smoothed RSI.
 * 초기 RS = 첫 period 일의 평균 이익 / 평균 손실.
 * 이후는 Wilder 스무딩: avgGain = (prevAvgGain × (period-1) + gain) / period
 */
export function rsi(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null)
  if (closes.length < period + 1) return result

  // 일별 변화량 계산
  const changes: number[] = []
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1])
  }

  // 초기 평균 이익/손실 (첫 period개 변화량)
  let avgGain = 0
  let avgLoss = 0
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i]
    else avgLoss += Math.abs(changes[i])
  }
  avgGain /= period
  avgLoss /= period

  const calcRsi = (gain: number, loss: number): number => {
    if (loss === 0) return 100
    const rs = gain / loss
    return 100 - 100 / (1 + rs)
  }

  result[period] = calcRsi(avgGain, avgLoss)

  // Wilder 스무딩
  for (let i = period + 1; i < closes.length; i++) {
    const change = changes[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    result[i] = calcRsi(avgGain, avgLoss)
  }

  return result
}

/** 마지막 RSI 값. 데이터 부족 시 null. */
export function rsiLast(closes: number[], period = 14): number | null {
  const arr = rsi(closes, period)
  return arr[arr.length - 1] ?? null
}
