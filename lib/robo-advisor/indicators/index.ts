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
export { volumeOscillator, volumeOscillatorLast } from './volume-oscillator'
export { cci, cciLast } from './cci'
export { ichimoku, ichimokuLast } from './ichimoku'
export type { IchimokuPoint, IchimokuParams } from './ichimoku'

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
import { cciLast } from './cci'

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
  cci20: number | null
}

/**
 * OhlcPoint 배열에서 모든 기술적 지표의 최신값을 한 번에 계산한다.
 * volume이 없는 경우 volumeRatio20은 null.
 */
export function computeAllIndicators(ohlc: OhlcPoint[]): AllIndicators {
  const closes = ohlc.map((p) => p.close)
  const highs = ohlc.map((p) => p.high)
  const lows = ohlc.map((p) => p.low)

  const volumes: (number | null)[] = ohlc.map((p) => p.volume ?? null)

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
    cci20: cciLast(highs, lows, closes, 20),
  }
}
