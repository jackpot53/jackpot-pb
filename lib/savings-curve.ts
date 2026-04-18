import {
  computeCurrentSavingsValueKrw,
  generateVirtualRecurringBuys,
  type SavingsBuy,
  type SavingsDetails,
} from '@/lib/savings'

export interface SavingsCurvePoint {
  date: string      // 'YYYY-MM-DD'
  value: number     // KRW
  projected: boolean
}

/**
 * 예적금 평가금 시계열 생성.
 * 가입 시작일 ~ 만기일(없으면 today)을 월 단위로 샘플링한다.
 * - today 이하: projected=false (실선)
 * - today 초과: projected=true (점선, maturityDate가 있을 때만)
 */
export function buildSavingsCurvePoints({
  buys: rawBuys,
  details,
  today = new Date(),
}: {
  buys: SavingsBuy[]
  details: SavingsDetails
  today?: Date
}): SavingsCurvePoint[] {
  const { kind, depositStartDate, maturityDate, monthlyContributionKrw } = details

  // 시작일 결정: 가장 빠른 납입일 또는 depositStartDate
  const startStr =
    rawBuys.length > 0
      ? rawBuys.reduce((min, b) => (b.transactionDate < min ? b.transactionDate : min), rawBuys[0].transactionDate)
      : depositStartDate

  if (!startStr) return []

  const todayStr = toDateStr(today)
  const endStr = maturityDate ?? todayStr

  // 샘플 날짜 목록: start ~ end (월 단위, 종료일 포함)
  const sampleDates = monthSamples(startStr, endStr)

  const points: SavingsCurvePoint[] = sampleDates.map(dateStr => {
    const asOf = parseLocalDate(dateStr)

    // 정기적금이면 가상 납입 생성 (실제 buys 없는 경우 커버)
    const buys: SavingsBuy[] =
      kind === 'recurring' && monthlyContributionKrw && depositStartDate
        ? generateVirtualRecurringBuys({ depositStartDate, monthlyContributionKrw, asOf })
        : rawBuys

    const value = computeCurrentSavingsValueKrw({ ...details, interestRateBp: details.interestRateBp ?? 0, buys, asOf })

    return { date: dateStr, value, projected: dateStr > todayStr }
  })

  return points
}

// ─── helpers ────────────────────────────────────────────────────────────────

/** 'YYYY-MM-DD' → 로컬 자정 Date (UTC 기준 new Date('YYYY-MM-DD')는 UTC 00:00 = KST 09:00이라 하루 밀림) */
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** startStr ~ endStr (inclusive) 의 월별 샘플 날짜 배열 */
function monthSamples(startStr: string, endStr: string): string[] {
  const dates: string[] = []
  const [sy, sm] = startStr.split('-').map(Number)
  const [ey, em] = endStr.split('-').map(Number)

  let y = sy, m = sm
  while (y < ey || (y === ey && m <= em)) {
    const mm = String(m).padStart(2, '0')
    const candidate = `${y}-${mm}-01`
    // 시작 월: 실제 시작일 사용, 이후는 1일
    const dateStr = (y === sy && m === sm) ? startStr : candidate
    if (dateStr <= endStr) dates.push(dateStr)
    m++
    if (m > 12) { m = 1; y++ }
  }

  // 종료일이 마지막 샘플과 다르면 추가
  if (dates.length === 0 || dates[dates.length - 1] !== endStr) {
    dates.push(endStr)
  }

  return dates
}
