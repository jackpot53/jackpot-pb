import type { OhlcPoint } from '@/lib/price/sparkline'
import { rsi } from '../indicators/rsi'

const RSI_OVERSOLD_THRESHOLD = 30

/**
 * RSI 과매도 반등 감지.
 * - 최근 5일 내 RSI가 30 이하로 내려간 적 있음
 * - 오늘 RSI가 30을 상향 재돌파 (어제 ≤ 30, 오늘 > 30)
 *
 * 최소 데이터 요구: 20개.
 */
export function detectRsiOversoldBounce(ohlc: OhlcPoint[]): boolean {
  if (ohlc.length < 20) return false

  const closes = ohlc.map((p) => p.close)
  const rsiValues = rsi(closes, 14)

  const n = rsiValues.length
  const todayRsi = rsiValues[n - 1]
  const yesterdayRsi = rsiValues[n - 2]

  if (todayRsi === null || yesterdayRsi === null) return false

  // 오늘 30 상향 돌파 확인
  if (!(yesterdayRsi <= RSI_OVERSOLD_THRESHOLD && todayRsi > RSI_OVERSOLD_THRESHOLD)) return false

  // 최근 5일(어제 포함) 내에 30 이하 구간이 있었는지 확인
  const lookback = 5
  const windowStart = Math.max(0, n - 1 - lookback)
  const recentWindow = rsiValues.slice(windowStart, n - 1)

  return recentWindow.some((v) => v !== null && v <= RSI_OVERSOLD_THRESHOLD)
}
