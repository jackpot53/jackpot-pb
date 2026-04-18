/**
 * ADX (Average Directional Index) with Wilder smoothing.
 *
 * +DM = max(High - PrevHigh, 0) if > (PrevLow - Low), else 0
 * -DM = max(PrevLow - Low, 0)  if > (High - PrevHigh), else 0
 * TR  = max(High-Low, |High-PrevClose|, |Low-PrevClose|)
 * +DI = 100 × Wilder(+DM, period) / Wilder(TR, period)
 * -DI = 100 × Wilder(-DM, period) / Wilder(TR, period)
 * DX  = 100 × |+DI - -DI| / (+DI + -DI)
 * ADX = Wilder(DX, period)
 */

export interface AdxPoint {
  adx: number | null
  diPlus: number | null
  diMinus: number | null
}

export function adx(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): AdxPoint[] {
  const len = Math.min(highs.length, lows.length, closes.length)
  const result: AdxPoint[] = Array.from({ length: len }, () => ({
    adx: null, diPlus: null, diMinus: null,
  }))

  // ADX 계산에는 최소 2*period + 1 개의 데이터 필요
  if (len < 2 * period + 1) return result

  // 1) 일별 +DM, -DM, TR 계산
  const dmPlus: number[] = new Array(len).fill(0)
  const dmMinus: number[] = new Array(len).fill(0)
  const trArr: number[] = new Array(len).fill(0)

  for (let i = 1; i < len; i++) {
    const upMove = highs[i] - highs[i - 1]
    const downMove = lows[i - 1] - lows[i]

    dmPlus[i] = upMove > downMove && upMove > 0 ? upMove : 0
    dmMinus[i] = downMove > upMove && downMove > 0 ? downMove : 0

    const hl = highs[i] - lows[i]
    const hc = Math.abs(highs[i] - closes[i - 1])
    const lc = Math.abs(lows[i] - closes[i - 1])
    trArr[i] = Math.max(hl, hc, lc)
  }

  // 2) Wilder 초기값 (인덱스 1 ~ period 의 합)
  let smoothDmPlus = 0, smoothDmMinus = 0, smoothTr = 0
  for (let i = 1; i <= period; i++) {
    smoothDmPlus += dmPlus[i]
    smoothDmMinus += dmMinus[i]
    smoothTr += trArr[i]
  }

  const calcDI = (smoothDm: number, smoothTrVal: number) =>
    smoothTrVal !== 0 ? (100 * smoothDm) / smoothTrVal : 0

  // 3) +DI, -DI, DX 배열
  const diPlusArr: number[] = new Array(len).fill(0)
  const diMinusArr: number[] = new Array(len).fill(0)
  const dxArr: number[] = new Array(len).fill(0)

  const firstDiIdx = period
  diPlusArr[firstDiIdx] = calcDI(smoothDmPlus, smoothTr)
  diMinusArr[firstDiIdx] = calcDI(smoothDmMinus, smoothTr)
  const diSum = diPlusArr[firstDiIdx] + diMinusArr[firstDiIdx]
  dxArr[firstDiIdx] = diSum !== 0
    ? (100 * Math.abs(diPlusArr[firstDiIdx] - diMinusArr[firstDiIdx])) / diSum
    : 0

  for (let i = period + 1; i < len; i++) {
    // Wilder 스무딩: smoothed = prev - prev/period + current
    smoothDmPlus = smoothDmPlus - smoothDmPlus / period + dmPlus[i]
    smoothDmMinus = smoothDmMinus - smoothDmMinus / period + dmMinus[i]
    smoothTr = smoothTr - smoothTr / period + trArr[i]

    diPlusArr[i] = calcDI(smoothDmPlus, smoothTr)
    diMinusArr[i] = calcDI(smoothDmMinus, smoothTr)

    const dSum = diPlusArr[i] + diMinusArr[i]
    dxArr[i] = dSum !== 0
      ? (100 * Math.abs(diPlusArr[i] - diMinusArr[i])) / dSum
      : 0
  }

  // 4) ADX = Wilder smoothing of DX over period (시작: index = 2*period)
  let adxVal = 0
  for (let i = period; i < 2 * period; i++) adxVal += dxArr[i]
  adxVal /= period

  const adxStart = 2 * period - 1
  result[adxStart] = { adx: adxVal, diPlus: diPlusArr[adxStart], diMinus: diMinusArr[adxStart] }

  for (let i = adxStart + 1; i < len; i++) {
    adxVal = (adxVal * (period - 1) + dxArr[i]) / period
    result[i] = { adx: adxVal, diPlus: diPlusArr[i], diMinus: diMinusArr[i] }
  }

  return result
}

/** 마지막 ADX 포인트. */
export function adxLast(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): AdxPoint {
  const arr = adx(highs, lows, closes, period)
  return arr[arr.length - 1] ?? { adx: null, diPlus: null, diMinus: null }
}
