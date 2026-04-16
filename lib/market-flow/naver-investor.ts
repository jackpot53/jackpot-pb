import type { FlowEntry, KrAssetType } from './types'

const NAVER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Referer': 'https://finance.naver.com/sise/',
}

// ETF 이름 접두사로 assetType 추론
const ETF_PREFIXES = [
  'KODEX', 'TIGER', 'KINDEX', 'KBSTAR', 'ARIRANG', 'KOSEF',
  'HANARO', 'SOL ', 'ACE ', 'TIMEFOLIO', '파워', 'TREX',
  'FOCUS', 'KTOP', 'PLUS', 'TRUE', 'VITA', 'KB스타',
]

function detectKrAssetType(name: string): KrAssetType {
  return ETF_PREFIXES.some((p) => name.startsWith(p)) ? 'etf_kr' : 'stock_kr'
}

function parseAmount(raw: string): number {
  return parseInt(raw.replace(/,/g, ''), 10) || 0
}

// investor_gubun=1000 → 외국인 순매수 상위 (summary="외국인 순매수 상위 리스트")
// investor_gubun=9000 → 기관 순매수 상위7 (summary="기관 순매수 상위7 리스트")
async function fetchNaverDealRank(
  investorGubun: '1000' | '9000',
  tableSummary: string,
): Promise<FlowEntry[]> {
  const url = `https://finance.naver.com/sise/sise_deal_rank.naver?investor_gubun=${investorGubun}`
  try {
    const res = await fetch(url, {
      headers: NAVER_HEADERS,
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    if (!res.ok) return []

    // Naver Finance는 EUC-KR로 인코딩
    const buffer = await res.arrayBuffer()
    const decoder = new TextDecoder('euc-kr')
    const html = decoder.decode(buffer)

    // 해당 table 추출
    const tableRe = new RegExp(
      `summary="${tableSummary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[\\s\\S]*?</table>`,
    )
    const tableMatch = tableRe.exec(html)
    if (!tableMatch) return []

    const tableHtml = tableMatch[0]

    // 종목코드 + 이름 + 금액 추출
    const rowRe = /code=(\d{6})[^>]*>([^<]+)<\/a>[\s\S]*?class="number">([^<]+)<\/td>/g
    const entries: FlowEntry[] = []
    let m: RegExpExecArray | null
    while ((m = rowRe.exec(tableHtml)) !== null) {
      const code = m[1]
      const name = m[2].trim()
      const amount = parseAmount(m[3])
      const assetType = detectKrAssetType(name)
      entries.push({
        code,
        // stock_kr은 logo.dev 조회를 위해 .KS suffix 필요 (대부분 기관/외국인 순매수 대형주는 KOSPI)
        // ETF는 buildLogoUrl에서 name으로 운용사 판별하므로 suffix 무관
        ticker: assetType === 'stock_kr' ? `${code}.KS` : code,
        name,
        netAmount: amount,
        assetType,
      })
    }

    return entries.slice(0, 5)
  } catch {
    return []
  }
}

export async function fetchKrInvestorFlow(): Promise<{
  foreign: FlowEntry[]
  institutional: FlowEntry[]
}> {
  const [foreign, institutional] = await Promise.all([
    fetchNaverDealRank('1000', '외국인 순매수 상위 리스트'),
    fetchNaverDealRank('9000', '기관 순매수 상위7 리스트'),
  ])
  return { foreign, institutional }
}
