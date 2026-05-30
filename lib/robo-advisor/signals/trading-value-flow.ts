import type { OhlcPoint } from '@/lib/price/sparkline'
import { tradingValue, avgTradingValue, avgTradingValueLast } from '../indicators/trading-value'

const VALUE_MULTIPLIER = 2
const PRICE_RISE_THRESHOLD = 1.02
const PRICE_FALL_THRESHOLD = 0.98
const AVG_PERIOD = 20

export interface ValueFlowEvent {
  date: string
  type: 'buy' | 'sell'
  ratio: number   // 당일 거래대금 / 20일 평균
  value: number   // KRW
}

/**
 * 거래대금 급증 세력 진입 감지 (마지막 일자).
 * - 오늘 거래대금 ≥ 20일 평균 × 2
 * - 오늘 종가 > 전일 종가 × 1.02 (매수) 또는 < 0.98 (매도)
 */
export function detectTradingValueFlow(ohlc: OhlcPoint[]): boolean {
  if (ohlc.length < 22) return false

  const closes = ohlc.map((p) => p.close)
  const volumes = ohlc.map((p) => p.volume ?? null)
  const tvs = tradingValue(closes, volumes)

  const todayTv = tvs[tvs.length - 1]
  if (todayTv === null) return false

  const prevTvs = tvs.slice(0, -1)
  const avg = avgTradingValueLast(prevTvs, AVG_PERIOD)
  if (avg === null || avg === 0) return false

  const valueSurge = todayTv >= avg * VALUE_MULTIPLIER

  const n = ohlc.length
  const priceChange = ohlc[n - 1].close / ohlc[n - 2].close
  const priceSignal =
    priceChange >= PRICE_RISE_THRESHOLD || priceChange <= PRICE_FALL_THRESHOLD

  return valueSurge && priceSignal
}

/** 전체 데이터에서 거래대금 급증 매수/매도 시점을 모두 반환. */
export function detectTradingValueFlows(ohlc: OhlcPoint[]): ValueFlowEvent[] {
  if (ohlc.length < 22) return []

  const closes = ohlc.map((p) => p.close)
  const volumes = ohlc.map((p) => p.volume ?? null)
  const tvs = tradingValue(closes, volumes)
  const avgTVs = avgTradingValue(tvs, AVG_PERIOD)
  const events: ValueFlowEvent[] = []

  for (let i = 21; i < ohlc.length; i++) {
    const todayTv = tvs[i]
    const prevAvg = avgTVs[i - 1]  // 전일까지의 20일 평균 (당일 미포함)
    if (todayTv === null || prevAvg === null || prevAvg === 0) continue

    const ratio = todayTv / prevAvg
    if (ratio < VALUE_MULTIPLIER) continue

    const priceChange = ohlc[i].close / ohlc[i - 1].close
    if (priceChange >= PRICE_RISE_THRESHOLD) {
      events.push({ date: ohlc[i].date, type: 'buy', ratio, value: todayTv })
    } else if (priceChange <= PRICE_FALL_THRESHOLD) {
      events.push({ date: ohlc[i].date, type: 'sell', ratio, value: todayTv })
    }
  }

  return events
}

/**
 * 미리 계산된 이벤트 목록에서 마지막 시그널을 반환한다.
 * detectTradingValueFlows()를 외부에서 한 번만 호출하고 결과를 재사용할 때 사용.
 */
export function lastTradingValueFlowFromEvents(
  events: ValueFlowEvent[],
  ohlc: OhlcPoint[],
): { date: string; daysAgo: number; type: 'buy' | 'sell'; ratio: number; value: number } | null {
  if (events.length === 0) return null
  const last = events[events.length - 1]
  const idx = ohlc.findIndex((p) => p.date === last.date)
  return { ...last, daysAgo: ohlc.length - 1 - idx }
}

/** 가장 최근 거래대금 급증 시그널 한 건. */
export function lastTradingValueFlow(
  ohlc: OhlcPoint[],
): { date: string; daysAgo: number; type: 'buy' | 'sell'; ratio: number; value: number } | null {
  return lastTradingValueFlowFromEvents(detectTradingValueFlows(ohlc), ohlc)
}

/**
 * KRW 기반 누적 자금 흐름 (OBV 개념의 거래대금 버전).
 * 상승일 +거래대금, 하락일 −거래대금, 보합 0으로 누적한다.
 * result[0] = 0 (기준점), result[i] = 이전까지 누적 + 오늘 방향 가중 거래대금.
 */
export function cumulativeValueFlow(ohlc: OhlcPoint[]): (number | null)[] {
  if (ohlc.length === 0) return []

  const closes = ohlc.map((p) => p.close)
  const volumes = ohlc.map((p) => p.volume ?? null)
  const tvs = tradingValue(closes, volumes)

  const result: (number | null)[] = new Array(ohlc.length).fill(null)
  let cumulative = 0

  for (let i = 0; i < ohlc.length; i++) {
    const tv = tvs[i]
    if (tv === null) continue

    if (i === 0) {
      result[0] = 0
      continue
    }

    const direction = ohlc[i].close >= ohlc[i - 1].close ? 1 : -1
    cumulative += direction * tv
    result[i] = cumulative
  }

  return result
}

/**
 * 60일 롤링 자금 흐름: 최근 window일간 방향 가중 거래대금의 합.
 * 전체 누적선보다 최근 추세 전환에 민감하게 반응한다.
 */
export function cumulativeValueFlowRolling(
  ohlc: OhlcPoint[],
  window = 60,
): (number | null)[] {
  if (ohlc.length === 0) return []

  const closes = ohlc.map((p) => p.close)
  const volumes = ohlc.map((p) => p.volume ?? null)
  const tvs = tradingValue(closes, volumes)

  // 일별 방향 가중 거래대금 (i=0은 이전 종가 없어서 null)
  const dailyFlows: (number | null)[] = new Array(ohlc.length).fill(null)
  for (let i = 1; i < ohlc.length; i++) {
    const tv = tvs[i]
    if (tv === null) continue
    const direction = ohlc[i].close >= ohlc[i - 1].close ? 1 : -1
    dailyFlows[i] = direction * tv
  }

  const result: (number | null)[] = new Array(ohlc.length).fill(null)
  for (let i = 1; i < ohlc.length; i++) {
    const start = Math.max(1, i - window + 1)
    let sum = 0
    let hasValue = false
    for (let j = start; j <= i; j++) {
      const f = dailyFlows[j]
      if (f !== null) {
        sum += f
        hasValue = true
      }
    }
    if (hasValue) result[i] = sum
  }

  return result
}
