'use client'

import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react'
import type { IChartApi, LogicalRange } from 'lightweight-charts'

export interface DateRange {
  from: string
  to: string
}

interface ChartSyncApi {
  /** lightweight-charts 인스턴스를 등록하고, 해제 함수를 반환한다 */
  registerChart: (chart: IChartApi) => () => void
  /** 캔들(마스터) 데이터의 날짜 배열을 등록 — logical range ↔ 날짜 변환 기준 */
  setMasterDates: (dates: string[]) => void
  /** 현재 공유 중인 보이는 구간(없으면 null) */
  getCurrentLogicalRange: () => LogicalRange | null
  /** 종목/기간 전환 시 공유 구간을 초기화해 각 차트가 새로 fit 하도록 한다 */
  resetRange: () => void
  /** Recharts 등 logical-range가 없는 차트를 위한 날짜 범위 구독 */
  subscribeDateRange: (cb: (range: DateRange | null) => void) => () => void
}

const ChartSyncContext = createContext<ChartSyncApi | null>(null)

export function useChartSync(): ChartSyncApi {
  const ctx = useContext(ChartSyncContext)
  if (!ctx) throw new Error('useChartSync must be used within ChartSyncProvider')
  return ctx
}

export function ChartSyncProvider({ children }: { children: ReactNode }) {
  const chartsRef = useRef<Set<IChartApi>>(new Set())
  const datesRef = useRef<string[]>([])
  const currentRangeRef = useRef<LogicalRange | null>(null)
  // 동기화 적용 중 재진입(피드백 루프) 방지
  const isApplyingRef = useRef(false)
  const dateSubsRef = useRef<Set<(r: DateRange | null) => void>>(new Set())

  const api = useMemo<ChartSyncApi>(() => {
    const clampIndex = (i: number) => {
      const len = datesRef.current.length
      if (len === 0) return 0
      return Math.max(0, Math.min(len - 1, i))
    }

    const computeDateRange = (range: LogicalRange | null): DateRange | null => {
      const dates = datesRef.current
      if (!range || dates.length === 0) return null
      const from = dates[clampIndex(Math.round(range.from))]
      const to = dates[clampIndex(Math.round(range.to))]
      if (!from || !to) return null
      return { from, to }
    }

    const notifyDateSubs = (range: LogicalRange | null) => {
      const dr = computeDateRange(range)
      dateSubsRef.current.forEach((cb) => cb(dr))
    }

    const registerChart: ChartSyncApi['registerChart'] = (chart) => {
      chartsRef.current.add(chart)

      const handler = (range: LogicalRange | null) => {
        if (isApplyingRef.current) return
        currentRangeRef.current = range
        if (!range) return
        isApplyingRef.current = true
        try {
          chartsRef.current.forEach((other) => {
            if (other === chart) return
            other.timeScale().setVisibleLogicalRange(range)
          })
          notifyDateSubs(range)
        } finally {
          isApplyingRef.current = false
        }
      }

      chart.timeScale().subscribeVisibleLogicalRangeChange(handler)

      // 이미 공유 구간이 있으면 새 차트를 즉시 그 구간으로 맞춘다
      const current = currentRangeRef.current
      if (current) {
        isApplyingRef.current = true
        try {
          chart.timeScale().setVisibleLogicalRange(current)
        } finally {
          isApplyingRef.current = false
        }
      }

      return () => {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler)
        chartsRef.current.delete(chart)
      }
    }

    const setMasterDates: ChartSyncApi['setMasterDates'] = (dates) => {
      datesRef.current = dates
      notifyDateSubs(currentRangeRef.current)
    }

    const getCurrentLogicalRange = () => currentRangeRef.current

    const resetRange = () => {
      currentRangeRef.current = null
      notifyDateSubs(null)
    }

    const subscribeDateRange: ChartSyncApi['subscribeDateRange'] = (cb) => {
      dateSubsRef.current.add(cb)
      cb(computeDateRange(currentRangeRef.current))
      return () => {
        dateSubsRef.current.delete(cb)
      }
    }

    return { registerChart, setMasterDates, getCurrentLogicalRange, resetRange, subscribeDateRange }
  }, [])

  return <ChartSyncContext.Provider value={api}>{children}</ChartSyncContext.Provider>
}
