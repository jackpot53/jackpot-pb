import type { Signal, BacktestStats } from '@/db/queries/robo-advisor'

/** snake_case 시그널 타입을 표시용 이름으로 변환. */
export function formatSignalName(signalType: string): string {
  return signalType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export interface BacktestStatEntry {
  winRate: number
  sampleCount: number
  avgReturn: number
  medianReturn: number
}

/**
 * 발동된 시그널 목록과 백테스트 통계 맵에서 표 데이터를 빌드한다.
 * 키는 formatSignalName으로 변환된 표시 이름.
 */
export function buildBacktestStats(
  signals: Signal[],
  statsMap: Map<string, Map<number, BacktestStats>>,
): Record<string, BacktestStatEntry> {
  const result: Record<string, BacktestStatEntry> = {}
  for (const signal of signals) {
    const signalStats = statsMap.get(signal.signalType)?.get(20)
    if (signalStats) {
      result[formatSignalName(signal.signalType)] = {
        winRate: signalStats.winRate || 0,
        sampleCount: signalStats.sampleCount || 0,
        avgReturn: signalStats.avgReturn || 0,
        medianReturn: signalStats.medianReturn || 0,
      }
    }
  }
  return result
}
