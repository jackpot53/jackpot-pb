import type { OhlcPoint } from '@/lib/price/sparkline'
import { volumeOscillator } from '../indicators/volume-oscillator'

export interface VolumeOscillatorEvent {
  date: string
  type: 'buy' | 'sell'
  /** 0선 돌파 시점의 VO 값 (양수). */
  value: number
}

/**
 * 미리 계산된 VO 배열 + closes + dates로 매수·매도 이벤트를 도출한다.
 * volumeOscillator()를 외부에서 한 번만 호출하고 결과를 재사용할 때 사용.
 *
 * 시그널 조건: VO가 0선을 상향 돌파(prev ≤ 0, curr > 0)한 날
 * - closes[i] > closes[i-1] → 'buy' (거래량 팽창 + 가격 상승)
 * - closes[i] ≤ closes[i-1] → 'sell' (거래량 팽창이지만 가격 하락 또는 보합)
 *
 * 하향 돌파(거래량 수축)는 방향성이 불명확하므로 시그널 없음.
 */
export function detectVolumeOscillatorCrossesFromVo(
  vo: (number | null)[],
  closes: number[],
  dates: string[],
): VolumeOscillatorEvent[] {
  const events: VolumeOscillatorEvent[] = []
  for (let i = 1; i < vo.length; i++) {
    const prev = vo[i - 1]
    const curr = vo[i]
    if (prev === null || curr === null) continue

    // 0선 상향 돌파
    if (prev <= 0 && curr > 0) {
      const type = closes[i] > closes[i - 1] ? 'buy' : 'sell'
      events.push({ date: dates[i], type, value: curr })
    }
  }
  return events
}

/**
 * 미리 계산된 VO 배열에서 가장 최근 이벤트 한 건을 반환한다.
 * daysAgo는 vo 마지막 인덱스 기준 영업일 수.
 */
export function lastVolumeOscillatorCrossFromVo(
  vo: (number | null)[],
  closes: number[],
  dates: string[],
): { type: 'buy' | 'sell'; date: string; daysAgo: number; value: number } | null {
  let last: { type: 'buy' | 'sell'; date: string; daysAgo: number; value: number } | null = null
  for (let i = 1; i < vo.length; i++) {
    const prev = vo[i - 1]
    const curr = vo[i]
    if (prev === null || curr === null) continue
    if (prev <= 0 && curr > 0) {
      const type = closes[i] > closes[i - 1] ? 'buy' : 'sell'
      last = { type, date: dates[i], daysAgo: vo.length - 1 - i, value: curr }
    }
  }
  return last
}

/** OhlcPoint[] 단독 진입점. 내부에서 volumeOscillator(5, 20)를 호출한다. */
export function detectVolumeOscillatorCrosses(ohlc: OhlcPoint[]): VolumeOscillatorEvent[] {
  if (ohlc.length < 20) return []
  const volumes = ohlc.map((p) => p.volume ?? null)
  const vo = volumeOscillator(volumes, 5, 20)
  const closes = ohlc.map((p) => p.close)
  const dates = ohlc.map((p) => p.date)
  return detectVolumeOscillatorCrossesFromVo(vo, closes, dates)
}

/** 가장 최근 Volume Oscillator 이벤트 한 건. daysAgo는 마지막 데이터 기준 영업일 수. */
export function lastVolumeOscillatorCross(
  ohlc: OhlcPoint[],
): { type: 'buy' | 'sell'; date: string; daysAgo: number; value: number } | null {
  if (ohlc.length < 20) return null
  const volumes = ohlc.map((p) => p.volume ?? null)
  const vo = volumeOscillator(volumes, 5, 20)
  const closes = ohlc.map((p) => p.close)
  const dates = ohlc.map((p) => p.date)
  return lastVolumeOscillatorCrossFromVo(vo, closes, dates)
}
