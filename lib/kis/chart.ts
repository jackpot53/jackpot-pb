import type { OhlcPoint } from '@/lib/price/sparkline'
import { kisGet } from './client'

function toPeriodCode(interval: string): 'D' | 'W' | 'M' {
  if (interval === '1wk') return 'W'
  if (interval === '1mo') return 'M'
  return 'D'
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
  // 'YYYYMMDD' → 'YYYY-MM-DD'
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

// KIS는 호출당 최대 ~100건 반환. 기간별 캘린더 윈도우 크기.
// D: 140일(≈100 영업일), W: 700일(≈100주), M: 3650일(≈120개월)
const CHUNK_DAYS: Record<'D' | 'W' | 'M', number> = { D: 140, W: 700, M: 3650 }

/**
 * KIS 국내주식 일/주/월봉 OHLC 데이터 조회.
 *
 * @param code   6자리 종목코드 (예: '005930')
 * @param interval  Yahoo 형식 interval ('1d' | '1wk' | '1mo')
 * @param range     Yahoo 형식 range ('1y' | '3y' | '5y')
 * @returns OhlcPoint[] (오름차순) | null (실패)
 */
export async function fetchKisOhlc(
  code: string,
  interval: string,
  range: string,
): Promise<OhlcPoint[] | null> {
  const periodCode = toPeriodCode(interval)
  const startDate = rangeToStartDate(range)
  const chunkDays = CHUNK_DAYS[periodCode]

  const accumulated: OhlcPoint[] = []
  let windowEnd = new Date()

  while (windowEnd > startDate) {
    const windowStart = new Date(
      Math.max(startDate.getTime(), windowEnd.getTime() - chunkDays * 24 * 60 * 60 * 1000),
    )

    const res = await kisGet(
      '/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice',
      {
        FID_COND_MRKT_DIV_CODE: 'J',  // J = 코스피·코스닥 공통
        FID_INPUT_ISCD: code,
        FID_INPUT_DATE_1: toKisDate(windowStart),
        FID_INPUT_DATE_2: toKisDate(windowEnd),
        FID_PERIOD_DIV_CODE: periodCode,
        FID_ORG_ADJ_PRC: '0',  // 0 = 수정주가
      },
      'FHKST03010100',
    )

    if (!res || !res.ok) {
      console.error('[kis] chart fetch failed, status:', res?.status)
      break
    }

    const json = await res.json()
    if (json.rt_cd !== '0') {
      console.error('[kis] chart API error:', json.msg1)
      break
    }

    const rows: Record<string, string>[] = json.output2 ?? []
    if (rows.length === 0) break

    for (const row of rows) {
      const dateRaw = row.stck_bsop_date
      if (!dateRaw || dateRaw.length !== 8) continue
      const o = parseFloat(row.stck_oprc)
      const h = parseFloat(row.stck_hgpr)
      const l = parseFloat(row.stck_lwpr)
      const c = parseFloat(row.stck_clpr)
      const v = parseFloat(row.acml_vol)
      const tv = parseFloat(row.acml_tr_pbmn)
      if ([o, h, l, c].some((n) => isNaN(n) || n <= 0)) continue
      accumulated.push({
        date: parseKisDate(dateRaw),
        open: o,
        high: h,
        low: l,
        close: c,
        volume: !isNaN(v) && v > 0 ? v : null,
        tradingValue: !isNaN(tv) && tv > 0 ? tv : null,
      })
    }

    // 다음 윈도우: 이번 배치의 가장 오래된 날짜 바로 전으로 이동
    const oldestDateRaw = rows[rows.length - 1]?.stck_bsop_date
    if (!oldestDateRaw) break
    const oldest = new Date(parseKisDate(oldestDateRaw))
    oldest.setDate(oldest.getDate() - 1)
    if (oldest >= windowEnd) break  // 진전 없음 — 무한루프 방지
    windowEnd = oldest
  }

  if (accumulated.length < 2) return null

  // 중복 제거 + 날짜 오름차순 정렬
  const seen = new Set<string>()
  const unique = accumulated.filter((p) => {
    if (seen.has(p.date)) return false
    seen.add(p.date)
    return true
  })
  unique.sort((a, b) => a.date.localeCompare(b.date))
  return unique
}
