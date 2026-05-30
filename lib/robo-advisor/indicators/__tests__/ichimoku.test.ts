import { describe, it, expect } from 'vitest'
import { ichimoku, ichimokuLast } from '../ichimoku'

/** n개의 단순 증가 날짜 생성 (여러 달에 걸쳐 생성) */
function makeDates(n: number): string[] {
  const dates: string[] = []
  let year = 2024, month = 1, day = 1
  const daysPerMonth = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  for (let i = 0; i < n; i++) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    day++
    if (day > daysPerMonth[month]) { day = 1; month++ }
    if (month > 12) { month = 1; year++ }
  }
  return dates
}

/** 길이 n의 상수 가격 배열 */
function flat(n: number, v = 100): number[] {
  return new Array(n).fill(v)
}

describe('ichimoku', () => {
  it('반환 길이 == 입력 길이', () => {
    const n = 80
    const result = ichimoku(flat(n, 105), flat(n, 95), flat(n, 100))
    expect(result).toHaveLength(n)
  })

  it('데이터 부족(n < 9) 시 전부 null', () => {
    const n = 5
    const result = ichimoku(flat(n, 105), flat(n, 95), flat(n, 100))
    expect(result.every((p) =>
      p.tenkan === null && p.kijun === null &&
      p.senkouA === null && p.senkouB === null,
    )).toBe(true)
  })

  it('전환선: 9봉 (최고가+최저가)/2 수기 검증', () => {
    // 고가=105, 저가=95 → tenkan = (105+95)/2 = 100
    const n = 20
    const result = ichimoku(flat(n, 105), flat(n, 95), flat(n, 100))
    // 인덱스 8부터 tenkan이 채워짐
    expect(result[7].tenkan).toBeNull()
    expect(result[8].tenkan).toBeCloseTo(100, 5)
    expect(result[n - 1].tenkan).toBeCloseTo(100, 5)
  })

  it('기준선: 26봉 (최고가+최저가)/2 수기 검증', () => {
    const n = 40
    const result = ichimoku(flat(n, 110), flat(n, 90), flat(n, 100))
    // 인덱스 25까지는 null, 26부터 kijun = (110+90)/2 = 100
    expect(result[24].kijun).toBeNull()
    expect(result[25].kijun).toBeCloseTo(100, 5)
  })

  it('선행스팬1(senkouA) = (tenkan+kijun)/2, +26 변위', () => {
    // 고가=110, 저가=90 → tenkan=100, kijun=100 → senkouA=100
    // 원시값이 인덱스 i에서 유효한 값이 표시 인덱스 i+26에 나타나야 함
    const n = 80
    const highs = flat(n, 110)
    const lows = flat(n, 90)
    const closes = flat(n, 100)
    const result = ichimoku(highs, lows, closes)

    // 앞 26개는 null (변위 전 구간)
    for (let i = 0; i < 26; i++) {
      expect(result[i].senkouA).toBeNull()
    }
    // 인덱스 26 이상은 rawSenkouA[i-26] — 충분한 봉이 있으면 유효값
    // rawSenkouA[0] = null (tenkan 미충족), rawSenkouA[25] = (100+100)/2 = 100
    // 따라서 표시 인덱스 25+26=51 이상에서 senkouA == 100
    expect(result[51].senkouA).toBeCloseTo(100, 5)
    expect(result[n - 1].senkouA).toBeCloseTo(100, 5)
  })

  it('선행스팬2(senkouB) = 52봉 (최고가+최저가)/2, +26 변위', () => {
    const n = 100
    const highs = flat(n, 120)
    const lows = flat(n, 80)
    const closes = flat(n, 100)
    const result = ichimoku(highs, lows, closes)

    // rawSenkouB[51] = (120+80)/2 = 100 → 표시 인덱스 51+26=77에 나타남
    expect(result[76].senkouB).toBeNull()
    expect(result[77].senkouB).toBeCloseTo(100, 5)
  })

  it('후행스팬(chikou) = closes[i+26], 마지막 26개는 null', () => {
    const n = 60
    // 종가를 인덱스에 비례하게 설정
    const closes = Array.from({ length: n }, (_, i) => 1000 + i * 10)
    const result = ichimoku(flat(n, 1200), flat(n, 900), closes)

    // out[i].chikou == closes[i+26]
    for (let i = 0; i < n - 26; i++) {
      expect(result[i].chikou).toBeCloseTo(closes[i + 26], 5)
    }
    // 마지막 26개는 null
    for (let i = n - 26; i < n; i++) {
      expect(result[i].chikou).toBeNull()
    }
  })

  it('상수 입력 시 tenkan == kijun == senkouA == senkouB (유효 구간)', () => {
    const n = 100
    const result = ichimoku(flat(n, 100), flat(n, 100), flat(n, 100))
    const last = result[n - 1]
    expect(last.tenkan).toBeCloseTo(100, 5)
    expect(last.kijun).toBeCloseTo(100, 5)
    expect(last.senkouA).toBeCloseTo(100, 5)
    expect(last.senkouB).toBeCloseTo(100, 5)
  })

  it('가격 다른 구간에서 tenkan ≠ kijun 가능', () => {
    // 처음 26봉은 낮은 범위(고50/저40), 이후 9봉은 높은 범위(고200/저190)
    // tenkan은 최근 9봉 기준이므로 높게, kijun은 26봉 기준으로 낮게 나와야 함
    const n = 40
    const highs = [
      ...new Array(26).fill(50),
      ...new Array(14).fill(200),
    ]
    const lows = [
      ...new Array(26).fill(40),
      ...new Array(14).fill(190),
    ]
    const closes = highs.map((h, i) => (h + lows[i]) / 2)
    const result = ichimoku(highs, lows, closes)
    const last = result[n - 1]
    // tenkan = (200+190)/2 = 195 (최근 9봉 전부 고/저 200/190)
    expect(last.tenkan).toBeCloseTo(195, 5)
    // kijun = max26 고가는 200, min26 저가는 40 → (200+40)/2 = 120
    expect(last.kijun).toBeCloseTo(120, 5)
  })
})

describe('ichimokuLast', () => {
  it('데이터 부족 시 전부 null 반환', () => {
    const result = ichimokuLast([1, 2], [1, 2], [1, 2])
    expect(result.tenkan).toBeNull()
    expect(result.kijun).toBeNull()
    expect(result.senkouA).toBeNull()
    expect(result.senkouB).toBeNull()
  })

  it('충분한 데이터 시 마지막 값 반환', () => {
    const n = 100
    const last = ichimokuLast(flat(n, 110), flat(n, 90), flat(n, 100))
    expect(last.tenkan).toBeCloseTo(100, 5)
    expect(last.kijun).toBeCloseTo(100, 5)
  })
})
