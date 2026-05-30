/**
 * 일목균형표 (Ichimoku Kinko Hyo).
 *
 * 반환 배열 길이 = 입력 길이. 워밍업·경계 구간은 null.
 *
 * 스팬 변위 정책:
 *  - senkouA/B: 원시값을 +displacement 인덱스에 배치(선행 표시).
 *    선행 26일 구름(마지막 26개 원시값이 축 너머로 투영되는 부분)은
 *    공유 master 시간축 확장을 피하기 위해 의도적으로 미표시.
 *  - chikou: 현재 종가를 -displacement 인덱스에 배치(후행 표시).
 */

export interface IchimokuPoint {
  tenkan: number | null   // 전환선 (기본 9)
  kijun: number | null    // 기준선 (기본 26)
  senkouA: number | null  // 선행스팬1 — 이미 +26 변위된 표시 인덱스 값
  senkouB: number | null  // 선행스팬2 — 이미 +26 변위된 표시 인덱스 값
  chikou: number | null   // 후행스팬  — 이미 -26 변위된 표시 인덱스 값
}

export interface IchimokuParams {
  tenkanPeriod?: number   // 기본 9
  kijunPeriod?: number    // 기본 26
  senkouBPeriod?: number  // 기본 52
  displacement?: number   // 기본 26
}

/**
 * i봉을 끝으로 하는 period봉 구간의 (최고가 + 최저가) / 2.
 * i < period-1 이면 null.
 */
function donchianMid(
  highs: number[],
  lows: number[],
  i: number,
  period: number,
): number | null {
  if (i < period - 1) return null
  let maxH = -Infinity, minL = Infinity
  for (let j = i - period + 1; j <= i; j++) {
    if (highs[j] > maxH) maxH = highs[j]
    if (lows[j] < minL) minL = lows[j]
  }
  return (maxH + minL) / 2
}

export function ichimoku(
  highs: number[],
  lows: number[],
  closes: number[],
  params?: IchimokuParams,
): IchimokuPoint[] {
  const tenkanPeriod = params?.tenkanPeriod ?? 9
  const kijunPeriod = params?.kijunPeriod ?? 26
  const senkouBPeriod = params?.senkouBPeriod ?? 52
  const displacement = params?.displacement ?? 26

  const n = closes.length
  const result: IchimokuPoint[] = Array.from({ length: n }, () => ({
    tenkan: null, kijun: null, senkouA: null, senkouB: null, chikou: null,
  }))

  if (n === 0) return result

  // 원시 전환선·기준선·선행스팬 계산
  const rawTenkan: (number | null)[] = new Array(n).fill(null)
  const rawKijun: (number | null)[] = new Array(n).fill(null)
  const rawSenkouA: (number | null)[] = new Array(n).fill(null)
  const rawSenkouB: (number | null)[] = new Array(n).fill(null)

  for (let i = 0; i < n; i++) {
    const t = donchianMid(highs, lows, i, tenkanPeriod)
    const k = donchianMid(highs, lows, i, kijunPeriod)
    rawTenkan[i] = t
    rawKijun[i] = k
    rawSenkouA[i] = t !== null && k !== null ? (t + k) / 2 : null
    rawSenkouB[i] = donchianMid(highs, lows, i, senkouBPeriod)
  }

  for (let i = 0; i < n; i++) {
    // 전환선·기준선: 그대로 표시
    result[i].tenkan = rawTenkan[i]
    result[i].kijun = rawKijun[i]

    // 선행스팬: i - displacement 위치의 원시값을 현재 인덱스에 배치
    const srcIdx = i - displacement
    if (srcIdx >= 0) {
      result[i].senkouA = rawSenkouA[srcIdx]
      result[i].senkouB = rawSenkouB[srcIdx]
    }

    // 후행스팬: i + displacement 위치의 종가를 현재 인덱스에 배치
    const chiIdx = i + displacement
    result[i].chikou = chiIdx < n ? closes[chiIdx] : null
  }

  return result
}

/** 최신 일목균형표 한 점 (배지·요약 표시용). */
export function ichimokuLast(
  highs: number[],
  lows: number[],
  closes: number[],
  params?: IchimokuParams,
): IchimokuPoint {
  const arr = ichimoku(highs, lows, closes, params)
  return arr[arr.length - 1] ?? {
    tenkan: null, kijun: null, senkouA: null, senkouB: null, chikou: null,
  }
}
