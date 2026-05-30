import type { OhlcPoint } from '@/lib/price/sparkline'
import { avgVolume, avgVolumeLast } from '../indicators/volume'

const VOLUME_MULTIPLIER = 2
const PRICE_RISE_THRESHOLD = 1.02   // 종가 > 전일 종가 × 1.02
const PRICE_FALL_THRESHOLD = 0.98   // 종가 < 전일 종가 × 0.98

/**
 * 거래량 급증 돌파 감지.
 * - 오늘 거래량 ≥ 20일 평균 거래량 × 2
 * - 오늘 종가 > 전일 종가 × 1.02 (2% 이상 상승)
 */
export function detectVolumeBreakout(ohlc: OhlcPoint[]): boolean {
  if (ohlc.length < 22) return false  // 20일 평균 + 전일 + 오늘

  const volumes: (number | null)[] = ohlc.map((p) => p.volume ?? null)

  const todayVolume = volumes[volumes.length - 1]
  if (todayVolume === null) return false

  // 오늘을 제외한 이전 20일 평균
  const prevVolumes = volumes.slice(0, -1)
  const avg = avgVolumeLast(prevVolumes, 20)
  if (avg === null || avg === 0) return false

  const volumeSurge = todayVolume >= avg * VOLUME_MULTIPLIER

  const n = ohlc.length
  const todayClose = ohlc[n - 1].close
  const prevClose = ohlc[n - 2].close
  const priceRise = todayClose > prevClose * PRICE_RISE_THRESHOLD

  return volumeSurge && priceRise
}

export interface VolumeBreakoutEvent {
  date: string
  type: 'buy' | 'sell'
  ratio: number  // 당일 거래량 / 20일 평균
}

/** 전체 데이터에서 거래량 급증 매수/매도 시점을 모두 반환. */
export function detectVolumeBreakouts(ohlc: OhlcPoint[]): VolumeBreakoutEvent[] {
  if (ohlc.length < 22) return []

  const volumes = ohlc.map((p) => p.volume ?? null)
  const avgVols = avgVolume(volumes, 20)
  const events: VolumeBreakoutEvent[] = []

  for (let i = 21; i < ohlc.length; i++) {
    const todayVol = volumes[i]
    const prevAvg = avgVols[i - 1]  // 전일까지의 20일 평균 (당일 미포함)
    if (todayVol === null || prevAvg === null || prevAvg === 0) continue

    const ratio = todayVol / prevAvg
    if (ratio < VOLUME_MULTIPLIER) continue

    const priceChange = ohlc[i].close / ohlc[i - 1].close
    if (priceChange >= PRICE_RISE_THRESHOLD) {
      events.push({ date: ohlc[i].date, type: 'buy', ratio })
    } else if (priceChange <= PRICE_FALL_THRESHOLD) {
      events.push({ date: ohlc[i].date, type: 'sell', ratio })
    }
  }

  return events
}

/**
 * 미리 계산된 이벤트 목록에서 마지막 거래량 급증 시그널을 반환한다.
 * detectVolumeBreakouts()를 외부에서 한 번만 호출하고 결과를 재사용할 때 사용.
 */
export function lastBreakoutFromEvents(
  events: VolumeBreakoutEvent[],
  ohlc: OhlcPoint[],
): { date: string; daysAgo: number; type: 'buy' | 'sell'; ratio: number } | null {
  if (events.length === 0) return null
  const last = events[events.length - 1]
  const idx = ohlc.findIndex((p) => p.date === last.date)
  return { ...last, daysAgo: ohlc.length - 1 - idx }
}

/** 가장 최근 거래량 급증 시그널 한 건. daysAgo는 마지막 데이터 기준 영업일 수. */
export function lastVolumeBreakout(
  ohlc: OhlcPoint[],
): { date: string; daysAgo: number; type: 'buy' | 'sell'; ratio: number } | null {
  return lastBreakoutFromEvents(detectVolumeBreakouts(ohlc), ohlc)
}
