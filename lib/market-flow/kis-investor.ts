import { kisGet, detectKrAssetType } from './kis-shared'
import type { FlowEntry } from './types'

interface ForeignInstRow {
  hts_kor_isnm?: string
  mksc_shrn_iscd?: string
  frgn_ntby_tr_pbmn?: string  // 외국인 순매수 거래 대금 (백만원)
  orgn_ntby_tr_pbmn?: string  // 기관계 순매수 거래 대금 (백만원)
}

/**
 * KIS 국내기관_외국인 매매종목가집계 (FHPTJ04400000) → 외국인/기관 순매수 상위.
 * etcClsCode: '1' 외국인, '2' 기관계
 * divClsCode: '1' 금액정렬, '0' 수량정렬
 * rankSortClsCode: '0' 순매수상위
 */
async function fetchForeignInstRank(etcClsCode: '1' | '2'): Promise<ForeignInstRow[]> {
  try {
    const res = await kisGet(
      '/uapi/domestic-stock/v1/quotations/foreign-institution-total',
      'FHPTJ04400000',
      {
        FID_COND_MRKT_DIV_CODE: 'V',
        FID_COND_SCR_DIV_CODE: '16449',
        FID_INPUT_ISCD: '0000',     // 전체
        FID_DIV_CLS_CODE: '1',       // 금액 정렬
        FID_RANK_SORT_CLS_CODE: '0', // 순매수 상위
        FID_ETC_CLS_CODE: etcClsCode,
      },
    )
    if (!res.ok) return []
    const data = await res.json()
    const rows: ForeignInstRow[] = data?.output ?? []
    return rows
  } catch (err) {
    console.warn(`[kis-investor] etc=${etcClsCode} failed:`, err instanceof Error ? err.message : String(err))
    return []
  }
}

function rowToEntry(row: ForeignInstRow, amountField: 'frgn_ntby_tr_pbmn' | 'orgn_ntby_tr_pbmn'): FlowEntry | null {
  const code = row.mksc_shrn_iscd
  const name = row.hts_kor_isnm
  if (!code || !name) return null

  const rawAmount = row[amountField]
  const netAmount = rawAmount ? parseInt(rawAmount, 10) : 0
  const assetType = detectKrAssetType(name)

  return {
    code,
    ticker: assetType === 'stock_kr' ? `${code}.KS` : code,
    name: name.trim(),
    netAmount,
    assetType,
  }
}

export async function fetchKrInvestorFlow(): Promise<{
  foreign: FlowEntry[]
  institutional: FlowEntry[]
}> {
  const [foreignRows, instRows] = await Promise.all([
    fetchForeignInstRank('1'),
    fetchForeignInstRank('2'),
  ])

  const foreign: FlowEntry[] = []
  for (const row of foreignRows) {
    const entry = rowToEntry(row, 'frgn_ntby_tr_pbmn')
    if (entry) foreign.push(entry)
    if (foreign.length >= 5) break
  }

  const institutional: FlowEntry[] = []
  for (const row of instRows) {
    const entry = rowToEntry(row, 'orgn_ntby_tr_pbmn')
    if (entry) institutional.push(entry)
    if (institutional.length >= 5) break
  }

  return { foreign, institutional }
}
