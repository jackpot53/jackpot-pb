import { describe, it, expect } from 'vitest'
import {
  detectIchimokuTkCrosses,
  detectIchimokuCloudBreakouts,
  detectIchimokuSignals,
  lastIchimokuSignal,
} from '../ichimoku-signals'
import type { IchimokuPoint } from '../../indicators/ichimoku'

/** n개의 단순 증가 날짜 생성 */
function makeDates(n: number): string[] {
  const dates: string[] = []
  let year = 2024, month = 1, day = 1
  const dpm = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  for (let i = 0; i < n; i++) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    day++
    if (day > dpm[month]) { day = 1; month++ }
    if (month > 12) { month = 1; year++ }
  }
  return dates
}

/** IchimokuPoint 생성 헬퍼 (일부 필드만 설정) */
function pt(
  tenkan: number | null,
  kijun: number | null,
  senkouA: number | null = null,
  senkouB: number | null = null,
): IchimokuPoint {
  return { tenkan, kijun, senkouA, senkouB, chikou: null }
}

describe('detectIchimokuTkCrosses', () => {
  it('골든 크로스(매수): 전일 tenkan ≤ kijun → 당일 tenkan > kijun', () => {
    const pts: IchimokuPoint[] = [
      pt(90, 100),   // tenkan < kijun
      pt(105, 100),  // tenkan > kijun → 골든 크로스
    ]
    const dates = makeDates(2)
    const signals = detectIchimokuTkCrosses(pts, dates)
    expect(signals).toHaveLength(1)
    expect(signals[0].type).toBe('buy')
    expect(signals[0].kind).toBe('tk-cross')
    expect(signals[0].date).toBe(dates[1])
  })

  it('데드 크로스(매도): 전일 tenkan ≥ kijun → 당일 tenkan < kijun', () => {
    const pts: IchimokuPoint[] = [
      pt(110, 100),
      pt(90, 100),
    ]
    const dates = makeDates(2)
    const signals = detectIchimokuTkCrosses(pts, dates)
    expect(signals).toHaveLength(1)
    expect(signals[0].type).toBe('sell')
    expect(signals[0].kind).toBe('tk-cross')
  })

  it('tenkan이 계속 kijun보다 높으면 크로스 없음', () => {
    const pts: IchimokuPoint[] = [
      pt(110, 100),
      pt(115, 100),
      pt(120, 100),
    ]
    const dates = makeDates(3)
    expect(detectIchimokuTkCrosses(pts, dates)).toHaveLength(0)
  })

  it('null 포함 봉은 건너뜀 — 신호 없음', () => {
    const pts: IchimokuPoint[] = [
      pt(null, null),
      pt(105, 100),
    ]
    const dates = makeDates(2)
    expect(detectIchimokuTkCrosses(pts, dates)).toHaveLength(0)
  })

  it('한 쪽이 null이면 건너뜀', () => {
    const pts: IchimokuPoint[] = [
      pt(90, 100),
      pt(null, 100),
    ]
    const dates = makeDates(2)
    expect(detectIchimokuTkCrosses(pts, dates)).toHaveLength(0)
  })

  it('복수 크로스 — 모두 감지', () => {
    const pts: IchimokuPoint[] = [
      pt(90, 100),   // below
      pt(110, 100),  // 골든 (매수)
      pt(95, 100),   // 데드 (매도)
      pt(105, 100),  // 골든 (매수)
    ]
    const dates = makeDates(4)
    const signals = detectIchimokuTkCrosses(pts, dates)
    expect(signals).toHaveLength(3)
    expect(signals[0].type).toBe('buy')
    expect(signals[1].type).toBe('sell')
    expect(signals[2].type).toBe('buy')
  })
})

