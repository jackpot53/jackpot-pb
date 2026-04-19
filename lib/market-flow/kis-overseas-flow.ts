import { kisGet } from './kis-shared'
import type { FlowEntry } from './types'

interface OverseasVolRow {
  symb?: string
  name?: string
  ename?: string
  rate?: string
}

/**
 * KIS 해외주식 거래량순위 (HHDFS76310010) → NAS 거래량 상위.
 * 미국 정규장의 트렌딩 종목을 대표한다.
 */
export async function fetchUsTrending(): Promise<FlowEntry[]> {
  try {
    const res = await kisGet(
      '/uapi/overseas-stock/v1/ranking/trade-vol',
      'HHDFS76310010',
      {
        AUTH: '',
        EXCD: 'NAS',
        KEYB: '',
        NDAY: '0',          // 당일
        PRC1: '',
        PRC2: '',
        VOL_RANG: '0',      // 전체
      },
    )
    if (!res.ok) return []

    const data = await res.json()
    const rows: OverseasVolRow[] = data?.output2 ?? []

    const entries: FlowEntry[] = []
    for (const row of rows) {
      const symb = row.symb?.trim()
      if (!symb) continue
      const displayName = (row.ename || row.name || symb).trim()
      const changePercent = row.rate ? parseFloat(row.rate) : undefined

      entries.push({
        code: symb,
        ticker: symb,
        name: displayName,
        netAmount: 0,
        changePercent,
        assetType: 'stock_us',
      })

      if (entries.length >= 8) break
    }

    return entries
  } catch (err) {
    console.warn('[kis-overseas-flow] failed:', err instanceof Error ? err.message : String(err))
    return []
  }
}
