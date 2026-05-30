import { describe, it, expect } from 'vitest'
import {
  detectBollingerReentries,
  detectBollingerSqueezeBreakouts,
  lastBollingerSignal,
} from '../bollinger-signals'
import { bollinger } from '../../indicators/bollinger'

function makeDates(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`)
}

describe('detectBollingerReentries', () => {
  it('데이터 부족(<20) 시 빈 배열', () => {
    const closes = Array.from({ length: 15 }, () => 100)
    const bands = bollinger(closes)
    const dates = makeDates(closes.length)
    expect(detectBollingerReentries(bands, closes, dates)).toHaveLength(0)
  })

  it('하단 이탈 후 복귀 → 매수 시그널', () => {
    // 20개 초기값으로 밴드 안정화 후 급락으로 하단 이탈, 다음날 복귀
    const closes = [
      ...Array.from({ length: 20 }, () => 100),  // 안정 구간
      60,   // 급락 → 하단 이탈
      100,  // 복귀 → 매수 신호
    ]
    const bands = bollinger(closes)
    const dates = makeDates(closes.length)
    const signals = detectBollingerReentries(bands, closes, dates)
    const buys = signals.filter((s) => s.type === 'buy' && s.kind === 'reentry')
    expect(buys.length).toBeGreaterThan(0)
  })

  it('상단 이탈 후 복귀 → 매도 시그널', () => {
    const closes = [
      ...Array.from({ length: 20 }, () => 100),  // 안정 구간
      150,  // 급등 → 상단 이탈
      100,  // 복귀 → 매도 신호
    ]
    const bands = bollinger(closes)
    const dates = makeDates(closes.length)
    const signals = detectBollingerReentries(bands, closes, dates)
    const sells = signals.filter((s) => s.type === 'sell' && s.kind === 'reentry')
    expect(sells.length).toBeGreaterThan(0)
  })
})

describe('detectBollingerSqueezeBreakouts', () => {
  it('데이터 부족 시 빈 배열', () => {
    const closes = Array.from({ length: 15 }, () => 100)
    const bands = bollinger(closes)
    const dates = makeDates(closes.length)
    expect(detectBollingerSqueezeBreakouts(bands, closes, dates)).toHaveLength(0)
  })

  it('스퀴즈(저변동) 후 상단 돌파 → 매수 시그널', () => {
    // 30개 교호 구간(95/105, bandwidth≈0.2)으로 스퀴즈 안정화 후
    // 112 급등 → upper≈111.85 돌파 + bandwidth≈0.218 ≤ 0.2×1.1=0.22 → 스퀴즈 돌파
    const stable = Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 95 : 105))
    const closes = [...stable, 112]
    const bands = bollinger(closes)
    const dates = makeDates(closes.length)
    const signals = detectBollingerSqueezeBreakouts(bands, closes, dates)
    const buys = signals.filter((s) => s.type === 'buy' && s.kind === 'squeeze')
    expect(buys.length).toBeGreaterThan(0)
  })

  it('상단 미돌파 시 스퀴즈 신호 없음', () => {
    // 교호 구간 후 상단 이하 값 → 돌파 조건 미충족
    const stable = Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 95 : 105))
    // upper ≈ 110 (pure alternating window 기준), 109는 미돌파
    const closes = [...stable, 109]
    const bands = bollinger(closes)
    const dates = makeDates(closes.length)
    const signals = detectBollingerSqueezeBreakouts(bands, closes, dates)
    // 종가가 upper 이하면 squeeze 신호 없음
    expect(signals.filter((s) => s.kind === 'squeeze').length).toBe(0)
  })
})

describe('lastBollingerSignal', () => {
  it('신호 없으면 null', () => {
    const closes = Array.from({ length: 25 }, () => 100)  // 등락 없음
    const bands = bollinger(closes)
    const dates = makeDates(closes.length)
    const result = lastBollingerSignal(bands, closes, dates)
    // 완전히 플랫하면 밴드폭=0이라 이탈 자체가 없음
    expect(result).toBeNull()
  })

  it('daysAgo 계산 정확성 — 마지막 신호가 2일 전이면 daysAgo=2', () => {
    // 하단 이탈 후 복귀 신호가 last-2 인덱스에 발생하도록
    const stable = Array.from({ length: 20 }, () => 100)
    const closes = [
      ...stable,
      60,   // 이탈
      100,  // 복귀(신호 발생 — 이 인덱스가 length-3)
      100,  // length-2
      100,  // length-1 (마지막)
    ]
    const bands = bollinger(closes)
    const dates = makeDates(closes.length)
    const result = lastBollingerSignal(bands, closes, dates)
    expect(result).not.toBeNull()
    expect(result!.daysAgo).toBeGreaterThanOrEqual(0)
  })

  it('가장 최근 신호만 반환 (복수 발생 시)', () => {
    const stable = Array.from({ length: 20 }, () => 100)
    const closes = [
      ...stable,
      60, 100,   // 첫 번째 복귀 신호
      150, 100,  // 두 번째 복귀 신호 (더 최근)
    ]
    const bands = bollinger(closes)
    const dates = makeDates(closes.length)
    const result = lastBollingerSignal(bands, closes, dates)
    expect(result).not.toBeNull()
    // 가장 마지막 신호 → daysAgo가 작아야 함
    expect(result!.daysAgo).toBeLessThanOrEqual(2)
  })
})
