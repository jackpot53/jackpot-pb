import type { OhlcPoint } from '@/lib/price/sparkline'
import { macd } from '../indicators/macd'
import type { MacdPoint } from '../indicators/macd'

/**
 * MACD 골든 크로스 감지.
 * - 어제: MACD ≤ Signal
 * - 오늘: MACD > Signal (상향 돌파)
 * - 오늘 히스토그램 ≥ 0 (0 이상으로 전환)
 *
 * 최소 데이터 요구: 40개 (EMA26 + signal9 = 35 + 여유).
 */
export function detectMacdCross(ohlc: OhlcPoint[]): boolean {
  if (ohlc.length < 40) return false

  const closes = ohlc.map((p) => p.close)
  const macdArr = macd(closes)

  const n = macdArr.length
  const today = macdArr[n - 1]
  const yesterday = macdArr[n - 2]

  if (
    today.macd === null ||
    today.signal === null ||
    today.histogram === null ||
    yesterday.macd === null ||
    yesterday.signal === null
  ) return false

  const crossedUp = yesterday.macd <= yesterday.signal && today.macd > today.signal
  const histogramPositive = today.histogram >= 0

  return crossedUp && histogramPositive
}

export type MacdCrossEvent = { date: string; type: 'golden' | 'dead' }

/**
 * 미리 계산된 MacdPoint[]와 날짜 배열로 골든/데드 크로스 이벤트를 반환한다.
 * macd()를 외부에서 한 번만 호출하고 결과를 재사용할 때 사용.
 */
export function detectMacdCrossesFromMacd(
  macdArr: MacdPoint[],
  dates: string[],
): MacdCrossEvent[] {
  const crosses: MacdCrossEvent[] = []
  for (let i = 1; i < macdArr.length; i++) {
    const prev = macdArr[i - 1]
    const curr = macdArr[i]
    if (prev.macd === null || prev.signal === null || curr.macd === null || curr.signal === null) continue
    if (prev.macd <= prev.signal && curr.macd > curr.signal) {
      crosses.push({ date: dates[i], type: 'golden' })
    } else if (prev.macd >= prev.signal && curr.macd < curr.signal) {
      crosses.push({ date: dates[i], type: 'dead' })
    }
  }
  return crosses
}

/**
 * 미리 계산된 MacdPoint[]에서 가장 최근 크로스 한 건을 반환한다.
 * daysAgo는 macdArr 마지막 인덱스 기준 영업일 수.
 */
export function lastMacdCrossFromMacd(
  macdArr: MacdPoint[],
  dates: string[],
): { type: 'golden' | 'dead'; date: string; daysAgo: number } | null {
  let last: { type: 'golden' | 'dead'; date: string; daysAgo: number } | null = null
  for (let i = 1; i < macdArr.length; i++) {
    const prev = macdArr[i - 1]
    const curr = macdArr[i]
    if (prev.macd === null || prev.signal === null || curr.macd === null || curr.signal === null) continue
    if (prev.macd <= prev.signal && curr.macd > curr.signal) {
      last = { type: 'golden', date: dates[i], daysAgo: macdArr.length - 1 - i }
    } else if (prev.macd >= prev.signal && curr.macd < curr.signal) {
      last = { type: 'dead', date: dates[i], daysAgo: macdArr.length - 1 - i }
    }
  }
  return last
}

/** 전체 데이터에서 골든/데드 크로스 발생 시점을 모두 반환. */
export function detectMacdCrosses(ohlc: OhlcPoint[]): MacdCrossEvent[] {
  if (ohlc.length < 40) return []
  const macdArr = macd(ohlc.map((p) => p.close))
  return detectMacdCrossesFromMacd(macdArr, ohlc.map((p) => p.date))
}

/** 가장 최근 MACD 크로스 한 건. daysAgo는 마지막 데이터 기준 영업일 수. */
export function lastMacdCross(
  ohlc: OhlcPoint[],
): { type: 'golden' | 'dead'; date: string; daysAgo: number } | null {
  if (ohlc.length < 40) return null
  const macdArr = macd(ohlc.map((p) => p.close))
  return lastMacdCrossFromMacd(macdArr, ohlc.map((p) => p.date))
}
