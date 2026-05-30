'use client'

import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react'
import type { IChartApi, Logical, LogicalRange } from 'lightweight-charts'

export const CHART_RIGHT_AXIS_WIDTH = 72

/** 보조지표 패널 — 날짜축을 완전히 숨겨 날짜 표시는 캔들 차트에만 */
export const HIDDEN_TIME_SCALE = {
  borderVisible: false,
  timeVisible: false,
  visible: false,
} as const

export interface DateRange {
  from: string
  to: string
}

interface ChartSyncApi {
  /** lightweight-charts 인스턴스를 등록하고, 해제 함수를 반환한다 */
  registerChart: (chart: IChartApi, opts?: { master?: boolean }) => () => void
  /** 캔들(마스터) 데이터의 날짜 배열을 등록 — logical range ↔ 날짜 변환 기준 */
  setMasterDates: (dates: string[]) => void
  /** 현재 공유 중인 보이는 구간(없으면 null) */
  getCurrentLogicalRange: () => LogicalRange | null
  /** 종목/기간 전환 시 공유 구간을 초기화해 각 차트가 새로 fit 하도록 한다 */
  resetRange: () => void
  /** Recharts 등 logical-range가 없는 차트를 위한 날짜 범위 구독 */
  subscribeDateRange: (cb: (range: DateRange | null) => void) => () => void
  /**
   * months 개월치 기간 프리셋을 전 차트에 적용한다.
   * months=null 이면 전체 데이터가 보이도록 fit한다.
   */
  applyMonthsPreset: (months: number | null) => void
  /**
   * 현재 보이는 span을 유지하면서 fraction 비율만큼 좌(음수)/우(양수)로 이동한다.
   * 데이터 경계에서 클램프된다.
   */
  pan: (fraction: number) => void
  /** 캔들 차트의 실제 우측 축 너비를 발행 — 서브 패널이 이 값으로 minimumWidth를 맞춘다 */
  setMasterAxisWidth: (width: number) => void
  /** 우측 축 너비 변경을 구독 */
  subscribeMasterAxisWidth: (cb: (width: number) => void) => () => void
  /**
   * 보조 차트 데이터 업데이트 시 사용 — 공유 구간을 해당 차트에만 적용하되
   * isApplyingRef 가드로 보호해 역방향 피드백 루프를 차단한다.
   * 공유 구간이 없으면 fitContent()를 호출한다.
   */
  applyRangeToChart: (chart: IChartApi) => void
  /**
   * 마스터 데이터의 마지막 바(최신 거래일)를 우측 끝에 앵커하고 전 차트에 동기 전파한다.
   * fitContent()와 달리 currentRangeRef를 즉시 갱신하므로 서브 패널 레이스를 방지한다.
   */
  anchorToEnd: () => void
}

const ChartSyncContext = createContext<ChartSyncApi | null>(null)

export function useChartSync(): ChartSyncApi {
  const ctx = useContext(ChartSyncContext)
  if (!ctx) throw new Error('useChartSync must be used within ChartSyncProvider')
  return ctx
}

