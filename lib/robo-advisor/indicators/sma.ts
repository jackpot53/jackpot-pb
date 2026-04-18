/**
 * N일 단순 이동평균 (Simple Moving Average).
 * 반환 배열 길이 = 입력 길이. 충분한 데이터가 없는 앞부분은 null.
 */
export function sma(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null)
  if (period <= 0 || closes.length < period) return result

  // 초기 구간 합산
  let sum = 0
  for (let i = 0; i < period; i++) sum += closes[i]
  result[period - 1] = sum / period

  // 슬라이딩 윈도우
  for (let i = period; i < closes.length; i++) {
    sum += closes[i] - closes[i - period]
    result[i] = sum / period
  }

  return result
}

/** 마지막 값만 반환 (최신 SMA). 데이터 부족 시 null. */
export function smaLast(closes: number[], period: number): number | null {
  if (closes.length < period || period <= 0) return null
  const slice = closes.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}
