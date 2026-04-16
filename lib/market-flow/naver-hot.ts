import type { FlowEntry, KrAssetType } from './types'

const NAVER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Referer': 'https://finance.naver.com/sise/',
}

const ETF_PREFIXES = [
  'KODEX', 'TIGER', 'KINDEX', 'KBSTAR', 'ARIRANG', 'KOSEF',
  'HANARO', 'SOL ', 'ACE ', 'TIMEFOLIO', '파워', 'TREX',
  'FOCUS', 'KTOP', 'PLUS', 'TRUE', 'VITA', 'KB스타',
]

function detectKrAssetType(name: string): KrAssetType {
  return ETF_PREFIXES.some((p) => name.startsWith(p)) ? 'etf_kr' : 'stock_kr'
}

function parseChangePercent(raw: string): number {
  // "+7.50%" → 7.5, "-4.02%" → -4.02
  return parseFloat(raw.replace(/%/, '')) || 0
}

// 거래량 상위 종목 (개인 관심 종목 대리지표)
// sise_quant.naver: 거래대금 상위 종목 리스트
// 상승종목 → 개인 매수 관심, 하락종목 → 개인 매도/패닉 셀
export async function fetchKrHotStocks(): Promise<FlowEntry[]> {
  try {
    const res = await fetch(
      'https://finance.naver.com/sise/sise_quant.naver?sosok=0',
      {
        headers: NAVER_HEADERS,
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      },
    )
    if (!res.ok) return []

    const buffer = await res.arrayBuffer()
    const decoder = new TextDecoder('euc-kr')
    const html = decoder.decode(buffer)

    // type_2 테이블 추출
    const tableMatch = /<table[^>]*class="type_2"[\s\S]*?<\/table>/.exec(html)
    if (!tableMatch) return []

    const tableHtml = tableMatch[0]

    // 각 행: 종목코드, 이름, 등락율 추출
    // HTML 구조: <a href="...code=XXXXXX...">이름</a> ... <td>등락율</td>
    const rowRe =
      /code=(\d{6})[^>]*>([^<]+)<\/a>([\s\S]*?)<\/tr>/g
    const entries: FlowEntry[] = []
    let m: RegExpExecArray | null

    while ((m = rowRe.exec(tableHtml)) !== null) {
      const code = m[1]
      const name = m[2].trim()
      const rowContent = m[3]

      // 등락율 열: +7.50% 또는 -4.02% 형태
      const pctMatch = /([+-]\d+\.\d+%)/.exec(rowContent)
      const changePercent = pctMatch ? parseChangePercent(pctMatch[1]) : 0

      const assetType = detectKrAssetType(name)
      entries.push({
        code,
        ticker: assetType === 'stock_kr' ? `${code}.KS` : code,
        name,
        netAmount: 0,
        changePercent,
        assetType,
      })

      if (entries.length >= 10) break
    }

    return entries
  } catch {
    return []
  }
}
