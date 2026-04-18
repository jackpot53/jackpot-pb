import { OhlcPoint } from '@/lib/price/sparkline'
import { getUniverse, getPriceHistoryBulk } from '@/db/queries/robo-advisor'
import { detectGoldenCross } from '@/lib/robo-advisor/signals/golden-cross'
import { detectRsiOversoldBounce } from '@/lib/robo-advisor/signals/rsi-oversold-bounce'
import { detectMacdCross } from '@/lib/robo-advisor/signals/macd-cross'
import { detectVolumeBreakout } from '@/lib/robo-advisor/signals/volume-breakout'
import { detectBollingerBreakout } from '@/lib/robo-advisor/signals/bollinger-breakout'
import { detectStochasticOversold } from '@/lib/robo-advisor/signals/stochastic-oversold'
import { detectAdxTrend } from '@/lib/robo-advisor/signals/adx-trend'
import { computeComposite } from '@/lib/robo-advisor/signals/composite'

type Detector = (ohlc: OhlcPoint[]) => boolean

export type SignalType =
  | 'golden_cross'
  | 'rsi_oversold_bounce'
  | 'macd_cross'
  | 'volume_breakout'
  | 'bollinger_breakout'
  | 'stochastic_oversold'
  | 'adx_trend'
  | 'composite'

export const SIGNAL_TYPES: SignalType[] = [
  'golden_cross',
  'rsi_oversold_bounce',
  'macd_cross',
  'volume_breakout',
  'bollinger_breakout',
  'stochastic_oversold',
  'adx_trend',
  'composite',
]

export const HOLDING_DAYS = [5, 10, 20, 60] as const

export interface BacktestResult {
  signalType: string
  holdingDays: number
  sampleCount: number
  winRateBps: number
  avgReturnBps: number
  medianReturnBps: number
  maxDrawdownBps: number
}

export function getDetector(signalType: string): Detector {
  switch (signalType as SignalType) {
    case 'golden_cross':        return detectGoldenCross
    case 'rsi_oversold_bounce': return detectRsiOversoldBounce
    case 'macd_cross':          return detectMacdCross
    case 'volume_breakout':     return detectVolumeBreakout
    case 'bollinger_breakout':  return detectBollingerBreakout
    case 'stochastic_oversold': return detectStochasticOversold
    case 'adx_trend':           return detectAdxTrend
    case 'composite':           return (ohlc) => computeComposite(ohlc).triggered
    default:
      throw new Error(`Unknown signal type: ${signalType}`)
  }
}

export function backtestSignalForTicker(
  signalType: string,
  holdingDays: number,
  ohlc: OhlcPoint[],
  minHistoryForSignal: number,
): number[] {
  const detector = getDetector(signalType)
  const returns: number[] = []
  const N = ohlc.length
  const maxEntryIdx = N - holdingDays - 1
  if (maxEntryIdx < minHistoryForSignal) return returns

  let nextAllowedIdx = minHistoryForSignal

  for (let i = minHistoryForSignal; i <= maxEntryIdx; i++) {
    if (i < nextAllowedIdx) continue

    const sliceStart = Math.max(0, i - 119)
    const ohlcSlice = ohlc.slice(sliceStart, i + 1)

    if (!detector(ohlcSlice)) continue

    const entryPrice = ohlc[i].close
    const exitPrice = ohlc[i + holdingDays].close
    if (entryPrice <= 0) continue

    const returnBps = Math.round(((exitPrice - entryPrice) / entryPrice) * 10000)
    returns.push(returnBps)

    nextAllowedIdx = i + holdingDays + 1
  }

  return returns
}

export function aggregateBacktestResults(
  signalType: string,
  holdingDays: number,
  allReturns: number[],
): BacktestResult {
  const sampleCount = allReturns.length

  if (sampleCount === 0) {
    return { signalType, holdingDays, sampleCount: 0, winRateBps: 0, avgReturnBps: 0, medianReturnBps: 0, maxDrawdownBps: 0 }
  }

  const wins = allReturns.filter((r) => r > 0).length
  const winRateBps = Math.round((wins / sampleCount) * 10000)

  const sum = allReturns.reduce((acc, r) => acc + r, 0)
  const avgReturnBps = Math.round(sum / sampleCount)

  const sorted = [...allReturns].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const medianReturnBps = sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid]

  const minReturn = sorted[0]
  const maxDrawdownBps = minReturn < 0 ? Math.abs(minReturn) : 0

  return { signalType, holdingDays, sampleCount, winRateBps, avgReturnBps, medianReturnBps, maxDrawdownBps }
}

export async function runBacktest(signalType: string, holdingDays: number): Promise<BacktestResult> {
  const universe = await getUniverse()
  const tickers = universe.map((s) => s.ticker)
  const historyMap = await getPriceHistoryBulk(tickers, 800)
  const MIN_HISTORY = 120
  const allReturns: number[] = []

  for (const ticker of tickers) {
    const rows = historyMap.get(ticker)
    if (!rows || rows.length < MIN_HISTORY + holdingDays) continue

    const ohlc: (OhlcPoint & { volume: number | null })[] = rows.map((r) => ({
      date: typeof r.date === 'string' ? r.date : (r.date as Date).toISOString().slice(0, 10),
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: r.volume !== null ? Number(r.volume) : null,
    }))

    const tickerReturns = backtestSignalForTicker(signalType, holdingDays, ohlc, MIN_HISTORY)
    for (const ret of tickerReturns) allReturns.push(ret)
  }

  return aggregateBacktestResults(signalType, holdingDays, allReturns)
}

export async function runAllBacktests(): Promise<BacktestResult[]> {
  const results: BacktestResult[] = []
  for (const signalType of SIGNAL_TYPES) {
    for (const days of HOLDING_DAYS) {
      const result = await runBacktest(signalType, days)
      results.push(result)
    }
  }
  return results
}
