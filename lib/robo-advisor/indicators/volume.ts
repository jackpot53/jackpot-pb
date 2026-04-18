/**
 * 거래량 관련 지표.
 * volumes 배열에 null이 포함될 수 있음 (상장 초기, 거래 정지 등).
 */

/** N일 평균 거래량. null이 포함된 구간은 건너뜀. */
export function avgVolume(
  volumes: (number | null)[],
  period = 20,
): (number | null)[] {
  const result: (number | null)[] = new Array(volumes.length).fill(null)
  if (volumes.length < period) return result

  for (let i = period - 1; i < volumes.length; i++) {
    const slice = volumes.slice(i - period + 1, i + 1)
    const valid = slice.filter((v): v is number => v !== null)
    // 유효 데이터가 period의 절반 미만이면 신뢰도 낮아 null 반환
    if (valid.length < Math.ceil(period / 2)) continue
    result[i] = valid.reduce((a, b) => a + b, 0) / valid.length
  }

  return result
}

/** 마지막 N일 평균 거래량. */
export function avgVolumeLast(
  volumes: (number | null)[],
  period = 20,
): number | null {
  const arr = avgVolume(volumes, period)
  return arr[arr.length - 1] ?? null
}

/**
 * 거래량 급증 배수: 오늘 거래량 / N일 평균.
 * 오늘 거래량이 null이거나 평균이 0이면 null.
 */
export function volumeRatio(
  volumes: (number | null)[],
  period = 20,
): number | null {
  if (volumes.length === 0) return null
  const today = volumes[volumes.length - 1]
  if (today === null || today === 0) return null

  // 평균은 오늘을 제외한 이전 period 일로 계산
  const prevVolumes = volumes.slice(0, -1)
  const prevAvg = avgVolumeLast(prevVolumes, period)
  if (prevAvg === null || prevAvg === 0) return null

  return today / prevAvg
}
