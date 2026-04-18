import type { OhlcPoint } from '@/lib/price/sparkline'
import { avgVolumeLast } from '../indicators/volume'

const VOLUME_MULTIPLIER = 2
const PRICE_RISE_THRESHOLD = 1.02  // 종가 > 전일 종가 × 1.02

/**
 * 거래량 급증 돌파 감지.
 * - 오늘 거래량 ≥ 20일 평균 거래량 × 2
 * - 오늘 종가 > 전일 종가 × 1.02 (2% 이상 상승)
 */
export function detectVolumeBreakout(ohlc: OhlcPoint[]): boolean {
  if (ohlc.length < 22) return false  // 20일 평균 + 전일 + 오늘

  // price_history에는 volume이 있으나 OhlcPoint 타입에는 없음
  // 런타임에 volume 프로퍼티 접근
  const volumes: (number | null)[] = ohlc.map(
    (p) => ((p as unknown as Record<string, unknown>)['volume'] as number | null | undefined) ?? null,
  )

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
