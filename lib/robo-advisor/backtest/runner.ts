import { OhlcPoint } from '@/lib/price/sparkline'
import { getUniverse, getPriceHistoryBulk } from '@/db/queries/robo-advisor'

// Signal detector function signatures — implementations live in lib/robo-advisor/signals/
// A separate agent authors those files; here we only declare the expected shape.
type Detector = (ohlc: OhlcPoint[]) => boolean

function detectGoldenCross(ohlc: OhlcPoint[]): boolean {
  // Stub: replaced when lib/robo-advisor/signals/ implementations land
  void ohlc
  return false
}

function detectRsiOversoldBounce(ohlc: OhlcPoint[]): boolean {
  void ohlc
  return false
}

function detectMacdCross(ohlc: OhlcPoint[]): boolean {
  void ohlc
  return false
}

function detectVolumeBreakout(ohlc: OhlcPoint[]): boolean {
  void ohlc
  return false
}

function detectBollingerBreakout(ohlc: OhlcPoint[]): boolean {
  void ohlc
  return false
}

function detectStochasticOversold(ohlc: OhlcPoint[]): boolean {
  void ohlc
  return false
}

function detectAdxTrend(ohlc: OhlcPoint[]): boolean {
  void ohlc
  return false
}

function computeComposite(ohlc: OhlcPoint[]): { triggered: boolean; confidence: number } {
  void ohlc
  return { triggered: false, confidence: 0 }
}

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
  winRateBps: number       // 승률 bps (e.g. 6200 = 62%)
  avgReturnBps: number     // 평균 수익률 bps
  medianReturnBps: number  // 중앙값 수익률 bps
  maxDrawdownBps: number   // 최대 손실 bps (양수로 저장, e.g. 500 = -5%)
}

/**
 * signalType에 해당하는 감지 함수를 반환.
 * composite는 triggered 여부만 추출하는 래퍼로 통일.
 */
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

/**
 * 단일 종목의 전체 히스토리에서 시그널 발생 시점을 순회하며
 * 각 시점 기준 holdingDays 후 수익률(bps)을 계산한다.
 *
 * 연속 발동 중복 방지: 이전 시그널의 holdingDays가 끝날 때까지 새 신호 무시.
 * O(N) 슬라이싱 최적화: ohlcSlice는 최근 120개만 사용 (지표 계산 충분).
 */
export function backtestSignalForTicker(
  signalType: string,
  holdingDays: number,
  ohlc: OhlcPoint[],
  minHistoryForSignal: number,
): number[] {
  const detector = getDetector(signalType)
  const returns: number[] = []
  const N = ohlc.length

  // i에서 진입 → i + holdingDays에서 청산이므로 마지막 진입 가능 인덱스는 N - holdingDays - 1
  const maxEntryIdx = N - holdingDays - 1
  if (maxEntryIdx < minHistoryForSignal) return returns

  // nextAllowedIdx: 이 인덱스 이전 시점은 중복 포지션으로 건너뜀
  let nextAllowedIdx = minHistoryForSignal

  for (let i = minHistoryForSignal; i <= maxEntryIdx; i++) {
    if (i < nextAllowedIdx) continue

    // 최근 120개만 slicing → O(N) 총 복잡도 유지
    const sliceStart = Math.max(0, i - 119)
    const ohlcSlice = ohlc.slice(sliceStart, i + 1)

    if (!detector(ohlcSlice)) continue

    const entryPrice = ohlc[i].close
    const exitPrice = ohlc[i + holdingDays].close
    if (entryPrice <= 0) continue  // 비정상 데이터 방어

    const returnBps = Math.round(((exitPrice - entryPrice) / entryPrice) * 10000)
    returns.push(returnBps)

    // 이전 포지션이 끝나는 다음 날부터 신호 재허용
    nextAllowedIdx = i + holdingDays + 1
  }

  return returns
}

/**
 * 전 종목의 수익률 배열을 합산해 BacktestResult 통계를 산출한다.
 *
 * winRateBps  = (양수 수익 건수 / 전체) × 10000
 * avgReturn   = 평균 bps (소수점 반올림)
 * medianReturn= 중앙값 bps
 * maxDrawdown = 최소 return의 절댓값 (최악 손실, 양수로 저장)
 */
export function aggregateBacktestResults(
  signalType: string,
  holdingDays: number,
  allReturns: number[],
): BacktestResult {
  const sampleCount = allReturns.length

  if (sampleCount === 0) {
    return {
      signalType,
      holdingDays,
      sampleCount: 0,
      winRateBps: 0,
      avgReturnBps: 0,
      medianReturnBps: 0,
      maxDrawdownBps: 0,
    }
  }

  const wins = allReturns.filter((r) => r > 0).length
  const winRateBps = Math.round((wins / sampleCount) * 10000)

  const sum = allReturns.reduce((acc, r) => acc + r, 0)
  const avgReturnBps = Math.round(sum / sampleCount)

  const sorted = [...allReturns].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const medianReturnBps =
    sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid]

  // 최악 손실 = 가장 낮은 수익률의 절댓값 (양수로 저장)
  const minReturn = sorted[0]
  const maxDrawdownBps = minReturn < 0 ? Math.abs(minReturn) : 0

  return {
    signalType,
    holdingDays,
    sampleCount,
    winRateBps,
    avgReturnBps,
    medianReturnBps,
    maxDrawdownBps,
  }
}

/**
 * 전체 유니버스에 대해 특정 (signalType, holdingDays) 백테스트를 실행한다.
 * price_history에서 최근 800일(≈3년) 데이터를 로드해 종목별로 backtestSignalForTicker를 호출하고
 * 전 종목 수익률을 합산해 BacktestResult를 반환한다.
 */
export async function runBacktest(
  signalType: string,
  holdingDays: number,
): Promise<BacktestResult> {
  const universe = await getUniverse()
  const tickers = universe.map((s) => s.ticker)

  // 3년 ≈ 780 거래일, 여유분 포함 800일 요청
  const historyMap = await getPriceHistoryBulk(tickers, 800)

  // 시그널 지표 계산에 필요한 최소 데이터: 슬라이스 최대 길이(120)와 동일
  const MIN_HISTORY = 120

  const allReturns: number[] = []

  for (const ticker of tickers) {
    const rows = historyMap.get(ticker)
    if (!rows || rows.length < MIN_HISTORY + holdingDays) continue

    // DB row → OhlcPoint 변환 (price_history 컬럼 타입이 numeric/string일 수 있음)
    const ohlc: OhlcPoint[] = rows.map((r) => ({
      date: typeof r.date === 'string' ? r.date : (r.date as Date).toISOString().slice(0, 10),
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
    }))

    const tickerReturns = backtestSignalForTicker(signalType, holdingDays, ohlc, MIN_HISTORY)
    for (const ret of tickerReturns) allReturns.push(ret)
  }

  return aggregateBacktestResults(signalType, holdingDays, allReturns)
}

/**
 * 모든 시그널 유형 × 모든 보유기간(5, 10, 20, 60) 조합에 대해 백테스트를 실행한다.
 * cron job에서 주 1회 실행 → 분 단위 실행 시간 허용.
 */
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
