import type { OhlcPoint } from '@/lib/price/sparkline'
import { rsi } from '../indicators/rsi'

export interface RsiSignalEvent {
  date: string
  type: 'buy' | 'sell'
  /** 시그널 발생 시점의 RSI 값 */
  value: number
}

const RSI_OVERSOLD  = 30
const RSI_OVERBOUGHT = 70

/**
 * 미리 계산된 RSI 배열 + dates로 매수·매도 이벤트를 도출한다.
 *
 * 매수: prev ≤ RSI_OVERSOLD(30), curr > RSI_OVERSOLD  → 과매도 탈출
 * 매도: prev ≥ RSI_OVERBOUGHT(70), curr < RSI_OVERBOUGHT → 과매수 탈출
 */
export function detectRsiSignalsFromRsi(
  rsiArr: (number | null)[],
  dates: string[],
): RsiSignalEvent[] {
  const events: RsiSignalEvent[] = []
  for (let i = 1; i < rsiArr.length; i++) {
    const prev = rsiArr[i - 1]
    const curr = rsiArr[i]
    if (prev === null || curr === null) continue

    if (prev <= RSI_OVERSOLD && curr > RSI_OVERSOLD) {
      events.push({ date: dates[i], type: 'buy', value: curr })
    } else if (prev >= RSI_OVERBOUGHT && curr < RSI_OVERBOUGHT) {
      events.push({ date: dates[i], type: 'sell', value: curr })
    }
  }
  return events
}

/**
 * 미리 계산된 RSI 배열에서 가장 최근 이벤트 한 건을 반환한다.
 * daysAgo는 rsiArr 마지막 인덱스 기준 영업일 수.
 */
export function lastRsiSignalFromRsi(
  rsiArr: (number | null)[],
  dates: string[],
): { type: 'buy' | 'sell'; date: string; daysAgo: number; value: number } | null {
  let last: { type: 'buy' | 'sell'; date: string; daysAgo: number; value: number } | null = null
  for (let i = 1; i < rsiArr.length; i++) {
    const prev = rsiArr[i - 1]
    const curr = rsiArr[i]
    if (prev === null || curr === null) continue
    if (prev <= RSI_OVERSOLD && curr > RSI_OVERSOLD) {
      last = { type: 'buy', date: dates[i], daysAgo: rsiArr.length - 1 - i, value: curr }
    } else if (prev >= RSI_OVERBOUGHT && curr < RSI_OVERBOUGHT) {
      last = { type: 'sell', date: dates[i], daysAgo: rsiArr.length - 1 - i, value: curr }
    }
  }
  return last
}

/** OhlcPoint[] 단독 진입점. 내부에서 rsi(closes, 14)를 호출한다. */
export function detectRsiSignals(ohlc: OhlcPoint[]): RsiSignalEvent[] {
  if (ohlc.length < 15) return []
  const closes = ohlc.map((p) => p.close)
  const rsiArr = rsi(closes, 14)
  return detectRsiSignalsFromRsi(rsiArr, ohlc.map((p) => p.date))
}

/** 가장 최근 RSI 시그널 한 건. */
export function lastRsiSignal(
  ohlc: OhlcPoint[],
): { type: 'buy' | 'sell'; date: string; daysAgo: number; value: number } | null {
  if (ohlc.length < 15) return null
  const closes = ohlc.map((p) => p.close)
  const rsiArr = rsi(closes, 14)
  return lastRsiSignalFromRsi(rsiArr, ohlc.map((p) => p.date))
}
