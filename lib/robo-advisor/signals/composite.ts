import type { OhlcPoint } from '@/lib/price/sparkline'
import { detectGoldenCross } from './golden-cross'
import { detectRsiOversoldBounce } from './rsi-oversold-bounce'
import { detectMacdCross } from './macd-cross'
import { detectVolumeBreakout } from './volume-breakout'
import { detectBollingerBreakout } from './bollinger-breakout'
import { detectStochasticOversold } from './stochastic-oversold'
import { detectAdxTrend } from './adx-trend'

export type SignalType =
  | 'golden_cross'
  | 'rsi_oversold_bounce'
  | 'macd_cross'
  | 'volume_breakout'
  | 'bollinger_breakout'
  | 'stochastic_oversold'
  | 'adx_trend'

// 가중치 합산 = 100
const WEIGHTS: Record<SignalType, number> = {
  golden_cross: 20,
  rsi_oversold_bounce: 18,
  macd_cross: 15,
  volume_breakout: 15,
  bollinger_breakout: 12,
  stochastic_oversold: 12,
  adx_trend: 8,
}

const TRIGGER_THRESHOLD = 40

export interface CompositeResult {
  /** confidence ≥ 40이면 true */
  triggered: boolean
  /** 0~100, 가중 합산 점수 */
  confidence: number
  /** 각 시그널의 발동 여부 */
  signals: Record<SignalType, boolean>
}

/**
 * 7개 시그널 가중 합산으로 복합 점수를 계산한다.
 * triggered: confidence ≥ 40
 */
export function computeComposite(ohlc: OhlcPoint[]): CompositeResult {
  const signals: Record<SignalType, boolean> = {
    golden_cross: detectGoldenCross(ohlc),
    rsi_oversold_bounce: detectRsiOversoldBounce(ohlc),
    macd_cross: detectMacdCross(ohlc),
    volume_breakout: detectVolumeBreakout(ohlc),
    bollinger_breakout: detectBollingerBreakout(ohlc),
    stochastic_oversold: detectStochasticOversold(ohlc),
    adx_trend: detectAdxTrend(ohlc),
  }

  const confidence = (Object.entries(signals) as [SignalType, boolean][]).reduce(
    (sum, [type, fired]) => sum + (fired ? WEIGHTS[type] : 0),
    0,
  )

  return {
    triggered: confidence >= TRIGGER_THRESHOLD,
    confidence,
    signals,
  }
}
