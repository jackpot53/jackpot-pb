import { kisGet } from './client'

export interface ShortSellingPoint {
  date: string        // 'YYYY-MM-DD'
  shortVolume: number // 공매도 체결 수량 (주)
  shortValue: number  // 공매도 체결 대금 (원)
  totalVolume: number // 전체 거래량 (주)  — 주봉/월봉 비중 재계산에 사용
  totalValue: number  // 전체 거래대금 (원) — 주봉/월봉 비중 재계산에 사용
  shortRatio: number  // 공매도 거래량 비중 (%) = shortVolume / totalVolume × 100
}

function rangeToStartDate(range: string): Date {
  const d = new Date()
  if (range === '5y') d.setFullYear(d.getFullYear() - 5)
  else if (range === '3y') d.setFullYear(d.getFullYear() - 3)
  else d.setFullYear(d.getFullYear() - 1)
  return d
}

function toKisDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

function parseKisDate(s: string): string {
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

const CHUNK_DAYS = 140

// KIS 공매도 일별 조회 엔드포인트.
// tr_id FHPST04830000, output 필드:
//   stck_bsop_date - 날짜 (YYYYMMDD)
//   ssts_cntg_qty  - 공매도 체결 수량
//   ssts_cntg_pbmn - 공매도 체결 대금
//   stnd_vol       - 기준 거래량 (전체)
//   stnd_pbmn      - 기준 거래대금 (전체)
//   ssts_vol_rlim  - 공매도 거래량 비중 (%)
const KIS_PATH = '/uapi/domestic-stock/v1/quotations/inquire-short-sale'
const TR_ID = 'FHPST04830000'

interface DebugResult {
  data: ShortSellingPoint[] | null
  debug: {
    rtCd?: string
    msg1?: string
    responseKeys?: string
    httpStatus?: number
    firstRow?: Record<string, string>
  }
}

/** 로컬 테스트용: 디버그 정보 포함 반환 버전 */
export async function fetchKisShortSellingDebug(
  code: string,
  range: string,
): Promise<DebugResult> {
  const startDate = rangeToStartDate(range)
  const windowEnd = new Date()
  const windowStart = new Date(
    Math.max(startDate.getTime(), windowEnd.getTime() - CHUNK_DAYS * 24 * 60 * 60 * 1000),
  )

  const res = await kisGet(
    KIS_PATH,
    {
      FID_COND_MRKT_DIV_CODE: 'J',
      FID_INPUT_ISCD: code,
      FID_INPUT_DATE_1: toKisDate(windowStart),
      FID_INPUT_DATE_2: toKisDate(windowEnd),
    },
    TR_ID,
  )

  if (!res || !res.ok) {
    return { data: null, debug: { httpStatus: res?.status } }
  }

  const json = await res.json()
  const rows: Record<string, string>[] = json.output ?? []
  const firstRow = rows[0]
  const responseKeys = firstRow
    ? Object.keys(firstRow).join(', ')
    : Object.keys(json).join(', ')

  if (json.rt_cd !== '0') {
    return {
      data: null,
      debug: { rtCd: json.rt_cd, msg1: json.msg1, responseKeys, firstRow },
    }
  }

  // 성공 시 첫 청크 파싱
  const result = await fetchKisShortSelling(code, range)
  return {
    data: result,
    debug: { rtCd: json.rt_cd, responseKeys, firstRow },
  }
}

/**
 * KIS 국내주식 공매도 일별추이 조회.
 *
 * @param code   6자리 종목코드 (예: '005930')
 * @param range  '1y' | '3y' | '5y'
 * @returns ShortSellingPoint[] (오름차순) | null (실패)
 */
export async function fetchKisShortSelling(
  code: string,
  range: string,
): Promise<ShortSellingPoint[] | null> {
  const startDate = rangeToStartDate(range)

  const accumulated: ShortSellingPoint[] = []
  let windowEnd = new Date()

  while (windowEnd > startDate) {
    const windowStart = new Date(
      Math.max(startDate.getTime(), windowEnd.getTime() - CHUNK_DAYS * 24 * 60 * 60 * 1000),
    )

    const res = await kisGet(
      KIS_PATH,
      {
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: code,
        FID_INPUT_DATE_1: toKisDate(windowStart),
        FID_INPUT_DATE_2: toKisDate(windowEnd),
      },
      TR_ID,
    )

    if (!res || !res.ok) {
      console.error('[kis] short-selling fetch failed, status:', res?.status)
      break
    }

    const json = await res.json()

    if (json.rt_cd !== '0') {
      const sampleKeys = Array.isArray(json.output) && json.output.length > 0
        ? Object.keys(json.output[0]).join(', ')
        : Object.keys(json).join(', ')
      console.error('[kis] short-selling API error — rt_cd:', json.rt_cd, 'msg1:', json.msg1, '| response keys:', sampleKeys)
      break
    }

    const rows: Record<string, string>[] = json.output ?? []
    if (rows.length === 0) break

    for (const row of rows) {
      const dateRaw = row.stck_bsop_date
      if (!dateRaw || dateRaw.length !== 8) continue

      const shortVolume = parseInt(row.ssts_cntg_qty ?? '0', 10)
      const shortValue = parseInt(row.ssts_cntg_pbmn ?? '0', 10)
      const totalVolume = parseInt(row.stnd_vol ?? '0', 10)
      const totalValue = parseInt(row.stnd_pbmn ?? '0', 10)
      const ratioStr = row.ssts_vol_rlim
      const shortRatio = ratioStr
        ? parseFloat(ratioStr)
        : totalVolume > 0 ? (shortVolume / totalVolume) * 100 : 0

      if (isNaN(shortVolume) || isNaN(shortValue) || isNaN(totalVolume)) continue

      accumulated.push({
        date: parseKisDate(dateRaw),
        shortVolume: isNaN(shortVolume) ? 0 : shortVolume,
        shortValue: isNaN(shortValue) ? 0 : shortValue,
        totalVolume: isNaN(totalVolume) ? 0 : totalVolume,
        totalValue: isNaN(totalValue) ? 0 : totalValue,
        shortRatio: isNaN(shortRatio) ? 0 : shortRatio,
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
