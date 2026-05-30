import { ema } from './ema'

/**
 * Volume Oscillator = (단기 EMA(거래량) − 장기 EMA(거래량)) / 장기 EMA(거래량) × 100.
 *
 * volumes에 null이 포함될 수 있음 (상장 초기, 거래 정지 등).
 * null은 직전 유효값으로 forward-fill해 EMA 연속성을 유지하고,
 * 양쪽 EMA가 모두 유효한 구간만 값을 반환한다.
 *
 * 반환 배열 길이 = 입력 길이. 앞쪽 null 선행 구간 및 long EMA 미확보 구간은 null.
 */
export function volumeOscillator(
  volumes: (number | null)[],
  shortPeriod = 5,
  longPeriod = 20,
): (number | null)[] {
  const result: (number | null)[] = new Array(volumes.length).fill(null)
  if (volumes.length < longPeriod) return result

  // null을 직전 유효값으로 forward-fill (선행 null은 제거 불가 → 해당 인덱스 결과 null)
  const filled: number[] = new Array(volumes.length).fill(0)
  let lastValid: number | null = null
  for (let i = 0; i < volumes.length; i++) {
    if (volumes[i] !== null) {
      lastValid = volumes[i] as number
    }
    filled[i] = lastValid ?? 0
  }

  const shortEma = ema(filled, shortPeriod)
  const longEma = ema(filled, longPeriod)

  for (let i = 0; i < volumes.length; i++) {
    const s = shortEma[i]
    const l = longEma[i]
    if (s === null || l === null || l === 0) continue

    // 선행 null 구간(첫 유효 거래량 이전)은 결과도 null 처리
    // forward-fill 후 filled[i] = 0이면 원래 데이터가 없는 구간
    if (filled[i] === 0 && volumes[i] === null) {
      // filled가 0이고 원 데이터도 null이면 선행 결측 구간
      // 그러나 0 거래량인 실제 데이터도 있으므로 선행 null만 구분
      let hasValidBefore = false
      for (let j = 0; j <= i; j++) {
        if (volumes[j] !== null) { hasValidBefore = true; break }
      }
      if (!hasValidBefore) continue
    }

    result[i] = (s - l) / l * 100
  }

  return result
}

/** 마지막 Volume Oscillator 값. 데이터 부족 시 null. */
export function volumeOscillatorLast(
  volumes: (number | null)[],
  shortPeriod = 5,
  longPeriod = 20,
): number | null {
  const arr = volumeOscillator(volumes, shortPeriod, longPeriod)
  return arr[arr.length - 1] ?? null
}
