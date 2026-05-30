import { kisGet } from './client'

// app/api/investor-flow/route.ts의 InvestorFlowPoint와 동일한 구조 (구조적 타입 호환)
export interface InvestorFlowPoint {
  date: string         // 'YYYY-MM-DD'
  institution: number  // 기관 순매수량 (주)
  foreign: number      // 외국인 순매수량 (주)
  individual: number   // 개인 순매수량 (주)
}

function rangeToStartDate(range: string): Date {
  const d = new Date()
  if (range === '5y') d.setFullYear(d.getFullYear() - 5)
  else if (range === '3y') d.setFullYear(d.getFullYear() - 3)
  else d.setFullYear(d.getFullYear() - 1) // default 1y
  return d
}

function toKisDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

function parseKisDate(s: string): string {
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

const CHUNK_DAYS = 140  // 호출당 ~100 영업일

/**
 * KIS 국내주식 기간별 투자자 매매 순매수 조회.
 *
 * @param code   6자리 종목코드 (예: '005930')
 * @param range  '1y' | '3y' | '5y'
 * @returns InvestorFlowPoint[] (오름차순) | null (실패)
 */
export async function fetchKisInvestorFlow(
  code: string,
  range: string,
): Promise<InvestorFlowPoint[] | null> {
  const startDate = rangeToStartDate(range)

  const accumulated: InvestorFlowPoint[] = []
  let windowEnd = new Date()

  while (windowEnd > startDate) {
    const windowStart = new Date(
      Math.max(startDate.getTime(), windowEnd.getTime() - CHUNK_DAYS * 24 * 60 * 60 * 1000),
    )

    const res = await kisGet(
      '/uapi/domestic-stock/v1/quotations/inquire-investor',
      {
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: code,
        FID_INPUT_DATE_1: toKisDate(windowStart),
        FID_INPUT_DATE_2: toKisDate(windowEnd),
      },
      'FHKST01010900',
    )

    if (!res || !res.ok) {
      console.error('[kis] investor-flow fetch failed, status:', res?.status)
      break
    }

    const json = await res.json()
    if (json.rt_cd !== '0') {
      console.error('[kis] investor-flow API error:', json.msg1)
      break
    }

    const rows: Record<string, string>[] = json.output ?? []
    if (rows.length === 0) break

    for (const row of rows) {
      const dateRaw = row.stck_bsop_date
      if (!dateRaw || dateRaw.length !== 8) continue
      const institution = parseInt(row.orgn_ntby_qty ?? '0', 10)
      const foreign = parseInt(row.frgn_ntby_qty ?? '0', 10)
      const individual = parseInt(row.prsn_ntby_qty ?? '0', 10)
      accumulated.push({
        date: parseKisDate(dateRaw),
        institution: isNaN(institution) ? 0 : institution,
        foreign: isNaN(foreign) ? 0 : foreign,
        individual: isNaN(individual) ? 0 : individual,
      })
    }

    const oldestDateRaw = rows[rows.length - 1]?.stck_bsop_date
    if (!oldestDateRaw) break
    const oldest = new Date(parseKisDate(oldestDateRaw))
    oldest.setDate(oldest.getDate() - 1)
    if (oldest >= windowEnd) break
    windowEnd = oldest
  }

  if (accumulated.length === 0) return null

  const seen = new Set<string>()
  const unique = accumulated.filter((p) => {
    if (seen.has(p.date)) return false
    seen.add(p.date)
    return true
  })
  unique.sort((a, b) => a.date.localeCompare(b.date))
  return unique
}