describe('detectIchimokuCloudBreakouts', () => {
  it('구름 상향 돌파(매수): 전일 종가 ≤ 구름 상단 → 당일 종가 > 구름 상단', () => {
    // senkouA=100, senkouB=90 → 구름 상단=100
    const pts: IchimokuPoint[] = [
      pt(0, 0, 100, 90),
      pt(0, 0, 100, 90),
    ]
    const closes = [98, 105]  // 98 ≤ 100, 105 > 100
    const dates = makeDates(2)
    const signals = detectIchimokuCloudBreakouts(pts, closes, dates)
    expect(signals).toHaveLength(1)
    expect(signals[0].type).toBe('buy')
    expect(signals[0].kind).toBe('cloud-breakout')
  })

  it('구름 하향 이탈(매도): 전일 종가 ≥ 구름 하단 → 당일 종가 < 구름 하단', () => {
    // senkouA=90, senkouB=100 → 구름 하단=90
    const pts: IchimokuPoint[] = [
      pt(0, 0, 90, 100),
      pt(0, 0, 90, 100),
    ]
    const closes = [92, 85]  // 92 ≥ 90, 85 < 90
    const dates = makeDates(2)
    const signals = detectIchimokuCloudBreakouts(pts, closes, dates)
    expect(signals).toHaveLength(1)
    expect(signals[0].type).toBe('sell')
  })

  it('구름 내부에서 움직이면 신호 없음', () => {
    const pts: IchimokuPoint[] = [
      pt(0, 0, 100, 90),
      pt(0, 0, 100, 90),
    ]
    const closes = [95, 96]  // 둘 다 구름 내부
    const dates = makeDates(2)
    expect(detectIchimokuCloudBreakouts(pts, closes, dates)).toHaveLength(0)
  })

  it('senkouA/B null 봉은 건너뜀', () => {
    const pts: IchimokuPoint[] = [
      pt(0, 0, null, null),
      pt(0, 0, 100, 90),
    ]
    const closes = [98, 105]
    const dates = makeDates(2)
    expect(detectIchimokuCloudBreakouts(pts, closes, dates)).toHaveLength(0)
  })

  it('A < B 구름(음운)도 올바르게 상단/하단 계산', () => {
    // senkouA=80, senkouB=100 → 상단=100, 하단=80
    const pts: IchimokuPoint[] = [
      pt(0, 0, 80, 100),
      pt(0, 0, 80, 100),
    ]
    const closes = [98, 105]  // 98 ≤ 100 → 105 > 100 = 매수
    const dates = makeDates(2)
    const signals = detectIchimokuCloudBreakouts(pts, closes, dates)
    expect(signals).toHaveLength(1)
    expect(signals[0].type).toBe('buy')
  })
})

describe('detectIchimokuSignals', () => {
  it('TK 크로스 + 구름 돌파 통합 반환', () => {
    const pts: IchimokuPoint[] = [
      pt(90, 100, 95, 85),
      pt(105, 100, 95, 85),  // TK 골든 + 종가로 구름 돌파 시도
    ]
    const closes = [93, 98]  // 98 > 95(구름 상단) → 구름 돌파 매수
    const dates = makeDates(2)
    const signals = detectIchimokuSignals(pts, closes, dates)
    const kinds = signals.map((s) => s.kind)
    expect(kinds).toContain('tk-cross')
    expect(kinds).toContain('cloud-breakout')
  })
})

describe('lastIchimokuSignal', () => {
  it('신호 없으면 null', () => {
    // tenkan > kijun 유지, 종가 구름 내부
    const pts: IchimokuPoint[] = [
      pt(110, 100, 100, 90),
      pt(115, 100, 100, 90),
    ]
    const closes = [95, 96]
    const dates = makeDates(2)
    expect(lastIchimokuSignal(pts, closes, dates)).toBeNull()
  })

  it('단 하나의 신호 — daysAgo 정확성', () => {
    // 인덱스1 에서 골든 크로스 발생 → daysAgo = 2 - 1 - 1 = 0
    const pts: IchimokuPoint[] = [
      pt(90, 100),
      pt(110, 100),
    ]
    const closes = [100, 100]
    const dates = makeDates(2)
    const result = lastIchimokuSignal(pts, closes, dates)
    expect(result).not.toBeNull()
    expect(result!.daysAgo).toBe(0)
    expect(result!.type).toBe('buy')
    expect(result!.kind).toBe('tk-cross')
  })

  it('가장 최근 신호만 반환', () => {
    // 인덱스1 매수, 인덱스3 매도 → 가장 최근은 인덱스3
    const pts: IchimokuPoint[] = [
      pt(90, 100),
      pt(110, 100),  // 골든(매수) — daysAgo = 2
      pt(110, 100),
      pt(90, 100),   // 데드(매도) — daysAgo = 0
    ]
    const closes = [100, 100, 100, 100]
    const dates = makeDates(4)
    const result = lastIchimokuSignal(pts, closes, dates)
    expect(result).not.toBeNull()
    expect(result!.daysAgo).toBe(0)
    expect(result!.type).toBe('sell')
  })

  it('daysAgo: 마지막에서 2봉 전 신호 → daysAgo = 2', () => {
    const pts: IchimokuPoint[] = [
      pt(90, 100),
      pt(110, 100),  // 골든(인덱스1)
      pt(110, 100),  // (인덱스2)
      pt(110, 100),  // (인덱스3, 마지막)
    ]
    const closes = [100, 100, 100, 100]
    const dates = makeDates(4)
    const result = lastIchimokuSignal(pts, closes, dates)
    expect(result).not.toBeNull()
    // 마지막 인덱스 = 3, 신호 인덱스 = 1 → daysAgo = 3 - 1 - 1 = ... wait
    // pts.length - 1 - lastIndexOf(date[1]) = 4 - 1 - 1 = 2
    expect(result!.daysAgo).toBe(2)
  })
})
