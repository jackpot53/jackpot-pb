import type { OhlcPoint } from '@/lib/price/sparkline'
import { getUniverse, getPriceHistoryBulk, upsertSignal } from '@/db/queries/robo-advisor'
import { detectGoldenCross } from './golden-cross'
import { detectRsiOversoldBounce } from './rsi-oversold-bounce'
import { detectMacdCross } from './macd-cross'
import { detectVolumeBreakout } from './volume-breakout'
import { detectBollingerBreakout } from './bollinger-breakout'
import { detectStochasticOversold } from './stochastic-oversold'
import { detectAdxTrend } from './adx-trend'
import { computeComposite } from './composite'
import type { SignalType } from './composite'

type IndividualSignalType = Exclude<SignalType, never>

const INDIVIDUAL_DETECTORS: Record<IndividualSignalType, (ohlc: OhlcPoint[]) => boolean> = {
  golden_cross: detectGoldenCross,
  rsi_oversold_bounce: detectRsiOversoldBounce,
  macd_cross: detectMacdCross,
  volume_breakout: detectVolumeBreakout,
  bollinger_breakout: detectBollingerBreakout,
  stochastic_oversold: detectStochasticOversold,
  adx_trend: detectAdxTrend,
}

/**
 * price_history row를 OhlcPoint로 변환.
 * volume은 OhlcPoint 타입에 없지만 런타임에 함께 전달해 volume 지표에서 사용.
 */
function toOhlcPoint(row: {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume?: number | null
}): OhlcPoint & { volume?: number | null } {
  return {
    date: row.date,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume ?? null,
  }
}

/**
 * 한 종목에 대해 모든 시그널 평가 후 DB에 upsert.
 */
export async function evaluateSignalsForTicker(
  ticker: string,
  ohlc: OhlcPoint[],
): Promise<void> {
  const today = ohlc[ohlc.length - 1]?.date ?? new Date().toISOString().slice(0, 10)

  // 개별 시그널 upsert
  const individualOps = (Object.entries(INDIVIDUAL_DETECTORS) as [IndividualSignalType, (ohlc: OhlcPoint[]) => boolean][]).map(
    async ([signalType, detect]) => {
      const triggered = detect(ohlc)
      await upsertSignal({
        ticker,
        signalType,
        triggered,
        triggeredAt: triggered ? today : undefined,
        confidence: null,
        detail: null,
      })
    },
  )

  // 복합 시그널 upsert
  const compositeOp = async () => {
    const result = computeComposite(ohlc)
    await upsertSignal({
      ticker,
      signalType: 'composite',
      triggered: result.triggered,
      triggeredAt: result.triggered ? today : undefined,
      confidence: result.confidence,
      detail: result.signals as unknown as Record<string, unknown>,
    })
  }

  await Promise.all([...individualOps, compositeOp()])
}

/**
 * 전 종목 시그널 평가.
 * price_history에서 각 종목 최근 120일 OHLC를 로드해 평가한다.
 */
export async function evaluateAllSignals(): Promise<{ evaluated: number; triggered: number }> {
  const universe = await getUniverse()
  if (universe.length === 0) return { evaluated: 0, triggered: 0 }

  const tickers = universe.map((s) => s.ticker)
  const historyMap = await getPriceHistoryBulk(tickers, 120)

  let evaluated = 0
  let triggered = 0

  // 종목별 순차 평가 (DB 과부하 방지)
  for (const ticker of tickers) {
    const rows = historyMap.get(ticker)
    if (!rows || rows.length < 20) continue  // 최소 데이터 없으면 스킵

    const ohlc = rows.map(toOhlcPoint)

    try {
      await evaluateSignalsForTicker(ticker, ohlc)
      evaluated++

      // composite triggered 여부 확인
      const composite = computeComposite(ohlc)
      if (composite.triggered) triggered++
    } catch (err) {
      // 개별 종목 실패가 전체 평가를 중단하지 않도록 에러 로깅만 수행
      console.error(`[evaluateAllSignals] ticker=${ticker} 평가 실패:`, err)
    }
  }

  return { evaluated, triggered }
}
