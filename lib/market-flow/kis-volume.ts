import { kisGet, detectKrAssetType } from './kis-shared'
import type { FlowEntry } from './types'

interface VolumeRankRow {
  hts_kor_isnm?: string
  mksc_shrn_iscd?: string
  prdy_ctrt?: string
}

/**
 * KIS 거래량순위 (FHPST01710000) → 거래대금 상위.
 * blng_cls_code: '3' 거래금액순
 */
export async function fetchKrHotStocks(): Promise<FlowEntry[]> {
  try {
    const res = await kisGet(
      '/uapi/domestic-stock/v1/quotations/volume-rank',
      'FHPST01710000',
      {
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_COND_SCR_DIV_CODE: '20171',
        FID_INPUT_ISCD: '0000',
        FID_DIV_CLS_CODE: '0',
        FID_BLNG_CLS_CODE: '3',          // 거래금액순
        FID_TRGT_CLS_CODE: '111111111',  // 모든 증거금률 포함
        FID_TRGT_EXLS_CLS_CODE: '0000000000', // 제외 없음
        FID_INPUT_PRICE_1: '',
        FID_INPUT_PRICE_2: '',
        FID_VOL_CNT: '',
        FID_INPUT_DATE_1: '',
      },
    )
    if (!res.ok) return []

    const data = await res.json()
    const rows: VolumeRankRow[] = data?.output ?? data?.Output ?? []

    const entries: FlowEntry[] = []
    for (const row of rows) {
      const code = row.mksc_shrn_iscd
      const name = row.hts_kor_isnm
      if (!code || !name) continue

      const changePercent = row.prdy_ctrt ? parseFloat(row.prdy_ctrt) : 0
      const assetType = detectKrAssetType(name)

      entries.push({
        code,
        ticker: assetType === 'stock_kr' ? `${code}.KS` : code,
        name: name.trim(),
        netAmount: 0,
        changePercent,
        assetType,
      })

      if (entries.length >= 10) break
    }

    return entries
  } catch (err) {
    console.warn('[kis-volume] failed:', err instanceof Error ? err.message : String(err))
    return []
  }
}
