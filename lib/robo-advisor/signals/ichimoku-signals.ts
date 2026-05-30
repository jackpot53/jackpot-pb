import type { IchimokuPoint } from '../indicators/ichimoku'

export type IchimokuSignal = {
  date: string
  type: 'buy' | 'sell'
  /** tk-cross: 전환선/기준선 크로스, cloud-breakout: 구름대 돌파 */
  kind: 'tk-cross' | 'cloud-breakout'
}

/**
 * TK 크로스 감지.
 * 골든(매수): 전일 tenkan ≤ kijun → 당일 tenkan > kijun (전환선 상향 돌파)
 * 데드(매도): 전일 tenkan ≥ kijun → 당일 tenkan < kijun (전환선 하향 돌파)
 */
export function detectIchimokuTkCrosses(
  pts: IchimokuPoint[],
  dates: string[],
): IchimokuSignal[] {
  const signals: IchimokuSignal[] = []
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    if (
      prev.tenkan === null || prev.kijun === null ||
      curr.tenkan === null || curr.kijun === null
    ) continue

    if (prev.tenkan <= prev.kijun && curr.tenkan > curr.kijun) {
      signals.push({ date: dates[i], type: 'buy', kind: 'tk-cross' })
    } else if (prev.tenkan >= prev.kijun && curr.tenkan < curr.kijun) {
      signals.push({ date: dates[i], type: 'sell', kind: 'tk-cross' })
    }
  }
  return signals
}

/**
 * 구름대 돌파 감지.
 * 구름 상단 = max(senkouA, senkouB), 하단 = min(senkouA, senkouB).
 * 매수: 전일 종가 ≤ 구름 상단 → 당일 종가 > 구름 상단 (구름 상향 돌파)
 * 매도: 전일 종가 ≥ 구름 하단 → 당일 종가 < 구름 하단 (구름 하향 이탈)
 */
export function detectIchimokuCloudBreakouts(
  pts: IchimokuPoint[],
  closes: number[],
  dates: string[],
): IchimokuSignal[] {
  const signals: IchimokuSignal[] = []
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    if (
      prev.senkouA === null || prev.senkouB === null ||
      curr.senkouA === null || curr.senkouB === null
    ) continue

    const prevTop = Math.max(prev.senkouA, prev.senkouB)
    const prevBot = Math.min(prev.senkouA, prev.senkouB)
    const currTop = Math.max(curr.senkouA, curr.senkouB)
    const currBot = Math.min(curr.senkouA, curr.senkouB)

    const prevClose = closes[i - 1]
    const currClose = closes[i]

    // 구름 상향 돌파 → 매수
    if (prevClose <= prevTop && currClose > currTop) {
      signals.push({ date: dates[i], type: 'buy', kind: 'cloud-breakout' })
    }
    // 구름 하향 이탈 → 매도
    else if (prevClose >= prevBot && currClose < currBot) {
      signals.push({ date: dates[i], type: 'sell', kind: 'cloud-breakout' })
    }
  }
  return signals
}

/** TK 크로스 + 구름대 돌파 통합 감지 (마커 표시용). */
export function detectIchimokuSignals(
  pts: IchimokuPoint[],
  closes: number[],
  dates: string[],
): IchimokuSignal[] {
  return [
    ...detectIchimokuTkCrosses(pts, dates),
    ...detectIchimokuCloudBreakouts(pts, closes, dates),
  ]
}

/**
 * 가장 최근 일목 시그널 1건 (배지 표시용).
 * daysAgo는 pts 마지막 인덱스 기준 영업일 수.
 */
export function lastIchimokuSignal(
  pts: IchimokuPoint[],
  closes: number[],
  dates: string[],
): (IchimokuSignal & { daysAgo: number }) | null {
  const all = detectIchimokuSignals(pts, closes, dates)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  if (all.length === 0) return null
  const last = all[all.length - 1]
  const idx = dates.lastIndexOf(last.date)
  const daysAgo = pts.length - 1 - idx
  return { ...last, daysAgo }
}
