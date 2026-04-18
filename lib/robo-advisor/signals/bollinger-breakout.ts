import type { OhlcPoint } from '@/lib/price/sparkline'
import { bollinger } from '../indicators/bollinger'

const SQUEEZE_TOLERANCE = 1.1  // 최소 bandwidth × 1.1 이내면 스퀴즈

/**
 * 볼린저 밴드 스퀴즈 후 상단 돌파 감지.
 * - 최근 20일 bandwidth 중 최솟값 근처 (최소 × 1.1 이내) → 스퀴즈 상태
 * - 오늘 종가가 볼린저 상단 밴드를 돌파
 *
 * 최소 데이터 요구: 40개 (스퀴즈 판단용 20일 + 볼린저 계산용 20일).
 */
export function detectBollingerBreakout(ohlc: OhlcPoint[]): boolean {
  if (ohlc.length < 40) return false

  const closes = ohlc.map((p) => p.close)
  const bollingerArr = bollinger(closes)

  const n = bollingerArr.length
  const today = bollingerArr[n - 1]

  if (today.upper === null || today.bandwidth === null) return false

  // 오늘 종가가 상단 밴드 돌파 확인
  if (closes[n - 1] <= today.upper) return false

  // 최근 20일(오늘 포함) bandwidth 최솟값 계산
  const recentBands = bollingerArr.slice(n - 20, n)
  const bandwidths = recentBands
    .map((b) => b.bandwidth)
    .filter((bw): bw is number => bw !== null)

  if (bandwidths.length < 10) return false  // 유효 데이터 부족

  const minBandwidth = Math.min(...bandwidths)

  // 오늘 bandwidth가 최솟값 × 1.1 이내 → 스퀴즈 상태에서 돌파
  return today.bandwidth <= minBandwidth * SQUEEZE_TOLERANCE
}
