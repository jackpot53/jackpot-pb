export type MaPair = '5/20' | '20/60'
export type MaCrossEvent = { date: string; type: 'golden' | 'dead'; pair: MaPair }

/**
 * 미리 계산된 fast/slow SMA 배열과 날짜로 골든/데드 크로스 이벤트를 반환한다.
 * sma()를 외부에서 한 번만 호출하고 결과를 재사용할 때 사용.
 *
 * 골든 크로스: 전일 fast ≤ slow → 당일 fast > slow (상향 돌파)
 * 데드 크로스: 전일 fast ≥ slow → 당일 fast < slow (하향 돌파)
 */
export function detectMaCrossesFromSma(
  fast: (number | null)[],
  slow: (number | null)[],
  dates: string[],
  pair: MaPair,
): MaCrossEvent[] {
  const crosses: MaCrossEvent[] = []
  for (let i = 1; i < fast.length; i++) {
    const prevFast = fast[i - 1]
    const prevSlow = slow[i - 1]
    const currFast = fast[i]
    const currSlow = slow[i]
    if (prevFast === null || prevSlow === null || currFast === null || currSlow === null) continue
    if (prevFast <= prevSlow && currFast > currSlow) {
      crosses.push({ date: dates[i], type: 'golden', pair })
    } else if (prevFast >= prevSlow && currFast < currSlow) {
      crosses.push({ date: dates[i], type: 'dead', pair })
    }
  }
  return crosses
}

/**
 * 미리 계산된 SMA 배열에서 가장 최근 크로스 한 건을 반환한다.
 * daysAgo는 fast 배열 마지막 인덱스 기준 영업일 수.
 */
export function lastMaCrossFromSma(
  fast: (number | null)[],
  slow: (number | null)[],
  dates: string[],
  pair: MaPair,
): { type: 'golden' | 'dead'; date: string; daysAgo: number; pair: MaPair } | null {
  let last: { type: 'golden' | 'dead'; date: string; daysAgo: number; pair: MaPair } | null = null
  for (let i = 1; i < fast.length; i++) {
    const prevFast = fast[i - 1]
    const prevSlow = slow[i - 1]
    const currFast = fast[i]
    const currSlow = slow[i]
    if (prevFast === null || prevSlow === null || currFast === null || currSlow === null) continue
    if (prevFast <= prevSlow && currFast > currSlow) {
      last = { type: 'golden', date: dates[i], daysAgo: fast.length - 1 - i, pair }
    } else if (prevFast >= prevSlow && currFast < currSlow) {
      last = { type: 'dead', date: dates[i], daysAgo: fast.length - 1 - i, pair }
    }
  }
  return last
}
