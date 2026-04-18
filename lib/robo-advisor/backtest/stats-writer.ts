import { upsertBacktestStats } from '@/db/queries/robo-advisor'
import { BacktestResult } from './runner'

/**
 * BacktestResult 배열을 signal_backtest_stats 테이블에 순차적으로 upsert한다.
 * DB 스키마 컬럼명(winRate, avgReturn 등)으로 매핑해 저장한다.
 */
export async function writeBacktestStats(results: BacktestResult[]): Promise<void> {
  for (const result of results) {
    await upsertBacktestStats({
      signalType: result.signalType,
      holdingDays: result.holdingDays,
      sampleCount: result.sampleCount,
      winRate: result.winRateBps,
      avgReturn: result.avgReturnBps,
      medianReturn: result.medianReturnBps,
      maxDrawdown: result.maxDrawdownBps,
      updatedAt: new Date(),
    })
  }
}
