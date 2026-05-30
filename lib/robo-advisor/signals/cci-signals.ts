import type { OhlcPoint } from '@/lib/price/sparkline'
import { cci } from '../indicators/cci'

export interface CciSignalEvent {
  date: string
  type: 'buy' | 'sell'
  /** 시그널 발생 시점의 CCI 값 */
  value: number
}

const CCI_OVERSOLD   = -100
const CCI_OVERBOUGHT =  100

/**
 * 미리 계산된 CCI 배열 + dates로 매수·매도 이벤트를 도출한다.
 *
 * 매수: prev ≤ -100, curr > -100 → 과매도 탈출
 * 매도: prev ≥ +100, curr < +100 → 과매수 탈출
 */
export function detectCciSignalsFromCci(
  cciArr: (number | null)[],
  dates: string[],
): CciSignalEvent[] {
  const events: CciSignalEvent[] = []
  for (let i = 1; i < cciArr.length; i++) {
    const prev = cciArr[i - 1]
    const curr = cciArr[i]
    if (prev === null || curr === null) continue

    if (prev <= CCI_OVERSOLD && curr > CCI_OVERSOLD) {
      events.push({ date: dates[i], type: 'buy', value: curr })
    } else if (prev >= CCI_OVERBOUGHT && curr < CCI_OVERBOUGHT) {
      events.push({ date: dates[i], type: 'sell', value: curr })
    }
  }
  return events
}

/**
 * 미리 계산된 CCI 배열에서 가장 최근 이벤트 한 건을 반환한다.
 * daysAgo는 cciArr 마지막 인덱스 기준 영업일 수.
 */
export function lastCciSignalFromCci(
  cciArr: (number | null)[],
  dates: string[],
): { type: 'buy' | 'sell'; date: string; daysAgo: number; value: number } | null {
  let last: { type: 'buy' | 'sell'; date: string; daysAgo: number; value: number } | null = null
  for (let i = 1; i < cciArr.length; i++) {
    const prev = cciArr[i - 1]
    const curr = cciArr[i]
    if (prev === null || curr === null) continue
    if (prev <= CCI_OVERSOLD && curr > CCI_OVERSOLD) {
      last = { type: 'buy', date: dates[i], daysAgo: cciArr.length - 1 - i, value: curr }
    } else if (prev >= CCI_OVERBOUGHT && curr < CCI_OVERBOUGHT) {
      last = { type: 'sell', date: dates[i], daysAgo: cciArr.length - 1 - i, value: curr }
    }
  }
  return last
}

/** OhlcPoint[] 단독 진입점. 내부에서 cci(highs, lows, closes, 20)를 호출한다. */
export function detectCciSignals(ohlc: OhlcPoint[]): CciSignalEvent[] {
  if (ohlc.length < 20) return []
  const highs  = ohlc.map((p) => p.high)
  const lows   = ohlc.map((p) => p.low)
  const closes = ohlc.map((p) => p.close)
  const cciArr = cci(highs, lows, closes, 20)
  return detectCciSignalsFromCci(cciArr, ohlc.map((p) => p.date))
}

/** 가장 최근 CCI 시그널 한 건. */
export function lastCciSignal(
  ohlc: OhlcPoint[],
): { type: 'buy' | 'sell'; date: string; daysAgo: number; value: number } | null {
  if (ohlc.length < 20) return null
  const highs  = ohlc.map((p) => p.high)
  const lows   = ohlc.map((p) => p.low)
  const closes = ohlc.map((p) => p.close)
  const cciArr = cci(highs, lows, closes, 20)
  return lastCciSignalFromCci(cciArr, ohlc.map((p) => p.date))
}
