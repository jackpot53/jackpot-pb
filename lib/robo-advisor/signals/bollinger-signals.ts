import type { BollingerPoint } from '../indicators/bollinger'

export type BollingerSignal = {
  date: string
  type: 'buy' | 'sell'
  /** reentry: 밴드 복귀(평균회귀), squeeze: 스퀴즈 돌파(추세추종) */
  kind: 'reentry' | 'squeeze'
}

// bollinger-breakout.ts와 동일한 스퀴즈 기준
const SQUEEZE_TOLERANCE = 1.1

/**
 * 밴드 복귀(평균회귀) 시그널 감지.
 * 매수: 전일 종가 < 전일 하단 밴드 → 당일 종가 ≥ 당일 하단 밴드 (이탈 후 복귀)
 * 매도: 전일 종가 > 전일 상단 밴드 → 당일 종가 ≤ 당일 상단 밴드 (이탈 후 복귀)
 *
 * 미리 계산된 BollingerPoint[]를 받아 차트에서 bollinger() 재계산 없이 재사용.
 */
export function detectBollingerReentries(
  bands: BollingerPoint[],
  closes: number[],
  dates: string[],
): BollingerSignal[] {
  const signals: BollingerSignal[] = []
  for (let i = 1; i < bands.length; i++) {
    const prev = bands[i - 1]
    const curr = bands[i]
    const prevClose = closes[i - 1]
    const currClose = closes[i]
    if (
      prev.lower === null || prev.upper === null ||
      curr.lower === null || curr.upper === null
    ) continue

    // 하단 이탈 후 복귀 → 매수
    if (prevClose < prev.lower && currClose >= curr.lower) {
      signals.push({ date: dates[i], type: 'buy', kind: 'reentry' })
    }
    // 상단 이탈 후 복귀 → 매도
    else if (prevClose > prev.upper && currClose <= curr.upper) {
      signals.push({ date: dates[i], type: 'sell', kind: 'reentry' })
    }
  }
  return signals
}

/**
 * 스퀴즈 돌파(추세추종) 시그널 감지.
 * detectBollingerBreakout과 동일한 규칙을 per-bar로 적용.
 * - 최근 20봉 bandwidth 최솟값 × 1.1 이내 → 스퀴즈 상태
 * - 당일 종가 > 당일 상단 밴드 → 상방 돌파 → 매수
 */
export function detectBollingerSqueezeBreakouts(
  bands: BollingerPoint[],
  closes: number[],
  dates: string[],
): BollingerSignal[] {
  const signals: BollingerSignal[] = []
  for (let i = 1; i < bands.length; i++) {
    const curr = bands[i]
    if (curr.upper === null || curr.bandwidth === null) continue
    if (closes[i] <= curr.upper) continue  // 상단 돌파 아님

    // 이 봉 포함 최근 20봉의 bandwidth 최솟값
    const start = Math.max(0, i - 19)
    const recentBands = bands.slice(start, i + 1)
    const bandwidths = recentBands
      .map((b) => b.bandwidth)
      .filter((bw): bw is number => bw !== null)
    if (bandwidths.length < 10) continue

    const minBandwidth = Math.min(...bandwidths)
    if (curr.bandwidth <= minBandwidth * SQUEEZE_TOLERANCE) {
      signals.push({ date: dates[i], type: 'buy', kind: 'squeeze' })
    }
  }
  return signals
}

/**
 * 두 시그널을 합쳐 가장 최근 1건을 반환한다 (배지용).
 * daysAgo는 bands 마지막 인덱스 기준 영업일 수.
 */
export function lastBollingerSignal(
  bands: BollingerPoint[],
  closes: number[],
  dates: string[],
): (BollingerSignal & { daysAgo: number }) | null {
  const all = [
    ...detectBollingerReentries(bands, closes, dates),
    ...detectBollingerSqueezeBreakouts(bands, closes, dates),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  if (all.length === 0) return null
  const last = all[all.length - 1]
  const idx = dates.lastIndexOf(last.date)
  const daysAgo = bands.length - 1 - idx
  return { ...last, daysAgo }
}