export function ChartSyncProvider({ children }: { children: ReactNode }) {
  const chartsRef = useRef<Set<IChartApi>>(new Set())
  const masterChartRef = useRef<IChartApi | null>(null)
  const datesRef = useRef<string[]>([])
  const currentRangeRef = useRef<LogicalRange | null>(null)
  // 동기화 적용 중 재진입(피드백 루프) 방지
  const isApplyingRef = useRef(false)
  const dateSubsRef = useRef<Set<(r: DateRange | null) => void>>(new Set())
  // 좌이동 하드 경계 — 최신 날짜 기준 3년 이전 인덱스 (setMasterDates 시 갱신)
  const minFromRef = useRef<number>(0)
  // 캔들 차트 우측 축 실제 너비
  const masterAxisWidthRef = useRef<number>(CHART_RIGHT_AXIS_WIDTH)
  const axisWidthSubsRef = useRef<Set<(w: number) => void>>(new Set())

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

    const registerChart: ChartSyncApi['registerChart'] = (chart, opts) => {
      chartsRef.current.add(chart)
      if (opts?.master) masterChartRef.current = chart

      const handler = (range: LogicalRange | null) => {
        if (isApplyingRef.current) return
        // 서브 패널은 range를 seeding·전파하지 않는다 — 마스터만 공유 range를 소유한다.
        // lightweight-charts의 visibleLogicalRangeChange는 rAF 다음 프레임에 비동기로 발생하므로
        // 동기 isApplyingRef 가드만으로는 서브 패널의 fitContent() 레이스를 막을 수 없다.
        if (chart !== masterChartRef.current) return
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
        if (masterChartRef.current === chart) masterChartRef.current = null
      }
    }

    const setMasterDates: ChartSyncApi['setMasterDates'] = (dates) => {
      datesRef.current = dates
      // 좌이동 경계: 최신 날짜 기준 3년 이전 인덱스를 미리 계산
      const len = dates.length
      if (len > 0) {
        const cutoff = new Date(dates[len - 1])
        cutoff.setFullYear(cutoff.getFullYear() - 3)
        let idx = 0
        for (let i = len - 1; i >= 0; i--) {
          if (new Date(dates[i]) < cutoff) { idx = i + 1; break }
        }
        minFromRef.current = idx
      } else {
        minFromRef.current = 0
      }
      notifyDateSubs(currentRangeRef.current)
    }

    const getCurrentLogicalRange = () => currentRangeRef.current

    const resetRange = () => {
      currentRangeRef.current = null
      masterAxisWidthRef.current = 0  // 종목/기간 전환 시 너비 재협상
      notifyDateSubs(null)
    }

    const subscribeDateRange: ChartSyncApi['subscribeDateRange'] = (cb) => {
      dateSubsRef.current.add(cb)
      cb(computeDateRange(currentRangeRef.current))
      return () => {
        dateSubsRef.current.delete(cb)
      }
    }

    // 오른쪽 여백 바 수 (fitContent 시 캔들이 우측 끝에 딱 붙지 않도록)
    const RIGHT_MARGIN = 2

    // 현재 공유 range, 없으면 첫 번째 차트의 실제 보이는 range에서 읽는다
    const getActiveRange = (): LogicalRange | null => {
      if (currentRangeRef.current) return currentRangeRef.current
      for (const c of chartsRef.current) {
        const r = c.timeScale().getVisibleLogicalRange()
        if (r) return r
      }
      return null
    }

    // 전 차트에 동시 적용 (isApplyingRef 가드로 동기화 핸들러 재진입 방지)
    const applyLogicalRange = (range: LogicalRange) => {
      currentRangeRef.current = range
      isApplyingRef.current = true
      try {
        chartsRef.current.forEach((c) => c.timeScale().setVisibleLogicalRange(range))
        notifyDateSubs(range)
      } finally {
        isApplyingRef.current = false
      }
    }

    const applyMonthsPreset: ChartSyncApi['applyMonthsPreset'] = (months) => {
      const dates = datesRef.current
      const len = dates.length
      if (len === 0) return
      const to = (len - 1 + RIGHT_MARGIN) as Logical
      if (months == null) {
        applyLogicalRange({ from: 0 as Logical, to })
        return
      }
      // 데이터 마지막 날이 아닌 오늘 기준으로 역산 — 캐시된 데이터에서도 정확한 범위 보장
      const cutoff = new Date()
      cutoff.setMonth(cutoff.getMonth() - months)
      let from = 0
      for (let i = len - 1; i >= 0; i--) {
        if (new Date(dates[i]) < cutoff) { from = i + 1; break }
      }
      applyLogicalRange({ from: Math.min(from, len - 1) as Logical, to })
    }

    const pan: ChartSyncApi['pan'] = (fraction) => {
      const r = getActiveRange()
      if (!r) return
      const len = datesRef.current.length
      const span = r.to - r.from
      let from = r.from + span * fraction
      let to = r.to + span * fraction
      const maxTo = len - 1 + RIGHT_MARGIN
      const minFrom = minFromRef.current
      if (to > maxTo) { to = maxTo; from = to - span }
      if (from < minFrom) { from = minFrom; to = from + span }
      applyLogicalRange({ from: from as Logical, to: to as Logical })
    }

    const setMasterAxisWidth: ChartSyncApi['setMasterAxisWidth'] = (width) => {
      // 모든 패널의 너비를 수집해 최댓값만 전파 — 서브 패널이 더 넓은 레이블을 가질 때도 정렬 유지
      if (width <= 0 || width <= masterAxisWidthRef.current) return
      masterAxisWidthRef.current = width
      axisWidthSubsRef.current.forEach((cb) => cb(width))
    }

    const subscribeMasterAxisWidth: ChartSyncApi['subscribeMasterAxisWidth'] = (cb) => {
      axisWidthSubsRef.current.add(cb)
      cb(masterAxisWidthRef.current)
      return () => axisWidthSubsRef.current.delete(cb)
    }

    const applyRangeToChart: ChartSyncApi['applyRangeToChart'] = (chart) => {
      const shared = currentRangeRef.current
      isApplyingRef.current = true
      try {
        if (shared) chart.timeScale().setVisibleLogicalRange(shared)
        else chart.timeScale().fitContent()
      } finally {
        isApplyingRef.current = false
      }
    }

    const anchorToEnd: ChartSyncApi['anchorToEnd'] = () => {
      const len = datesRef.current.length
      if (len === 0) return
      // applyLogicalRange는 currentRangeRef를 동기 갱신 후 전 차트에 전파 —
      // 서브 패널들이 뒤이어 applyRangeToChart를 호출해도 올바른 공유 range를 즉시 읽는다.
      applyLogicalRange({ from: 0 as Logical, to: (len - 1 + RIGHT_MARGIN) as Logical })
    }

    return { registerChart, setMasterDates, getCurrentLogicalRange, resetRange, subscribeDateRange, applyMonthsPreset, pan, setMasterAxisWidth, subscribeMasterAxisWidth, applyRangeToChart, anchorToEnd }
  }, [])

  return <ChartSyncContext.Provider value={api}>{children}</ChartSyncContext.Provider>
}
