import { describe, it, expect } from 'vitest'
import {
  detectTradingValueFlow,
  detectTradingValueFlows,
  lastTradingValueFlowFromEvents,
  cumulativeValueFlow,
  cumulativeValueFlowRolling,
} from '../trading-value-flow'
import type { OhlcPoint } from '@/lib/price/sparkline'

function makeOhlc(
  closes: number[],
  volumes: (number | null)[],
  opens?: number[],
): OhlcPoint[] {
  return closes.map((c, i) => ({
    date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
    open: opens ? opens[i] : c,
    high: c + 5,
    low: c - 5,
    close: c,
    volume: volumes[i] ?? null,
  }))
}

// 22개 ohlc: 이전 21일 평균 거래대금 100억, 오늘 250억 (2.5배) + 2% 이상 상승
function makeBuySignalOhlc(): OhlcPoint[] {
  const BASE_PRICE = 10_000
  const BASE_VOLUME = 10_000  // 10000 × 10000 = 1억 거래대금
  const closes = [...new Array(21).fill(BASE_PRICE), BASE_PRICE * 1.025]
  const volumes: (number | null)[] = [...new Array(21).fill(BASE_VOLUME), BASE_VOLUME * 2.5]
  return makeOhlc(closes, volumes)
}

describe('detectTradingValueFlow', () => {
  it('데이터 부족 시 false', () => {
    const ohlc = makeOhlc([10000, 10200], [1000, 3000])
    expect(detectTradingValueFlow(ohlc)).toBe(false)
  })

  it('거래대금 2배 이상 + 2% 상승 → true', () => {
    expect(detectTradingValueFlow(makeBuySignalOhlc())).toBe(true)
  })

  it('거래대금 2배지만 가격 상승 미달 → false', () => {
    const BASE_PRICE = 10_000
    const closes = [...new Array(21).fill(BASE_PRICE), BASE_PRICE * 1.01]
    const volumes: (number | null)[] = [...new Array(21).fill(10_000), 25_000]
    expect(detectTradingValueFlow(makeOhlc(closes, volumes))).toBe(false)
  })

  it('거래대금 2배 + 2% 하락 → true (매도 시그널도 감지)', () => {
    const BASE_PRICE = 10_000
    const closes = [...new Array(21).fill(BASE_PRICE), BASE_PRICE * 0.975]
    const volumes: (number | null)[] = [...new Array(21).fill(10_000), 25_000]
    expect(detectTradingValueFlow(makeOhlc(closes, volumes))).toBe(true)
  })

  it('오늘 volume null → false', () => {
    const BASE_PRICE = 10_000
    const closes = [...new Array(21).fill(BASE_PRICE), BASE_PRICE * 1.025]
    const volumes: (number | null)[] = [...new Array(21).fill(10_000), null]
    expect(detectTradingValueFlow(makeOhlc(closes, volumes))).toBe(false)
  })
})

describe('detectTradingValueFlows', () => {
  it('데이터 부족 시 빈 배열', () => {
    const ohlc = makeOhlc([10000, 10200], [1000, 3000])
    expect(detectTradingValueFlows(ohlc)).toHaveLength(0)
  })

  it('매수 시그널 이벤트 반환', () => {
    const events = detectTradingValueFlows(makeBuySignalOhlc())
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('buy')
    expect(events[0].ratio).toBeGreaterThanOrEqual(2)
    expect(events[0].value).toBeGreaterThan(0)
  })

  it('매도 시그널 이벤트 반환', () => {
    const BASE_PRICE = 10_000
    const closes = [...new Array(21).fill(BASE_PRICE), BASE_PRICE * 0.975]
    const volumes: (number | null)[] = [...new Array(21).fill(10_000), 25_000]
    const events = detectTradingValueFlows(makeOhlc(closes, volumes))
    expect(events[0].type).toBe('sell')
  })
})

describe('lastTradingValueFlowFromEvents', () => {
  it('이벤트 없으면 null', () => {
    const ohlc = makeBuySignalOhlc()
    expect(lastTradingValueFlowFromEvents([], ohlc)).toBeNull()
  })

  it('마지막 이벤트의 daysAgo 계산', () => {
    const ohlc = makeBuySignalOhlc()
    const events = detectTradingValueFlows(ohlc)
    const last = lastTradingValueFlowFromEvents(events, ohlc)
    expect(last).not.toBeNull()
    expect(last!.daysAgo).toBe(0)  // 마지막 일자가 시그널
  })
})

describe('cumulativeValueFlow', () => {
  it('빈 배열이면 빈 배열', () => {
    expect(cumulativeValueFlow([])).toEqual([])
  })

  it('첫 번째 값은 0 (기준점)', () => {
    const ohlc = makeOhlc([10000, 10200], [1000, 2000])
    const result = cumulativeValueFlow(ohlc)
    expect(result[0]).toBe(0)
  })

  it('상승일 거래대금 누적', () => {
    // day0=기준, day1=상승 → +TV, day2=하락 → -TV
    const ohlc = makeOhlc([10000, 11000, 10500], [1000, 2000, 1500])
    const result = cumulativeValueFlow(ohlc)
    expect(result[0]).toBe(0)
    expect(result[1]).toBeCloseTo(11000 * 2000, 0)   // +22,000,000
    expect(result[2]).toBeCloseTo(11000 * 2000 - 10500 * 1500, 0)  // -15,750,000
  })

  it('volume null인 날은 누적값 변화 없음', () => {
    const ohlc = makeOhlc([10000, 11000, 12000], [1000, null, 2000])
    const result = cumulativeValueFlow(ohlc)
    expect(result[1]).toBeNull()
    // result[2]는 day1 null을 건너뛰고 day2만 누적
    expect(result[2]).toBeCloseTo(12000 * 2000, 0)
  })
})

describe('cumulativeValueFlowRolling', () => {
  it('빈 배열이면 빈 배열', () => {
    expect(cumulativeValueFlowRolling([])).toEqual([])
  })

  it('첫 번째 요소는 null (이전 종가 없음)', () => {
    const ohlc = makeOhlc([10000, 11000], [1000, 2000])
    const result = cumulativeValueFlowRolling(ohlc, 60)
    expect(result[0]).toBeNull()
  })

  it('window보다 짧은 기간에서도 합산', () => {
    const ohlc = makeOhlc([10000, 11000, 12000], [1000, 2000, 3000])
    const result = cumulativeValueFlowRolling(ohlc, 60)
    // day1: +11000×2000, day2: +12000×3000
    expect(result[1]).toBeCloseTo(22_000_000, 0)
    expect(result[2]).toBeCloseTo(22_000_000 + 36_000_000, 0)
  })

  it('window 경계 이전은 포함하지 않음', () => {
    // window=2 → result[2] = day1 + day2만
    const ohlc = makeOhlc([10000, 11000, 12000, 13000], [1000, 2000, 3000, 4000])
    const result = cumulativeValueFlowRolling(ohlc, 2)
    // day3: window=2 → day2 + day3 = +36M + 52M
    expect(result[3]).toBeCloseTo(12000 * 3000 + 13000 * 4000, 0)
  })
})
