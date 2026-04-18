import type { OhlcPoint } from '@/lib/price/sparkline'

export { sma, smaLast } from './sma'
export { ema, emaLast } from './ema'
export { rsi, rsiLast } from './rsi'
export { macd, macdLast } from './macd'
export type { MacdPoint } from './macd'
export { bollinger, bollingerLast } from './bollinger'
export type { BollingerPoint } from './bollinger'
export { stochastic, stochasticLast } from './stochastic'
export type { StochasticPoint } from './stochastic'
export { adx, adxLast } from './adx'
export type { AdxPoint } from './adx'
export { atr, atrLast } from './atr'
export { avgVolume, avgVolumeLast, volumeRatio } from './volume'

import { smaLast } from './sma'
import { rsiLast } from './rsi'
import { macdLast } from './macd'
import type { MacdPoint } from './macd'
import { bollingerLast } from './bollinger'
import type { BollingerPoint } from './bollinger'
import { stochasticLast } from './stochastic'
import type { StochasticPoint } from './stochastic'
import { adxLast } from './adx'
import type { AdxPoint } from './adx'
import { atrLast } from './atr'
import { volumeRatio } from './volume'

export interface AllIndicators {
  sma5: number | null
  sma20: number | null
  sma60: number | null
  sma120: number | null
  rsi14: number | null
  macd: MacdPoint
  bollinger: BollingerPoint
  stochastic: StochasticPoint
  adx: AdxPoint
  atr14: number | null
  volumeRatio20: number | null
}

/**
 * OhlcPoint 배열에서 모든 기술적 지표의 최신값을 한 번에 계산한다.
 * volume이 없는 경우 volumeRatio20은 null.
 */
export function computeAllIndicators(ohlc: OhlcPoint[]): AllIndicators {
  const closes = ohlc.map((p) => p.close)
  const highs = ohlc.map((p) => p.high)
  const lows = ohlc.map((p) => p.low)

  // price_history 스키마에는 volume 컬럼이 있으나 OhlcPoint에는 없음
  // volume이 있는 경우를 위해 타입 확장 허용
  const volumes: (number | null)[] = ohlc.map(
    (p) => ((p as unknown as Record<string, unknown>)['volume'] as number | null | undefined) ?? null,
  )

  return {
    sma5: smaLast(closes, 5),
    sma20: smaLast(closes, 20),
    sma60: smaLast(closes, 60),
    sma120: smaLast(closes, 120),
    rsi14: rsiLast(closes, 14),
    macd: macdLast(closes),
    bollinger: bollingerLast(closes),
    stochastic: stochasticLast(highs, lows, closes),
    adx: adxLast(highs, lows, closes),
    atr14: atrLast(highs, lows, closes),
    volumeRatio20: volumeRatio(volumes, 20),
  }
}
