import { kisGet } from './client'

export interface FinancialPoint {
  period: string           // 라벨용: '24Q1' | '2024'
  date: string             // 'YYYY-MM-DD' 분기말/연말 (lightweight-charts time 키)
  revenue: number | null        // 매출액 (백만원)
  operatingProfit: number | null // 영업이익 (백만원)
  netIncome: number | null       // 당기순이익 (백만원)
  isEstimate: boolean            // true = KIS 추정실적
}

function parseNum(s: string | undefined): number | null {
  if (!s) return null
  const n = Number(s.replace(/,/g, '').trim())
  return isNaN(n) ? null : n
}

// 월별 말일 (결산월 → date 합성용)
const MONTH_END: Record<string, string> = {
  '01': '31', '02': '28', '03': '31', '04': '30',
  '05': '31', '06': '30', '07': '31', '08': '31',
  '09': '30', '10': '31', '11': '30', '12': '31',
}

// stac_yymm '202312' → { date: '2023-12-31', period: '23Q4' }  (분기)
// stac_yymm '202312' → { date: '2023-12-31', period: '2023' }  (연간)
// 연간은 stac_yymm의 실제 결산월을 사용 (3월, 6월 결산 기업 대응)
function parsePeriod(yyyymm: string, isQuarter: boolean): { date: string; period: string } | null {
  if (!yyyymm || yyyymm.length !== 6) return null
  const year = yyyymm.slice(0, 4)
  const month = yyyymm.slice(4, 6)
  const lastDay = MONTH_END[month] ?? '31'

  if (!isQuarter) {
    return { date: `${year}-${month}-${lastDay}`, period: year }
  }

  // 결산월 → 분기말/라벨 매핑 (한국 일반 회계연도: 1~3월=Q1, 4~6월=Q2, 7~9월=Q3, 10~12월=Q4)
  const map: Record<string, { q: string }> = {
    '03': { q: 'Q1' }, '06': { q: 'Q2' }, '09': { q: 'Q3' }, '12': { q: 'Q4' },
  }
  const entry = map[month]
  if (!entry) return null
  return { date: `${year}-${month}-${lastDay}`, period: `${year.slice(2)}${entry.q}` }
}

/**
 * KIS 국내주식 손익계산서 (FHKST66430200) 조회.
 * 필드 검증 완료: stac_yymm / sale_account / bsop_prti / thtr_ntin
 */
async function fetchIncomeStatement(code: string, isQuarter: boolean): Promise<FinancialPoint[]> {
  const res = await kisGet(
    '/uapi/domestic-stock/v1/finance/income-statement',
    {
      FID_DIV_CLS_CODE: isQuarter ? '1' : '0',
      fid_cond_mrkt_div_code: 'J',
      fid_input_iscd: code,
    },
    'FHKST66430200',
  )
  if (!res || !res.ok) {
    console.error('[kis] income-statement fetch failed, status:', res?.status)
    return []
  }

  const json = await res.json()
  if (json.rt_cd !== '0') {
    console.error('[kis] income-statement API error:', json.msg1)
    return []
  }

  const rows: Record<string, string>[] = json.output ?? []
  const points: FinancialPoint[] = []

  for (const row of rows) {
    const parsed = parsePeriod(row.stac_yymm ?? '', isQuarter)
    if (!parsed) continue
    points.push({
      period: parsed.period,
      date: parsed.date,
      revenue: parseNum(row.sale_account),
      operatingProfit: parseNum(row.bsop_prti),
      netIncome: parseNum(row.thtr_ntin),
      isEstimate: false,
    })
  }

  // KIS 응답은 최신 순 — 차트용으로 오름차순 정렬
  points.sort((a, b) => a.date.localeCompare(b.date))
  return points
}

/**
 * KIS 국내주식 종목추정실적 (HHKST668300C0) — 연간 전용.
 *
 * 피벗 구조:
 *   output4[i].dt   → 결산년월 ("2023.12" | "2024.12E"), E 접미사 = 추정
 *   output2 행 순서 → [0]=매출액, [2]=영업이익, [4]=순이익 (고정)
 *   컬럼 data1~data5 → output4[0]~output4[4] 대응
 *
 * 분기 모드에서는 연간 추정 데이터가 의미없으므로 빈 배열 반환.
 */
