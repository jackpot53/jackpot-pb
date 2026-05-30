import type { OhlcPoint } from '@/lib/price/sparkline'
import { stochastic, type StochasticPoint } from '../indicators/stochastic'

export interface StochasticSignalEvent {
  date: string
  type: 'buy' | 'sell'
  /** 시그널 발생 시점의 %K 값 */
  k: number
  /** 시그널 발생 시점의 %D 값 */
  d: number
}

const OVERSOLD   = 20
const OVERBOUGHT = 80

/**
 * 미리 계산된 StochasticPoint[] + dates로 매수·매도 이벤트를 도출한다.
 *
 * 매수: 전날 & 오늘 %K·%D 모두 ≤ 20(과매도), prev.k ≤ prev.d, curr.k > curr.d (%K 상향 교차)
 * 매도: 전날 & 오늘 %K·%D 모두 ≥ 80(과매수), prev.k ≥ prev.d, curr.k < curr.d (%K 하향 교차)
 */
export function detectStochasticSignalsFromStoch(
  stochArr: StochasticPoint[],
  dates: string[],
): StochasticSignalEvent[] {
  const events: StochasticSignalEvent[] = []
  for (let i = 1; i < stochArr.length; i++) {
    const prev = stochArr[i - 1]
    const curr = stochArr[i]
    if (
      prev.k === null || prev.d === null ||
      curr.k === null || curr.d === null
    ) continue

    const crossedUp   = prev.k <= prev.d && curr.k > curr.d
    const crossedDown = prev.k >= prev.d && curr.k < curr.d

    if (crossedUp && curr.k <= OVERSOLD && curr.d <= OVERSOLD) {
      events.push({ date: dates[i], type: 'buy', k: curr.k, d: curr.d })
    } else if (crossedDown && curr.k >= OVERBOUGHT && curr.d >= OVERBOUGHT) {
      events.push({ date: dates[i], type: 'sell', k: curr.k, d: curr.d })
    }
  }
  return events
}

/**
 * 미리 계산된 StochasticPoint[]에서 가장 최근 이벤트 한 건을 반환한다.
 * daysAgo는 stochArr 마지막 인덱스 기준 영업일 수.
 */
export function lastStochasticSignalFromStoch(
  stochArr: StochasticPoint[],
  dates: string[],
): { type: 'buy' | 'sell'; date: string; daysAgo: number; k: number; d: number } | null {
  let last: { type: 'buy' | 'sell'; date: string; daysAgo: number; k: number; d: number } | null = null
  for (let i = 1; i < stochArr.length; i++) {
    const prev = stochArr[i - 1]
    const curr = stochArr[i]
    if (
      prev.k === null || prev.d === null ||
      curr.k === null || curr.d === null
    ) continue

    const crossedUp   = prev.k <= prev.d && curr.k > curr.d
    const crossedDown = prev.k >= prev.d && curr.k < curr.d

    if (crossedUp && curr.k <= OVERSOLD && curr.d <= OVERSOLD) {
      last = { type: 'buy', date: dates[i], daysAgo: stochArr.length - 1 - i, k: curr.k, d: curr.d }
    } else if (crossedDown && curr.k >= OVERBOUGHT && curr.d >= OVERBOUGHT) {
      last = { type: 'sell', date: dates[i], daysAgo: stochArr.length - 1 - i, k: curr.k, d: curr.d }
    }
  }
  return last
}

/** OhlcPoint[] 단독 진입점. 내부에서 stochastic(14, 3)을 호출한다. */
export function detectStochasticSignals(ohlc: OhlcPoint[]): StochasticSignalEvent[] {
  if (ohlc.length < 17) return []   // kPeriod(14) + dPeriod(3)
  const highs  = ohlc.map((p) => p.high)
  const lows   = ohlc.map((p) => p.low)
  const closes = ohlc.map((p) => p.close)
  const stochArr = stochastic(highs, lows, closes)
  return detectStochasticSignalsFromStoch(stochArr, ohlc.map((p) => p.date))
}

/** 가장 최근 Stochastic 시그널 한 건. */
export function lastStochasticSignal(
  ohlc: OhlcPoint[],
): { type: 'buy' | 'sell'; date: string; daysAgo: number; k: number; d: number } | null {
  if (ohlc.length < 17) return null
  const highs  = ohlc.map((p) => p.high)
  const lows   = ohlc.map((p) => p.low)
  const closes = ohlc.map((p) => p.close)
  const stochArr = stochastic(highs, lows, closes)
  return lastStochasticSignalFromStoch(stochArr, ohlc.map((p) => p.date))
}
