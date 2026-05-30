import type { ShortSellingPoint } from '@/lib/kis/short-selling'

// 최소 데이터 요건: 20일 이동평균 + 당일
const MIN_DATA = 21

// 공매도 비중이 이 값 미만이면 경고 미발생 — 절대적으로 낮은 수준은 무시
const SHORT_RATIO_FLOOR = 20   // (%)

// 당일 비중 ≥ 20일 평균 × 2 이면 급증으로 판단
const SHORT_RATIO_SPIKE = 2

// 비중 ≥ 40%면 평균 무관 극단 경고
const SHORT_RATIO_EXTREME = 40  // (%)

export interface ShortRiskEvent {
  date: string
  ratio: number      // 당일 공매도 비중 (%)
  avgRatio: number   // 직전 20일 평균 비중 (%)
  reason: 'spike' | 'extreme'
}

/**
 * 전체 데이터에서 공매도 위험 이벤트를 모두 반환.
 *
 * spike  — 당일 비중 ≥ 20일 평균 × SHORT_RATIO_SPIKE AND 비중 ≥ SHORT_RATIO_FLOOR
 * extreme — 당일 비중 ≥ SHORT_RATIO_EXTREME (평균 무관)
 */
export function detectShortSellingRisks(points: ShortSellingPoint[]): ShortRiskEvent[] {
  if (points.length < MIN_DATA) return []

  const events: ShortRiskEvent[] = []

  for (let i = 20; i < points.length; i++) {
    const today = points[i]
    const ratio = today.shortRatio

    // 직전 20일 평균 비중 (당일 미포함)
    let sum = 0
    for (let j = i - 20; j < i; j++) sum += points[j].shortRatio
    const avgRatio = sum / 20

    const isExtreme = ratio >= SHORT_RATIO_EXTREME
    const isSpike = ratio >= SHORT_RATIO_FLOOR && avgRatio > 0 && ratio >= avgRatio * SHORT_RATIO_SPIKE

    if (isExtreme) {
      events.push({ date: today.date, ratio, avgRatio, reason: 'extreme' })
    } else if (isSpike) {
      events.push({ date: today.date, ratio, avgRatio, reason: 'spike' })
    }
  }

  return events
}

/**
 * 미리 계산된 이벤트 목록에서 가장 최근 공매도 위험 이벤트를 반환.
 * detectShortSellingRisks()를 외부에서 한 번만 호출하고 재사용할 때 사용.
 *
 * daysAgo: points 배열 기준 영업일 수
 */
export function lastShortRiskFromEvents(
  events: ShortRiskEvent[],
  points: ShortSellingPoint[],
): { date: string; daysAgo: number; ratio: number; avgRatio: number; reason: 'spike' | 'extreme' } | null {
  if (events.length === 0) return null
  const last = events[events.length - 1]
  const idx = points.findIndex((p) => p.date === last.date)
  return { ...last, daysAgo: points.length - 1 - idx }
}