async function fetchEstimatePerform(code: string, isQuarter: boolean): Promise<FinancialPoint[]> {
  if (isQuarter) return []

  const res = await kisGet(
    '/uapi/domestic-stock/v1/quotations/estimate-perform',
    { SHT_CD: code },
    'HHKST668300C0',
  )
  if (!res || !res.ok) {
    console.error('[kis] estimate-perform fetch failed, status:', res?.status)
    return []
  }

  try {
    const json = await res.json()
    if (json.rt_cd !== '0') {
      console.error('[kis] estimate-perform API error:', json.msg1)
      return []
    }

    const periods: Array<{ dt: string }> = json.output4 ?? []
    const incomeRows: Array<Record<string, string>> = json.output2 ?? []

    // 피벗 행: [0]=매출액, [2]=영업이익, [4]=순이익
    if (periods.length === 0 || incomeRows.length < 5) return []

    const revenueRow = incomeRows[0]
    const opProfitRow = incomeRows[2]
    const netIncomeRow = incomeRows[4]

    const points: FinancialPoint[] = []

    for (let i = 0; i < Math.min(periods.length, 5); i++) {
      const dt = periods[i]?.dt ?? ''
      if (!dt) continue

      // "2023.12E" → isEstimate=true, cleanDt="2023.12"
      const isEstimate = dt.endsWith('E') || dt.endsWith('e')
      const cleanDt = isEstimate ? dt.slice(0, -1) : dt  // "2023.12"
      const dotIdx = cleanDt.indexOf('.')
      if (dotIdx < 0) continue

      const year = cleanDt.slice(0, dotIdx)                    // "2023"
      const month = cleanDt.slice(dotIdx + 1).padStart(2, '0') // "12"
      if (!year || !month) continue

      const lastDay = MONTH_END[month] ?? '31'
      const date = `${year}-${month}-${lastDay}`

      const dataKey = `data${i + 1}`

      points.push({
        period: year,
        date,
        revenue: parseNum(revenueRow[dataKey]),
        operatingProfit: parseNum(opProfitRow[dataKey]),
        netIncome: parseNum(netIncomeRow[dataKey]),
        isEstimate,
      })
    }

    points.sort((a, b) => a.date.localeCompare(b.date))
    return points
  } catch (err) {
    console.error('[kis] estimate-perform parse error:', err)
    return []
  }
}

/**
 * 국내주식 분기/연간 실적 조회 (과거 손익계산서 + 미래 추정실적).
 *
 * - 분기: 손익계산서 분기 데이터만 (추정 없음)
 * - 연간: 손익계산서 연간 데이터 + 추정실적 미래 구간 병합
 *
 * @param code      6자리 종목코드 (예: '005930')
 * @param period    'quarter' | 'annual'
 * @returns FinancialPoint[] (날짜 오름차순) | null (데이터 없음)
 */
export async function fetchKisFinancials(
  code: string,
  period: 'quarter' | 'annual',
): Promise<FinancialPoint[] | null> {
  const isQuarter = period === 'quarter'

  const [actualResult, estimateResult] = await Promise.allSettled([
    fetchIncomeStatement(code, isQuarter),
    fetchEstimatePerform(code, isQuarter),
  ])

  const actual = actualResult.status === 'fulfilled' ? actualResult.value : []
  const estimated = estimateResult.status === 'fulfilled' ? estimateResult.value : []

  if (actual.length === 0 && estimated.length === 0) return null

  // 날짜 중복 시 확정 실적 우선 (손익계산서가 추정보다 정확)
  const actualDates = new Set(actual.map(p => p.date))
  const uniqueEstimated = estimated.filter(p => !actualDates.has(p.date))

  const merged = [...actual, ...uniqueEstimated]
  merged.sort((a, b) => a.date.localeCompare(b.date))
  return merged
}
